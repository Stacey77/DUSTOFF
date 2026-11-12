# Pong Sandbox (Nova Digitus Designs)

Runs entirely on your machine, bound to 127.0.0.1. Nothing is exposed to your network.

## Start (Windows PowerShell)

    .\start.ps1

This creates a local virtual environment, installs requirements, starts Praetor, Vigil,
the Front Desk and the console, then opens http://127.0.0.1:8710/console.html.
Ctrl+C stops everything. Your .env stays on this machine; it is in .gitignore and .dockerignore.

## Try the AI Receptionist pack

1. Console > Front Desk > Install AI Receptionist
2. Click the simulate buttons (AC call, drain text, water heater quote, discount, emergency, scam)
3. Run Front Desk (Scripted brain needs no key; Ollama runs locally; Anthropic uses ANTHROPIC_API_KEY in .env)
4. Approvals: approve or deny the frozen quote, discount and emergency dispatch
5. Watch the customer texts update on the Front Desk, and the attacks in Theatrum

## Services

| Port | Service | Notes |
| --- | --- | --- |
| 8700 | Praetor | gateway: /act, /pending, /decide/{id}, /decision/{id}, /events, /packs, /killswitch, /killswitch/rearm, /verify-log |
| 8720 | Front Desk | /state, /inbound, /inbound/sample/{kind}, /run, /sync, /reset |
| 8710 | Console | serves console.html only |

Local data lives in ./data and the audit log in ./audit.log (both ignored by git).
