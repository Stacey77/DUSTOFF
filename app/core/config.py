"""Environment-driven configuration.

All settings can be overridden via environment variables or a .env file
loaded by the OS/shell (no python-dotenv dependency required).
"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)


def _bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    # server
    host: str = os.getenv("NRB_HOST", "127.0.0.1")
    port: int = int(os.getenv("NRB_PORT", "8080"))

    # monitoring
    poll_interval: float = float(os.getenv("NRB_POLL_INTERVAL", "30"))
    degrade_latency_ms: float = float(os.getenv("NRB_DEGRADE_LATENCY_MS", "250"))
    fail_threshold: int = int(os.getenv("NRB_FAIL_THRESHOLD", "2"))

    # remediation
    safe_mode: bool = _bool("NRB_SAFE_MODE", True)
    repair_max_attempts: int = int(os.getenv("NRB_REPAIR_MAX_ATTEMPTS", "2"))
    learned_min_rate: float = float(os.getenv("NRB_LEARNED_MIN_RATE", "0.5"))

    # alerting
    alert_webhook: str | None = os.getenv("NRB_ALERT_WEBHOOK") or None
    escalate_after: int = int(os.getenv("NRB_ESCALATE_AFTER", "3"))  # failed remediation cycles

    # auth: if unset, API is open (dev mode)
    admin_key: str | None = os.getenv("NRB_ADMIN_KEY") or None
    viewer_key: str | None = os.getenv("NRB_VIEWER_KEY") or None

    # LLM planner (optional; falls back to rule planner)
    llm_planner: bool = _bool("NRB_LLM_PLANNER", False)
    llm_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    llm_api_key: str | None = os.getenv("OPENAI_API_KEY") or None
    llm_model: str = os.getenv("NRB_LLM_MODEL", "gpt-4o-mini")

    # persistence
    devices_file: Path = DATA_DIR / "devices.json"
    knowledge_file: Path = DATA_DIR / "knowledge.json"


settings = Settings()
