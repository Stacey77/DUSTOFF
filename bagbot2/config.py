"""BAGBOT2 configuration. Paper trading only: live mode is refused at startup."""
import os
from dataclasses import dataclass


@dataclass
class StrategyParams:
    rsi_period: int = 14
    rsi_oversold: float = 30.0
    rsi_overbought: float = 70.0
    sma_window: int = 20
    ema_span: int = 12
    macd_fast: int = 12
    macd_slow: int = 26
    macd_signal: int = 9
    stop_loss: float = 0.02      # fraction: 0.02 = 2%
    take_profit: float = 0.04    # fraction: 0.04 = 4%


@dataclass
class Settings:
    symbols: list
    data_period: str
    data_interval: str
    tune_period: str
    interval_seconds: int
    retune_hours: float
    starting_cash: float
    commission_rate: float
    slippage_bps: float
    bars_per_year: int
    max_drawdown_alert: float
    state_file: str
    alert_webhook_url: str
    dashboard_token: str
    interval_seconds_unused: int = 0


def _env_float(name: str, default: float) -> float:
    return float(os.getenv(name, default))


def load_settings() -> Settings:
    mode = os.getenv("BAGBOT_MODE", "paper").strip().lower()
    if mode != "paper":
        raise RuntimeError("BAGBOT_MODE must be 'paper'. Live trading is intentionally not implemented.")

    symbols = [s.strip().upper()
               for s in os.getenv("BAGBOT_SYMBOLS", "SPY,AAPL,MSFT").split(",") if s.strip()]

    return Settings(
        symbols=symbols,
        data_period=os.getenv("BAGBOT_DATA_PERIOD", "60d"),
        data_interval=os.getenv("BAGBOT_DATA_INTERVAL", "1h"),
        tune_period=os.getenv("BAGBOT_TUNE_PERIOD", "730d"),
        interval_seconds=int(os.getenv("BAGBOT_INTERVAL_SECONDS", "300")),
        retune_hours=_env_float("BAGBOT_RETUNE_HOURS", 24),
        starting_cash=_env_float("BAGBOT_STARTING_CASH", 100_000),
        commission_rate=_env_float("BAGBOT_COMMISSION", 0.0005),
        slippage_bps=_env_float("BAGBOT_SLIPPAGE_BPS", 5),
        bars_per_year=int(os.getenv("BAGBOT_BARS_PER_YEAR", "1638")),  # ~252 days x 6.5 hourly bars
        max_drawdown_alert=_env_float("BAGBOT_MAX_DRAWDOWN_ALERT", 0.10),
        state_file=os.getenv("BAGBOT_STATE_FILE", "data/state.json"),
        alert_webhook_url=os.getenv("ALERT_WEBHOOK_URL", ""),
        dashboard_token=os.getenv("DASHBOARD_TOKEN", ""),
    )
