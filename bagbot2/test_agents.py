import numpy as np
import pandas as pd
import pytest

from agents import MIN_TRADES_TO_JUDGE, research_variants, review_summary
from config import StrategyParams


def _bars(n: int = 4000, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    close = 100 + np.cumsum(rng.normal(0, 1, n))
    idx = pd.date_range("2024-01-01", periods=n, freq="h")
    return pd.DataFrame({"open": close, "high": close + 0.5, "low": close - 0.5, "close": close}, index=idx)


def test_review_empty_state_reports_no_trades():
    out = review_summary({"recent_trades": [], "errors": [], "events": [], "open_positions": [], "drawdown": 0.0})
    assert out["closed_trades"] == 0
    assert out["win_rate"] is None
    assert any("No paper trades" in f for f in out["findings"])


def test_review_computes_win_rate_and_net_pnl():
    trades = [{"side": "SELL", "pnl": 10.0}, {"side": "SELL", "pnl": -4.0}, {"side": "BUY"}]
    out = review_summary({"recent_trades": trades, "errors": [], "events": [], "open_positions": [], "drawdown": 0.0})
    assert out["closed_trades"] == 2
    assert out["win_rate"] == 0.5
    assert out["net_pnl"] == 6.0


def test_review_never_contains_trade_instructions():
    out = review_summary({"recent_trades": [], "errors": [{"text": "boom"}], "events": [], "open_positions": [], "drawdown": 0.0})
    text = " ".join(out["findings"]).lower()
    assert "buy " not in text and "sell " not in text


def test_research_reports_baseline_and_variants():
    out = research_variants(_bars(), StrategyParams(), [{"name": "RSI 25", "rsi_oversold": 25.0}])
    assert out["rows"][0]["name"] == "current"
    assert out["rows"][1]["name"] == "RSI 25"
    assert out["holdout_bars"] < out["bars"]
    for row in out["rows"]:
        assert "verdict" in row
        assert row["holdout"]["trades"] >= 0


def test_research_flags_low_trade_counts():
    out = research_variants(_bars(300), StrategyParams(), [])
    assert out["rows"][0]["holdout"]["trades"] < MIN_TRADES_TO_JUDGE
    assert "too few" in out["rows"][0]["verdict"]


def test_research_rejects_unknown_parameter():
    with pytest.raises(ValueError):
        research_variants(_bars(), StrategyParams(), [{"name": "x", "order_size": 5}])


def test_research_rejects_too_many_variants():
    with pytest.raises(ValueError):
        research_variants(_bars(), StrategyParams(), [{"rsi_oversold": 20.0 + i} for i in range(21)])


def test_research_does_not_change_base_params():
    base = StrategyParams()
    before = dict(vars(base))
    research_variants(_bars(), base, [{"name": "a", "rsi_oversold": 10.0}])
    assert vars(base) == before
