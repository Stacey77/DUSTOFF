"""Bar-by-bar backtest. Signals form on bar i's close and fill at bar i+1's open (no lookahead)."""
from __future__ import annotations

from dataclasses import dataclass, field
from math import sqrt

import numpy as np
import pandas as pd

from config import StrategyParams
from strategy import add_indicators, signals


@dataclass
class BacktestResult:
    total_return: float = 0.0
    max_drawdown: float = 0.0
    sharpe: float = 0.0
    win_rate: float = 0.0
    profit_factor: float = 0.0
    trades: int = 0
    trade_log: list[dict] = field(default_factory=list)


def simulate(
    df: pd.DataFrame,
    p: StrategyParams,
    *,
    start_cash: float = 100_000.0,
    commission: float = 0.0005,
    slippage_bps: float = 5.0,
    position_fraction: float = 0.95,
    bars_per_year: int = 1638,
) -> BacktestResult:
    ind = add_indicators(df, p).dropna(subset=["rsi", "sma", "ema", "macd_hist"])
    if len(ind) < 2:
        return BacktestResult()

    entry_sig, exit_sig = signals(ind, p)
    entry_arr = entry_sig.to_numpy()
    exit_arr = exit_sig.to_numpy()
    o = ind["open"].to_numpy()
    h = ind["high"].to_numpy()
    l = ind["low"].to_numpy()
    c = ind["close"].to_numpy()
    times = [str(t) for t in ind.index]
    slip = slippage_bps / 10_000

    cash = start_cash
    qty = 0.0
    entry_px = 0.0
    entry_t = ""
    cost = 0.0
    pending: str | None = None
    equity: list[float] = []
    trade_log: list[dict] = []

    def close_position(px: float, t: str, reason: str) -> None:
        nonlocal cash, qty
        proceeds = qty * px * (1 - commission)
        cash += proceeds
        trade_log.append({
            "entry_time": entry_t,
            "exit_time": t,
            "entry_price": round(entry_px, 4),
            "exit_price": round(px, 4),
            "pnl": round(proceeds - cost, 2),
            "reason": reason,
        })
        qty = 0.0

    for i in range(len(ind)):
        # 1) Fill any order decided on the previous bar, at this bar's open.
        if pending == "buy" and qty == 0:
            px = o[i] * (1 + slip)
            budget = cash * position_fraction
            qty = budget / (px * (1 + commission))
            cost = qty * px * (1 + commission)
            cash -= cost
            entry_px, entry_t = px, times[i]
        elif pending == "sell" and qty > 0:
            close_position(o[i] * (1 - slip), times[i], "signal")
        pending = None

        # 2) Intrabar stop-loss / take-profit.
        if qty > 0:
            stop_px = entry_px * (1 - p.stop_loss)
            take_px = entry_px * (1 + p.take_profit)
            if l[i] <= stop_px:
                close_position(min(o[i], stop_px) * (1 - slip), times[i], "stop")
            elif h[i] >= take_px:
                close_position(max(o[i], take_px) * (1 - slip), times[i], "take")

        # 3) Mark to market at the close.
        equity.append(cash + qty * c[i])

        # 4) Decide for the next bar.
        if qty == 0 and entry_arr[i]:
            pending = "buy"
        elif qty > 0 and exit_arr[i]:
            pending = "sell"

    if not equity:
        return BacktestResult()

    eq = np.asarray(equity)
    peak = np.maximum.accumulate(eq)
    max_dd = float(((peak - eq) / peak).max())
    rets = np.diff(eq) / eq[:-1]
    sd = float(rets.std()) if len(rets) else 0.0
    sharpe = float(rets.mean() / sd * sqrt(bars_per_year)) if sd > 0 else 0.0

    pnls = [t["pnl"] for t in trade_log]
    gains = sum(x for x in pnls if x > 0)
    losses = -sum(x for x in pnls if x < 0)
    wins = sum(1 for x in pnls if x > 0)
    if losses > 0:
        profit_factor = min(gains / losses, 99.0)
    else:
        profit_factor = 99.0 if gains > 0 else 0.0

    return BacktestResult(
        total_return=float(eq[-1] / start_cash - 1),
        max_drawdown=max_dd,
        sharpe=sharpe,
        win_rate=wins / len(pnls) if pnls else 0.0,
        profit_factor=profit_factor,
        trades=len(trade_log),
        trade_log=trade_log,
    )
