"""Walk-forward parameter tuning.

Random search on the first 70% of history (in-sample). The best candidate replaces the live
parameters only if it also beats the current parameters on the last 30% (out-of-sample) and
stays inside the drawdown limit there. Out-of-sample gating reduces overfitting; it does not
eliminate it, so review the tune log before trusting any change.
"""
from __future__ import annotations

import logging
import random
from dataclasses import dataclass

import pandas as pd

from backtest import BacktestResult, simulate
from config import StrategyParams

log = logging.getLogger("bagbot2.tuner")

TRAIN_FRACTION = 0.7
N_TRIALS = 150
MIN_TRAIN_TRADES = 8
MIN_VALID_TRADES = 3
MIN_OOS_IMPROVEMENT = 0.05


@dataclass
class TuneResult:
    accepted: bool
    params: StrategyParams
    reason: str
    train_score: float = 0.0
    valid_current: float = 0.0
    valid_candidate: float = 0.0


def sample_params(rng: random.Random) -> StrategyParams:
    macd_fast = rng.randint(8, 16)
    macd_slow = rng.randint(max(macd_fast + 5, 20), 34)
    stop = round(rng.uniform(0.01, 0.05), 3)
    take = round(rng.uniform(max(0.02, stop * 1.5), 0.10), 3)
    return StrategyParams(
        rsi_period=14,
        rsi_oversold=float(rng.randint(20, 40)),
        rsi_overbought=float(rng.randint(60, 85)),
        sma_window=rng.randint(10, 100),
        ema_span=rng.randint(5, 30),
        macd_fast=macd_fast,
        macd_slow=macd_slow,
        macd_signal=rng.randint(5, 12),
        stop_loss=stop,
        take_profit=take,
    )


def _score(res: BacktestResult, min_trades: int, dd_limit: float) -> float:
    if res.trades < min_trades:
        return -1e6
    return res.sharpe - max(0.0, res.max_drawdown - dd_limit) * 100


def walk_forward_tune(
    df: pd.DataFrame,
    current: StrategyParams,
    *,
    commission: float,
    slippage_bps: float,
    bars_per_year: int,
    max_dd_limit: float,
    n_trials: int = N_TRIALS,
    seed: int | None = None,
) -> TuneResult:
    if len(df) < 200:
        return TuneResult(False, current, "not enough history to tune")

    split = int(len(df) * TRAIN_FRACTION)
    train, valid = df.iloc[:split], df.iloc[split:]
    kw = dict(commission=commission, slippage_bps=slippage_bps, bars_per_year=bars_per_year)

    rng = random.Random(seed)
    candidates = [current] + [sample_params(rng) for _ in range(n_trials)]
    scored = [(_score(simulate(train, p, **kw), MIN_TRAIN_TRADES, max_dd_limit), p) for p in candidates]
    train_score, best = max(scored, key=lambda pair: pair[0])  # ties keep the current params

    if best is current:
        return TuneResult(False, current, "current parameters are best in-sample", train_score)

    s_cur = _score(simulate(valid, current, **kw), MIN_VALID_TRADES, max_dd_limit)
    v_new = simulate(valid, best, **kw)
    s_new = _score(v_new, MIN_VALID_TRADES, max_dd_limit)

    base = dict(train_score=train_score, valid_current=s_cur, valid_candidate=s_new)
    if v_new.max_drawdown > max_dd_limit:
        return TuneResult(False, current, "candidate breaches drawdown limit out-of-sample", **base)
    if s_new <= 0:
        return TuneResult(False, current, "candidate not profitable out-of-sample", **base)
    if s_new - s_cur < MIN_OOS_IMPROVEMENT:
        return TuneResult(False, current, "no meaningful out-of-sample improvement", **base)
    return TuneResult(True, best, "candidate beat current parameters out-of-sample", **base)
