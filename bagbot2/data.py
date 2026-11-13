"""Market data. yfinance is free and unofficial: fine for paper trading, not for live execution."""
from __future__ import annotations

import pandas as pd

REQUIRED = ["open", "high", "low", "close"]


def fetch_bars(symbol: str, period: str, interval: str) -> pd.DataFrame:
    import yfinance as yf  # imported lazily so the rest of the code runs without it

    raw = yf.download(symbol, period=period, interval=interval, auto_adjust=True, progress=False)
    if raw is None or raw.empty:
        raise ValueError(f"no data returned for {symbol}")
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)
    df = raw.rename(columns=lambda c: str(c).lower())[REQUIRED].dropna()
    df.index = pd.DatetimeIndex(df.index)
    df = df[~df.index.duplicated(keep="last")].sort_index()
    return df
