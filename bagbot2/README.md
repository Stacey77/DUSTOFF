# BAGBOT2 (paper trading)

Automated paper-trading system: RSI, SMA, EMA and MACD strategy, bar-by-bar backtester,
walk-forward parameter tuning, a token-protected FastAPI dashboard, Prometheus metrics,
JSON logs and webhook alerts.

**Paper only.** There is no broker connection and no code path that places a real order.
`BAGBOT_MODE` must be `paper` or the process refuses to start. Backtests and paper results
do not predict live results. This is not financial advice.

## Files

| File | Purpose |
|---|---|
| `config.py` | Settings from environment variables, strategy defaults |
| `indicators.py` | RSI, SMA, EMA, MACD (pandas only) |
| `strategy.py` | Entry and exit rules shared by backtest and live engine |
| `backtest.py` | No-lookahead simulator: signal on close, fill next open, slippage and commission |
| `tuner.py` | Random-search tuning on the first 70% of history, accepted only if it wins out-of-sample |
| `engine.py` | Stateful paper engine, persisted to `data/state.json`, thread-safe |
| `dashboard.py` | Dashboard, `/health`, `/metrics`, `/api/state`, token-protected `retune`/`pause`/`resume` |
| `alerts.py` | Logs every alert, posts to `ALERT_WEBHOOK_URL` when set |
| `main.py` | Entry point, rotating logs in `logs/` |
| `deploy/` | systemd unit, server bootstrap, code sync (never sends `.env`) |

## Run locally

```bash
python -m venv venv
source venv/bin/activate            # Windows PowerShell: venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest -q
cp .env.example .env                # then set DASHBOARD_TOKEN in .env on this machine only
python main.py
```

Open http://127.0.0.1:8000. The engine runs one cycle immediately, then every
`BAGBOT_INTERVAL_SECONDS` (default 300).

## Deploy to EC2 or DigitalOcean

1. **Create the server.** Ubuntu 24.04 (EC2 `t3.small` or a DigitalOcean droplet).
   Firewall or security group: allow **port 22 from your IP only**. Do not open 8000.
2. **Copy the code** (run on your machine; `.env` is excluded):
   ```bash
   chmod +x deploy/*.sh
   ./deploy/sync_to_server.sh ubuntu@<server-ip>
   ```
3. **Bootstrap** (run on the server):
   ```bash
   ssh ubuntu@<server-ip>
   sudo bash /opt/bagbot2/deploy/bootstrap.sh
   ```
4. **Set the token on the server**, not on your machine:
   ```bash
   sudo nano /etc/bagbot2/bagbot2.env     # set DASHBOARD_TOKEN=<long random string>
   sudo systemctl restart bagbot2
   ```
   Generate a token with `openssl rand -hex 32`.
5. **View the dashboard** through an SSH tunnel:
   ```bash
   ssh -L 8000:127.0.0.1:8000 ubuntu@<server-ip>
   ```
   Then open http://localhost:8000.

Updates: run step 2 again. It installs new dependencies and restarts the service.

Logs on the server: `journalctl -u bagbot2 -f` and `/opt/bagbot2/logs/bagbot2.log`.

## Monitoring

- `GET /health` returns 200 while the engine has completed a cycle within 3 intervals, otherwise 503.
  Use it for uptime checks through the tunnel or a local monitor.
- `GET /metrics` exposes Prometheus gauges: equity, cash, drawdown, return, open positions,
  closed trades, win rate, paused flag, recent errors.
- Alerts fire on drawdown breach (forces a retune), on a run of poor results (last 10 closed
  trades under 30% wins, forces a retune), and on every engine error. Set `ALERT_WEBHOOK_URL`
  to receive them.

## Tuning and evaluation

- Parameters retune every `BAGBOT_RETUNE_HOURS` (default 24), on `BAGBOT_TUNE_PERIOD` of hourly data.
- A candidate replaces the live parameters only if it beats the current ones out-of-sample by
  at least 0.05 Sharpe and stays within the drawdown limit. Every decision is in the tuning log.
- Trigger a retune on demand with the dashboard button or
  `curl -X POST -H "X-Dashboard-Token: $TOKEN" http://127.0.0.1:8000/api/retune` (run on the server).

## Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `BAGBOT_SYMBOLS` | `SPY,AAPL,MSFT` | Symbols to trade on paper |
| `BAGBOT_DATA_PERIOD` / `BAGBOT_DATA_INTERVAL` | `60d` / `1h` | Live data window and bar size |
| `BAGBOT_TUNE_PERIOD` | `730d` | History used for tuning (yfinance hourly limit is 730d) |
| `BAGBOT_INTERVAL_SECONDS` | `300` | Engine cycle |
| `BAGBOT_RETUNE_HOURS` | `24` | Scheduled retune age |
| `BAGBOT_STARTING_CASH` | `100000` | Paper starting equity |
| `BAGBOT_COMMISSION` / `BAGBOT_SLIPPAGE_BPS` | `0.0005` / `5` | Cost model |
| `BAGBOT_MAX_DRAWDOWN_ALERT` | `0.10` | Drawdown that raises an alert and forces a retune |
| `BAGBOT_STATE_FILE` | `data/state.json` | Persisted paper state |
| `DASHBOARD_TOKEN` | empty | Required for retune, pause and resume |
| `ALERT_WEBHOOK_URL` | empty | Slack-compatible incoming webhook |

## Known limits

- **Data:** yfinance is free and unofficial, can be delayed or missing bars, and is not an execution feed.
- **Fills:** paper fills at the latest close plus slippage. Real fills, partial fills and halts will differ.
- **Overfitting:** out-of-sample gating helps but does not remove it. Judge the strategy on weeks of
  paper results, across several market regimes, before any real capital is considered.
- **Scale:** single process, single worker, state in one JSON file. Fine for a handful of symbols.
- **Secrets:** keep `.env` on your machine only. Server secrets go in `/etc/bagbot2/bagbot2.env`, typed by hand.
