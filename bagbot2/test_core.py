import numpy as np
import pandas as pd
import pytest

from config import StrategyParams, load_settings
from indicators import rsi
from backtest import simulate


def _bars(n: int = 600, seed: int = 1) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    close = 100 + np.cumsum(rng.normal(0, 1, n))
    idx = pd.date_range("2024-01-01", periods=n, freq="h")
    return pd.DataFrame({"open": close, "high": close + 0.5, "low": close - 0.5, "close": close}, index=idx)


def test_rsi_is_bounded():
    r = rsi(_bars()["close"]).dropna()
    assert ((r >= 0) & (r <= 100)).all()


def test_simulate_is_internally_consistent():
    res = simulate(_bars(), StrategyParams())
    assert res.trades == len(res.trade_log)
    assert 0 <= res.max_drawdown <= 1
    assert res.trades == 0 or all(t["exit_time"] >= t["entry_time"] for t in res.trade_log)


def test_live_mode_is_refused(monkeypatch):
    monkeypatch.setenv("BAGBOT_MODE", "live")
    with pytest.raises(RuntimeError):
        load_settings()


def test_strategy_produces_entries_on_noisy_data():
    # Regression: the earlier trend gate made entries almost impossible (0 trades).
    from backtest import simulate as sim
    res = sim(_bars(4000, seed=7), StrategyParams())
    assert res.trades > 0


def test_tuner_rejects_candidates_without_out_of_sample_edge():
    # Regression: a candidate that lost money out-of-sample was accepted over a no-trade baseline.
    from tuner import walk_forward_tune
    res = walk_forward_tune(_bars(4000, seed=7), StrategyParams(), commission=0.0005,
                            slippage_bps=5, bars_per_year=1638, max_dd_limit=0.10,
                            n_trials=40, seed=3)
    if res.accepted:
        assert res.valid_candidate > 0


def test_risk_stats_from_equity_curve(monkeypatch, tmp_path):
    monkeypatch.setenv("BAGBOT_STATE_FILE", str(tmp_path / "s.json"))
    from config import load_settings
    from engine import PaperEngine
    eng = PaperEngine(load_settings())
    eng.equity_history = [{"t": "x", "equity": v} for v in [100, 110, 99, 105, 120]]
    sharpe, max_dd = eng._risk_stats()
    assert max_dd == pytest.approx((110 - 99) / 110, rel=1e-3)
    assert sharpe > 0


def test_events_feed_records_trades(monkeypatch, tmp_path):
    monkeypatch.setenv("BAGBOT_STATE_FILE", str(tmp_path / "s.json"))
    from config import load_settings
    from engine import PaperEngine
    eng = PaperEngine(load_settings())
    eng._record_trade({"t": "t", "symbol": "SPY", "side": "BUY", "price": 100.0, "qty": 2.0, "reason": "entry"})
    assert eng.events[-1]["kind"] == "trade"
    assert "BUY SPY" in eng.events[-1]["text"]
