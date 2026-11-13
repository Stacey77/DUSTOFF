"""Paper-trading engine: stateful, persisted to JSON, thread-safe. No broker connection exists here.

Each cycle, per symbol:
  1. Retune if the parameters are older than BAGBOT_RETUNE_HOURS.
  2. Check stop/take on the latest bar (every cycle).
  3. Act on signals from the most recent CLOSED bar (once per bar, so re-running never double-trades).
Fills are simulated at the latest close with slippage and commission.
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from alerts import send_alert
from config import Settings, StrategyParams
from data import fetch_bars
from strategy import add_indicators, signals
from tuner import walk_forward_tune

log = logging.getLogger("bagbot2.engine")

POSITION_FRACTION = 0.95      # share of each symbol's allocation actually deployed
PERF_WINDOW = 10              # last N closed trades used for the performance check
PERF_MIN_WIN_RATE = 0.30      # below this, force a retune
PERF_TRIGGER_COOLDOWN_S = 3600


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class PaperEngine:
    def __init__(self, settings: Settings) -> None:
        self.s = settings
        self.lock = threading.RLock()
        self.stop_event = threading.Event()
        self.paused = False
        self.cash = settings.starting_cash
        self.peak = settings.starting_cash
        self.positions: dict[str, dict] = {}
        self.params: dict[str, StrategyParams] = {sym: StrategyParams() for sym in settings.symbols}
        self.last_price: dict[str, float] = {}
        self.last_bar: dict[str, str] = {}
        self.last_tune: dict[str, str] = {}
        self.tune_log: list[dict] = []
        self.trades: list[dict] = []
        self.equity_history: list[dict] = []
        self.errors: list[dict] = []
        self.events: list[dict] = []
        self.dd_alerted = False
        self.last_perf_trigger = 0.0
        self.last_cycle: str | None = None
        self._load()

    # ---------- persistence ----------

    def _load(self) -> None:
        path = Path(self.s.state_file)
        if not path.exists():
            return
        try:
            d = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError) as exc:
            log.error("could not read state file %s: %s", path, exc)
            return
        self.cash = d.get("cash", self.cash)
        self.peak = d.get("peak", self.peak)
        self.positions = d.get("positions", {})
        for sym, p in d.get("params", {}).items():
            if sym in self.params:
                self.params[sym] = StrategyParams(**p)
        self.last_bar = d.get("last_bar", {})
        self.last_tune = d.get("last_tune", {})
        self.tune_log = d.get("tune_log", [])
        self.trades = d.get("trades", [])
        self.equity_history = d.get("equity_history", [])
        log.info("restored paper state from %s (%d trades)", path, len(self.trades))

    def save(self) -> None:
        with self.lock:
            payload = {
                "cash": self.cash,
                "peak": self.peak,
                "positions": self.positions,
                "params": {sym: asdict(p) for sym, p in self.params.items()},
                "last_bar": self.last_bar,
                "last_tune": self.last_tune,
                "tune_log": self.tune_log[-100:],
                "trades": self.trades[-1000:],
                "equity_history": self.equity_history[-5000:],
            }
        path = Path(self.s.state_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, indent=1))
        os.replace(tmp, path)  # atomic: a crash never leaves a half-written state file

    # ---------- accounting ----------

    def equity(self) -> float:
        with self.lock:
            mv = sum(pos["qty"] * self.last_price.get(sym, pos["entry_px"])
                     for sym, pos in self.positions.items())
            return self.cash + mv

    def _drawdown(self, eq: float) -> float:
        peak = max(self.peak, eq)
        return (peak - eq) / peak if peak > 0 else 0.0

    def _allocation(self) -> float:
        per_symbol = self.equity() / max(1, len(self.s.symbols))
        return min(self.cash, per_symbol * POSITION_FRACTION)

    def _record_trade(self, trade: dict) -> None:
        self.trades.append(trade)
        pnl = f" pnl {trade['pnl']:+.2f}" if "pnl" in trade else ""
        self._event("trade", f"{trade['side']} {trade['symbol']} {trade['qty']} @ {trade['price']} ({trade['reason']}){pnl}")
        self.trades = self.trades[-1000:]
        log.info("paper %s %s qty=%s px=%s reason=%s pnl=%s", trade["side"], trade["symbol"],
                 trade["qty"], trade["price"], trade["reason"], trade.get("pnl", ""))

    def _open(self, sym: str, price: float, ts: str) -> None:
        budget = self._allocation()
        if budget <= 0:
            return
        comm = self.s.commission_rate
        px = price * (1 + self.s.slippage_bps / 10_000)
        qty = budget / (px * (1 + comm))
        cost = qty * px * (1 + comm)
        p = self.params[sym]
        self.cash -= cost
        self.positions[sym] = {
            "qty": qty, "entry_px": px, "entry_time": ts, "cost": cost,
            "stop": px * (1 - p.stop_loss), "take": px * (1 + p.take_profit),
        }
        self._record_trade({"t": ts, "symbol": sym, "side": "BUY", "price": round(px, 4),
                            "qty": round(qty, 4), "reason": "entry"})

    def _close(self, sym: str, price: float, ts: str, reason: str) -> None:
        pos = self.positions.pop(sym)
        px = price * (1 - self.s.slippage_bps / 10_000)
        proceeds = pos["qty"] * px * (1 - self.s.commission_rate)
        self.cash += proceeds
        pnl = proceeds - pos["cost"]
        self._record_trade({"t": ts, "symbol": sym, "side": "SELL", "price": round(px, 4),
                            "qty": round(pos["qty"], 4), "reason": reason, "pnl": round(pnl, 2)})

    def _mark(self) -> None:
        """Record equity, raise drawdown alerts, and force retunes on drawdown breach."""
        eq = self.equity()
        self.peak = max(self.peak, eq)
        dd = self._drawdown(eq)
        self.equity_history.append({"t": _now(), "equity": round(eq, 2)})
        self.equity_history = self.equity_history[-5000:]
        limit = self.s.max_drawdown_alert
        if dd >= limit:
            if not self.dd_alerted:
                self.dd_alerted = True
                self.last_tune = {}
                self._event("alert", f"drawdown {dd:.1%} breached limit {limit:.1%}; retune forced")
                send_alert("Drawdown breach", f"drawdown {dd:.1%} >= limit {limit:.1%}; retune forced",
                           self.s.alert_webhook_url)
        elif dd < limit / 2:
            self.dd_alerted = False

    def _performance_degraded(self) -> bool:
        sells = [t for t in self.trades if t["side"] == "SELL"][-PERF_WINDOW:]
        if len(sells) < PERF_WINDOW:
            return False
        wins = sum(1 for t in sells if t["pnl"] > 0)
        return wins / len(sells) < PERF_MIN_WIN_RATE

    # ---------- trading ----------

    def _process_symbol(self, sym: str) -> None:
        df = fetch_bars(sym, self.s.data_period, self.s.data_interval)
        p = self.params[sym]
        ind = add_indicators(df, p).dropna(subset=["rsi", "sma", "ema", "macd_hist"])
        if len(ind) < 2:
            return
        latest = ind.iloc[-1]
        latest_ts = str(ind.index[-1])
        closed_ts = str(ind.index[-2])
        entry_sig, exit_sig = signals(ind, p)

        with self.lock:
            self.last_price[sym] = float(latest["close"])
            if self.paused:
                return
            pos = self.positions.get(sym)
            if pos:
                if latest["low"] <= pos["stop"]:
                    self._close(sym, pos["stop"], latest_ts, "stop")
                    return
                if latest["high"] >= pos["take"]:
                    self._close(sym, pos["take"], latest_ts, "take")
                    return
            if self.last_bar.get(sym) == closed_ts:
                return
            self.last_bar[sym] = closed_ts
            if pos and bool(exit_sig.iloc[-2]):
                self._close(sym, float(latest["close"]), latest_ts, "signal")
            elif not pos and bool(entry_sig.iloc[-2]):
                self._open(sym, float(latest["close"]), latest_ts)

    def _retune_due(self, sym: str) -> bool:
        last = self.last_tune.get(sym)
        if not last:
            return True
        age = datetime.now(timezone.utc) - datetime.fromisoformat(last)
        return age.total_seconds() >= self.s.retune_hours * 3600

    def retune(self, sym: str) -> None:
        df = fetch_bars(sym, self.s.tune_period, self.s.data_interval)
        with self.lock:
            current = self.params[sym]
        res = walk_forward_tune(
            df, current,
            commission=self.s.commission_rate,
            slippage_bps=self.s.slippage_bps,
            bars_per_year=self.s.bars_per_year,
            max_dd_limit=self.s.max_drawdown_alert,
        )
        with self.lock:
            self.last_tune[sym] = _now()
            if res.accepted:
                self.params[sym] = res.params
            self.tune_log.append({
                "t": _now(), "symbol": sym, "accepted": res.accepted, "reason": res.reason,
                "valid_current": round(res.valid_current, 3),
                "valid_candidate": round(res.valid_candidate, 3),
                "params": asdict(res.params),
            })
            self.tune_log = self.tune_log[-100:]
        self._event("tune", f"{sym}: {'accepted' if res.accepted else 'kept current'} - {res.reason}")
        log.info("retune %s accepted=%s reason=%s", sym, res.accepted, res.reason)

    def record_error(self, sym: str, exc: Exception) -> None:
        log.error("%s: %s", sym, exc, exc_info=exc)
        with self.lock:
            self.errors.append({"t": _now(), "symbol": sym, "error": str(exc)})
            self.errors = self.errors[-200:]
            self._event("error", f"{sym}: {exc}")

    def step(self) -> None:
        for sym in self.s.symbols:
            try:
                if self._retune_due(sym):
                    self.retune(sym)
                self._process_symbol(sym)
            except Exception as exc:
                self.record_error(sym, exc)

        with self.lock:
            self.last_cycle = _now()
            self._mark()
            if self._performance_degraded() and time.time() - self.last_perf_trigger > PERF_TRIGGER_COOLDOWN_S:
                self.last_perf_trigger = time.time()
                self.last_tune = {}
                send_alert("Performance degraded",
                           f"last {PERF_WINDOW} closed trades won under {PERF_MIN_WIN_RATE:.0%}; retune forced",
                           self.s.alert_webhook_url)
            self.save()

    def run_forever(self) -> None:
        log.info("paper engine started for %s", ", ".join(self.s.symbols))
        while not self.stop_event.is_set():
            started = time.monotonic()
            self.step()
            wait = max(5.0, self.s.interval_seconds - (time.monotonic() - started))
            self.stop_event.wait(wait)

    def set_paused(self, value: bool) -> None:
        with self.lock:
            self.paused = value
        log.info("engine %s", "paused" if value else "resumed")

    # ---------- observability ----------

    def _event(self, kind: str, text: str) -> None:
        self.events.append({"t": _now(), "kind": kind, "text": text})
        self.events = self.events[-200:]

    def _risk_stats(self) -> tuple[float, float]:
        """Annualised Sharpe and max drawdown from the equity curve (0.0 until there is data)."""
        from math import sqrt
        import statistics
        eq = [h["equity"] for h in self.equity_history]
        if len(eq) < 3:
            return 0.0, 0.0
        rets = [(b - a) / a for a, b in zip(eq, eq[1:]) if a > 0]
        periods_per_year = 252 * 6.5 * 3600 / max(1, self.s.interval_seconds)
        sd = statistics.pstdev(rets) if len(rets) > 1 else 0.0
        sharpe = statistics.fmean(rets) / sd * sqrt(periods_per_year) if sd > 0 else 0.0
        peak, max_dd = eq[0], 0.0
        for v in eq:
            peak = max(peak, v)
            if peak > 0:
                max_dd = max(max_dd, (peak - v) / peak)
        return round(sharpe, 3), round(max_dd, 4)


    def status(self) -> dict:
        with self.lock:
            eq = self.equity()
            sells = [t for t in self.trades if t["side"] == "SELL"]
            wins = sum(1 for t in sells if t["pnl"] > 0)
            return {
                "mode": "paper",
                "paused": self.paused,
                "last_cycle": self.last_cycle,
                "equity": round(eq, 2),
                "cash": round(self.cash, 2),
                "peak": round(max(self.peak, eq), 2),
                "drawdown": round(self._drawdown(eq), 4),
                "return_pct": round((eq / self.s.starting_cash - 1) * 100, 2),
                "open_positions": dict(self.positions),
                "last_price": dict(self.last_price),
                "params": {sym: asdict(p) for sym, p in self.params.items()},
                "closed_trades": len(sells),
                "win_rate": round(wins / len(sells), 4) if sells else 0.0,
                "recent_trades": self.trades[-50:][::-1],
                "tune_log": self.tune_log[-10:][::-1],
                "errors": self.errors[-10:][::-1],
                "equity_history": self.equity_history[-300:],
                "sharpe": self._risk_stats()[0],
                "max_drawdown": self._risk_stats()[1],
                "events": self.events[-60:][::-1],
            }
