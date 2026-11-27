# Three-Way Empire — `src/empire`

Nova Digitus Designs' private AI platform. Every workload runs on
customer-owned infrastructure; no LangSmith, no third-party telemetry.

| Phase | Module | What it does |
|---|---|---|
| 1 | `foundry.py`, `factory.py`, `studio.py` | Blueprint catalog + scaffolding; compute pools + env→backend deploys (dev/staging=Podman, prod=Rancher); Gitea-aware IDE/CDE sessions |
| 2 | `auth_mode.py`, `infra.py` | Per-client `api_key` / `enterprise_token` / `local`; secrets resolved from env at call time, never serialized |
| 3 | `mcp_server.py` | FastMCP server, 12 tools (3 added in Phase 12), per-tenant allowlist. `python -m src.empire.mcp_server` |
| 4 | `graph.py` | plan → act → check agent. LangGraph `StateGraph` if installed, identical built-in engine otherwise. `OllamaLLM` for self-hosted models |
| 5 | `onboarding.py` | proposal_accepted → tenant_created → auth_bootstrapped → mcp_enabled → pilot_scaffolded → pilot_deployed → live. Resumable; tenant key shown once, stored hashed |
| 6 | `src/api/endpoints/empire.py` | `/api/v1/empire/*` (18 routes) incl. tenant self-service via `X-Tenant-Key` |
| 7 | `metering.py`, `audit.py` | Strategy $300 / Pilot $1,500 / Retainer $2,000/mo with included usage + overage; invoice drafts; SHA-256 hash-chained audit log (`EMPIRE_AUDIT_PATH`) |
| 8 | `deploy.py` | Per-tenant bundle: app files, `podman-compose.yml` (bundled Ollama for local tenants), `.gitea/workflows/deploy.yml`, `.env.example`, README |
| 9 | `scaling.py` | Agentic scaling: per-tenant job queues, weighted fair share (retainer 3 / pilot 2 / strategy 1, work-conserving), elastic workers that are real Factory deployments (scale-to-zero, idle TTL reap, capacity-aware), every job = Phase 4 agent, `cpu_second` metering + per-tenant/worker/pool cost attribution |
| 10 | `swarm.py` | Agent swarm: a plan → act → check **brain** delegates each step to a specialist sub-agent (foundry, factory, studio, ops) over **A2A** (Task / Message / Artifact, `message/send`, `tasks/get`, Agent Cards). Sub-agents act **only through MCP**: a FastMCP server built with the tenant's allowlist. Keyword routing offline, self-hosted LLM routing when configured. Failed delegations trigger a replan that never repeats completed side effects. `agent_run` + `mcp_call` metering, every task and tool call on the audit chain |
| 11 | `skills.py`, `skill_library/` | Skills library: `SKILL.md` folders (frontmatter `name` / `description` / `tools` / `tags` / `inputs` + a `## Steps` list) that the brain picks by name, by the self-hosted LLM, or by keyword. Each step runs on the Phase 10 swarm, scoped to `the skill's declared tools ∩ the tenant's MCP grant`. 4 built-in skills; operator skills from `EMPIRE_SKILLS_DIR` or the API; tenant-private skills via `X-Tenant-Key`. API-installed skills persist in `state.json`. Inputs can't inject tool arguments. `skill_run` metering, `skill.installed` / `skill.removed` / `skill.run` audit |
| 12 | `knowledge.py` | **Vectorless RAG**: a per-tenant knowledge base with no embeddings or vector DB. Markdown is split into a heading tree, chunked on paragraph boundaries, and ranked with BM25 plus heading and phrase bonuses. `ask` answers from the top chunks with [n] citations: the self-hosted LLM when configured, otherwise the best-matching sentences, or an honest "not found". MCP tools `knowledge_add` / `knowledge_search` / `knowledge_ask` are tenant-bound. A `knowledge` swarm agent and the `answer-from-docs` skill use them. Tier quotas: 200k / 2M / 20M chars. Data persists in `state.json`; the audit log never stores text or queries |

## One-call onboarding

```bash
curl -X POST localhost:8000/api/v1/empire/onboarding -H 'content-type: application/json' \
  -d '{"client_name":"River Clinic","contact_email":"it@river.test","tier":"pilot","run_to_live":true}'
```

Returns the live tenant and its one-time `tenant_api_key`. Then
`GET /api/v1/empire/onboarding/{id}/bundle` gives the deploy files to commit to
the client's Gitea.

## Phase 9 — scaling

```bash
# tenant submits work (their own key only sees their own jobs)
curl -X POST localhost:8000/api/v1/empire/tenant/jobs -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' -d '{"goal":"blueprints then pools","priority":7}'

# operator: scaler state, policy, cost attribution
curl localhost:8000/api/v1/empire/scaling/status
curl -X PUT localhost:8000/api/v1/empire/scaling/policy -H 'content-type: application/json' \
  -d '{"max_workers":4,"idle_ttl_s":300}'
curl localhost:8000/api/v1/empire/scaling/attribution/$TENANT_ID
```

The control loop runs in the API process when `EMPIRE_SCALING_INTERVAL` (seconds)
is set; otherwise drive it with `POST /api/v1/empire/scaling/tick`. Default policy:
0–6 workers, 1 CPU each on `local-cpu`, 4 queued jobs per worker, 120 s idle TTL.
Compute pricing: pilot includes 10 CPU-hours, retainer 100 CPU-hours/month;
overage $1.80 / $1.08 per CPU-hour (minimum 1 CPU-second per job).

## Deployment

`deploy/empire/` is a working deployment: Containerfile, compose stack (API + Ollama),
`deploy.ps1` / `deploy.sh` one-command installers, `smoke_test.py`, `k8s.yaml`.
The standalone service is `src/empire/server.py` (operator key `EMPIRE_ADMIN_KEY`,
`/health`, `/ready`). State persists to `EMPIRE_STATE_PATH` via `src/empire/state.py`.
The operator console is served at `/` (`src/empire/console/index.html`): command bar,
live client pipeline, scaling floor, agent trace, activity feed, client drawer. It polls
`GET /api/v1/empire/console`. See `deploy/empire/README.md`.

## Phase 10 — agent swarm + A2A

```bash
# operator: one goal, many specialists (each step becomes an A2A task)
curl -X POST localhost:8080/api/v1/empire/swarm/run -H "X-API-Key: $OP" \
  -H 'content-type: application/json' \
  -d '{"goal":"list blueprints, show pool capacity then scaffold app name=crm blueprint=support-bot, platform status"}'

# client: same brain, limited to the MCP tools their tenant was granted
curl -X POST localhost:8080/api/v1/empire/tenant/swarm/run -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' -d '{"goal":"show pools then platform status"}'

# A2A: discover agents, then talk to one directly over JSON-RPC
curl localhost:8080/api/v1/empire/tenant/a2a/agents -H "X-Tenant-Key: $KEY"
curl -X POST localhost:8080/api/v1/empire/tenant/a2a/factory -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"message/send",
  "params":{"message":{"role":"user","messageId":"m1","parts":[{"kind":"text","text":"show pools"}]}}}'
```

Arguments go in the step as `key=value` (or a JSON object) and never affect routing.
A tenant's agent cards list only the skills behind its granted MCP tools. A tool outside
the allowlist fails the A2A task and is never called. Tenants can't read each other's
task ids, and anything a tenant scaffolds is always owned by that tenant. A2A tasks are
kept in memory (last 1,000) and are not part of `state.json`. The audit log holds the
permanent record.

## Phase 11 — skills library

A skill is a folder `<name>/SKILL.md`:

```markdown
---
name: launch-new-app
description: Scaffold a new app from a Foundry blueprint and confirm there is compute to run it.
tools: [foundry_list_blueprints, foundry_scaffold_app, factory_list_pools]
tags: [launch, scaffold, new app, build]
inputs:
  app_name: new-app
  blueprint: rag-assistant
---
## Steps
1. list blueprints
2. scaffold app name={app_name} blueprint={blueprint}
3. show pool capacity
```

Built-in skills: `platform-health-check`, `launch-new-app`, `open-dev-workspace`,
`retire-deployment`.

```bash
# client: run by goal (the brain picks the skill) or by name
curl -X POST localhost:8080/api/v1/empire/tenant/skills/run -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' \
  -d '{"goal":"build a new support bot","inputs":{"app_name":"river-bot","blueprint":"support-bot"}}'

# client: install a private skill (only this client sees it)
curl -X POST localhost:8080/api/v1/empire/tenant/skills -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' -d "{\"content\": $(python -c 'import json;print(json.dumps(open("SKILL.md").read()))')}"

# operator: list, read, install, remove (built-ins are read-only)
curl localhost:8080/api/v1/empire/skills -H "X-API-Key: $OP"
curl localhost:8080/api/v1/empire/skills/launch-new-app -H "X-API-Key: $OP"
```

Rules:
- A skill can only call the MCP tools in its `tools:` list. A step that needs anything else fails its A2A task.
- A client only sees global skills whose tools it was granted, plus its own. Hidden skills return 404, not 403.
- A client skill can't reuse a platform skill name, and built-ins can't be replaced or removed.
- Input values can't contain `=`, double quotes, braces or newlines (apostrophes are fine).
- A goal that matches no skill runs on the plain swarm.
- Set `EMPIRE_SKILLS_DIR` to load a folder of operator skills at startup. Load problems appear under `load_errors` in `GET /skills`.

## Phase 12 — vectorless RAG knowledge base

```bash
# client: add a document (Markdown headings become searchable sections)
curl -X POST localhost:8080/api/v1/empire/tenant/knowledge/docs -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' \
  -d '{"title":"Handbook","text":"# Policies\n\n## Refunds\nRefunds are issued within 5 business days.","tags":["policy"]}'

# client: ask (cited answer) or search (ranked passages)
curl -X POST localhost:8080/api/v1/empire/tenant/knowledge/ask -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' -d '{"question":"how fast are refunds?"}'
curl -X POST localhost:8080/api/v1/empire/tenant/knowledge/search -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' -d '{"query":"refund","k":3}'

# through the agents: the knowledge specialist, or the built-in skill
curl -X POST localhost:8080/api/v1/empire/tenant/swarm/run -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' -d '{"goal":"ask how fast are refunds"}'
curl -X POST localhost:8080/api/v1/empire/tenant/skills/run -H "X-Tenant-Key: $KEY" \
  -H 'content-type: application/json' -d '{"skill":"answer-from-docs","inputs":{"question":"are you open sundays?"}}'
```

The operator has the same routes without `/tenant`. Pass `tenant_id` to work on a client's
knowledge base; leave it out to use the operator's own corpus.

Rules:
- Every document has one owner. Searches only see that owner's chunks, and another client's document ids return 404.
- Any MCP tool that takes `tenant_id` (`TENANT_BOUND`) is pinned to the calling client, so a client can never reach another client's data by passing a different id.
- If no sentence in the matching chunks shares a word with the question, `ask` returns "I couldn't find that in the knowledge base." instead of guessing.
- Document text is passed to the LLM as data, with an instruction to ignore any instructions inside it.
- Limits: 500k characters per document; per-tier totals of 200k (strategy), 2M (pilot) and 20M (retainer). Going over returns `413`.
- Each search or ask meters one `kb_query` (not priced yet). The audit log records titles, sizes and hit counts only.

59 routes under `/api/v1/empire`. Tests: `pytest tests/unit/empire` (91).
