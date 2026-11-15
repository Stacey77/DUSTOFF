"""Paper-only helper agents: a trade reviewer and a research backtester.

Neither agent places orders, changes engine parameters, or writes to paper state.
They read data and return findings. Any change to strategy settings still goes
through the walk-forward tuner and needs a person to act on it.
"""
from __future__ import annotations

import dataclasses

import pandas as pd

from backtest import simulate
from config import StrategyParams

MIN_TRADES_TO_JUDGE = 8      # below this, a result is noise, not evidence
HOLDOUT_FRACTION = 0.30      # last 30% of bars: out-of-sample check, as in the tuner


def review_summary(status: dict) -> dict:
    """Summarize engine.status() into facts. Never advice, never an instruction to trade."""
    trades = status.get("recent_trades", [])
    sells = [t for t in trades if t.get("side") == "SELL"]
    pnls = [t["pnl"] for t in sells if "pnl" in t]
    wins = [p for p in pnls if p > 0]
    errors = status.get("errors", [])
    events = status.get("events", [])
    alerts = [e for e in events if e.get("kind") in ("alert", "error")]

    findings: list[str] = []
    if not trades:
        findings.append("No paper trades yet. The strategy has not met its entry rules on the current data.")
    else:
        findings.append(f"{len(trades)} recent paper trades, {len(sells)} closed.")
    if pnls:
        findings.append(f"Closed-trade win rate {len(wins) / len(pnls):.0%}; net paper P&L {sum(pnls):,.2f}.")
    if status.get("open_positions"):
        findings.append(f"{len(status['open_positions'])} open paper position(s).")
    dd = status.get("drawdown", 0.0)
    if dd and dd > 0:
        findings.append(f"Current drawdown {dd:.2%} from peak.")
    if errors:
        findings.append(f"{len(errors)} recent engine error(s); most recent: {errors[0].get('text', '')[:160]}")
    if status.get("paused"):
        findings.append("Paper engine is paused.")

    return {
        "findings": findings,
        "closed_trades": len(sells),
        "win_rate": round(len(wins) / len(pnls), 4) if pnls else None,
        "net_pnl": round(sum(pnls), 2) if pnls else 0.0,
        "open_positions": len(status.get("open_positions", [])),
        "errors": len(errors),
        "alerts": [e.get("text", "") for e in alerts[:10]],
        "note": "Review of paper results only. Not live performance and not advice.",
    }


def _metrics(res) -> dict:
    return {
        "total_return": round(res.total_return, 4),
        "max_drawdown": round(res.max_drawdown, 4),
        "sharpe": round(res.sharpe, 3),
        "win_rate": round(res.win_rate, 4),
        "profit_factor": round(res.profit_factor, 3),
        "trades": res.trades,
    }


def research_variants(
    bars: pd.DataFrame,
    base: StrategyParams,
    variants: list[dict],
    *,
    start_cash: float = 100_000.0,
    commission: float = 0.0005,
    slippage_bps: float = 5.0,
    bars_per_year: int = 1638,
) -> dict:
    """Backtest named parameter variants on full history and on the last 30% (holdout).

    Nothing is applied to the engine. Each result shows whether the variant had enough
    trades to judge and whether it still made money on the holdout bars.
    """
    if len(variants) > 20:
        raise ValueError("at most 20 variants per run")
    split = int(len(bars) * (1 - HOLDOUT_FRACTION))
    holdout = bars.iloc[split:]
    fields = {f.name for f in dataclasses.fields(StrategyParams)}

    def run(params: StrategyParams, data: pd.DataFrame) -> dict:
        return _metrics(simulate(data, params, start_cash=start_cash, commission=commission,
                                 slippage_bps=slippage_bps, bars_per_year=bars_per_year))

    rows = []
    baseline = {"name": "current", "full": run(base, bars), "holdout": run(base, holdout), "overrides": {}}
    rows.append(baseline)
    for i, v in enumerate(variants):
        name = str(v.get("name", f"variant {i + 1}"))[:40]
        overrides = {k: v[k] for k in v if k != "name"}
        bad = [k for k in overrides if k not in fields]
        if bad:
            raise ValueError(f"unknown parameter(s): {', '.join(bad)}")
        params = dataclasses.replace(base, **overrides)
        full, hold = run(params, bars), run(params, holdout)
        rows.append({"name": name, "overrides": overrides, "full": full, "holdout": hold})

    for r in rows:
        h = r["holdout"]
        if h["trades"] < MIN_TRADES_TO_JUDGE:
            r["verdict"] = f"too few holdout trades ({h['trades']}) to judge"
        elif h["total_return"] > 0 and r["full"]["total_return"] > 0:
            r["verdict"] = "positive on full history and holdout (still not evidence of future results)"
        else:
            r["verdict"] = "not positive on holdout or full history; do not adopt"
    return {"bars": len(bars), "holdout_bars": len(holdout), "rows": rows,
            "note": "Historical backtest only. Not live performance, not advice, and nothing was applied."}
