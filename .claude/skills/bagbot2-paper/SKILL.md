---
name: bagbot2-paper
description: Work on the BAGBOT2 paper-trading project in bagbot2/ — run, test, deploy and extend the dashboard, engine, backtester and helper agents. Use for any BAGBOT2 request.
---

# BAGBOT2 (paper only)

## Hard rules
- Paper trading only. Never add a broker, exchange, or live order path. `BAGBOT_MODE` must be `paper`; the engine refuses to start otherwise.
- Never add API keys for brokerages to the project. Never commit, push, or upload `.env` files.
- Helper agents (review, research) are read-only. Nothing they produce changes engine parameters without a person acting on it.
- Acceptance of new strategy parameters goes through the walk-forward tuner (out-of-sample gate). Don't bypass it.

## Layout
- `bagbot2/config.py` settings and StrategyParams
- `bagbot2/strategy.py`, `indicators.py`, `backtest.py`, `tuner.py` strategy, backtest, tuning
- `bagbot2/engine.py` paper engine (state in data/state.json)
- `bagbot2/agents.py` review_summary and research_variants (read-only)
- `bagbot2/dashboard.py` FastAPI app and single-page UI
- `bagbot2/test_core.py`, `test_agents.py` tests

## Commands (Windows PowerShell, from bagbot2/)
- `python -m pip install -r requirements.txt` (Python 3.12)
- `pytest -q` must end with all tests passing
- `$env:BAGBOT_PORT="8001"; $env:DASHBOARD_TOKEN="<token>"; python main.py` then open http://127.0.0.1:8001

## Before committing
1. `pytest -q` passes.
2. `git status` shows no `.env` files.
3. Push only to `bagbot2-paper-dashboard` unless told otherwise; fast-forward only, never force.
