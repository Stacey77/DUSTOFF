# AI Network Repair Bot

Enterprise-style network monitoring with automated troubleshooting and a voice-enabled chat interface.

## Features

- **Continuous monitoring** — background loop probes devices via ICMP ping, TCP port, or DNS resolution; tracks latency history and consecutive failures.
- **Incidents** — opened automatically after repeated failures, auto-resolved on recovery.
- **Auto-remediation** — rule-based engine picks corrective actions (flush DNS, restart service, renew DHCP). Runs in **SAFE_MODE** (simulated) by default; set `SAFE_MODE = False` in `app/remediation/engine.py` to execute real commands.
- **Voice-enabled UI** — browser dashboard with speech recognition (mic button) and spoken replies (Chrome/Edge).
- **Chat/NL commands** — `status`, `check <device>`, `fix <device>`, `add device web-01 at 10.0.0.5 port 443`, `remove <device>`, `incidents`, `history <device>`, `help`.
- **REST API** — full control under `/api` (see `/docs` for OpenAPI).

## Agentic brain & swarm

A central **Brain** (`app/agents/brain.py`) accepts natural-language goals, decomposes them into tasks, and delegates to a specialist swarm:

| Agent | Capabilities |
|---|---|
| `repair` | diagnose failures, consult learned knowledge, remediate, verify |
| `setup` | network/system setup plans; registers new nodes for monitoring |
| `execution` | runs approved action playbooks (`flush_dns`, `restart_service`, `renew_dhcp`) |
| `learning` | records every outcome into a persistent knowledge base |
| `design` | produces AI/network system design documents |

- **Knowledge base** (`data/knowledge.json`) — the Learning agent records `(failure_type, action, success)`; the Repair agent consults it to pick the action with the best historical success rate.
- **Endpoints** — `POST /api/brain/goal`, `GET /api/brain/goals`, `GET /api/brain/knowledge`, `GET /api/agents`, `GET /api/agents/tasks`.
- **Chat/voice goals** — "design an enterprise network", "set up the new branch network", "what have you learned", "repair github-https".

## Run

```powershell
pip install -r requirements.txt
python run.py            # or: uvicorn app.main:app --port 8080
```

Open http://127.0.0.1:8080

### Docker

```powershell
docker build -t network-repair-bot .
docker run -p 8080:8080 -v nrb-data:/srv/data network-repair-bot
```

## Operations

All settings are env-driven — see `network-repair-bot.env.example`:

- `NRB_SAFE_MODE=false` — execute real remediation commands (default: simulate)
- `NRB_ALERT_WEBHOOK` — POST JSON alerts (Slack/Teams/generic) on incidents and escalations
- `NRB_ESCALATE_AFTER` — failed remediation cycles before a 🚨 escalation alert
- `NRB_ADMIN_KEY` / `NRB_VIEWER_KEY` — API-key auth via `X-API-Key` header (unset = open dev mode)
- `NRB_LLM_PLANNER=true` + `OPENAI_API_KEY` — the brain plans with an OpenAI-compatible LLM, falling back to the rule planner on failure
- Device registry persists to `data/devices.json`; learned knowledge to `data/knowledge.json`

## Tests

```powershell
pip install pytest httpx
python -m pytest tests -q
```

## Structure

```
app/
  main.py              FastAPI app, seed devices, monitoring loop startup
  core/models.py       Pydantic domain models
  core/state.py        In-memory store (devices, status, incidents, action log)
  core/intents.py      Natural-language intent parser for chat/voice
  monitors/probes.py   ping / TCP / DNS probes
  monitors/scheduler.py monitoring loop, failure tracking, incident lifecycle
  remediation/engine.py remediation rules + actions (SAFE_MODE)
  api/routes.py        REST + /api/chat endpoint
static/index.html      dashboard + voice chat UI
```
