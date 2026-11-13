"""Strategy rules shared by the backtester, tuner and paper engine.

Long-only pullback strategy:
  entry: RSI oversold AND MACD histogram rising AND close within 5% of the SMA (crash filter)
  exit:  RSI overbought OR close below EMA
  risk:  fixed stop-loss and take-profit fractions, checked intrabar
"""
from __future__ import annotations

import pandas as pd

from config import StrategyParams
from indicators import ema, macd, rsi, sma


def add_indicators(df: pd.DataFrame, p: StrategyParams) -> pd.DataFrame:
    out = df.copy()
    out["rsi"] = rsi(out["close"], p.rsi_period)
    out["sma"] = sma(out["close"], p.sma_window)
    out["ema"] = ema(out["close"], p.ema_span)
    _, _, hist = macd(out["close"], p.macd_fast, p.macd_slow, p.macd_signal)
    out["macd_hist"] = hist
    return out


def signals(ind: pd.DataFrame, p: StrategyParams) -> tuple[pd.Series, pd.Series]:
    """Boolean entry and exit series. Each value is decided on that bar's close."""
    entry = (
        (ind["rsi"] <= p.rsi_oversold)
        & (ind["close"] > 0.95 * ind["sma"])
        & (ind["macd_hist"] > ind["macd_hist"].shift(1))
    )
    exit_ = (ind["rsi"] >= p.rsi_overbought) | (ind["close"] < ind["ema"])
    return entry.fillna(False), exit_.fillna(False)
