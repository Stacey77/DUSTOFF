# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — Three-Way Empire phase 12

- Added `src/empire/knowledge.py`, a vectorless RAG knowledge base: Markdown section tree, paragraph chunking, BM25 with heading and phrase bonuses, cited answers (self-hosted LLM or extractive, honest "not found"), per-tenant isolation, tier character quotas, `state.json` persistence, `kb_query` metering, and audit records with no text.
- MCP: `knowledge_add`, `knowledge_search`, `knowledge_ask` (12 tools). New `TENANT_BOUND` set pins `tenant_id` to the caller for every tenant-scoped tool; this also closes the gap for `agent_run`.
- Swarm: a `knowledge` specialist agent, and free-text arguments for search and ask. New built-in skill `answer-from-docs`. Skill inputs may now contain apostrophes.
- Added 12 `/api/v1/empire/knowledge/*` and `/tenant/knowledge/*` routes and 16 tests.

## [Unreleased] — Three-Way Empire phase 11

- Added `src/empire/skills.py` and `src/empire/skill_library/` (4 built-in skills): `SKILL.md` loader (no PyYAML), validation, goal → skill matching (self-hosted LLM, then keywords), runs on the phase 10 swarm scoped to the skill's declared MCP tools ∩ the tenant grant, tenant-private skills, `state.json` persistence, injection-safe inputs, `skill_run` metering and audit.
- Swarm: `run(..., steps=, tool_scope=)`.
- Added 10 `/api/v1/empire/skills*` and `/tenant/skills*` routes and 16 tests.

## [Unreleased] — Three-Way Empire phase 10

- Added `src/empire/swarm.py`: brain agent delegating to foundry / factory / studio / ops specialist sub-agents over A2A (Task, Message, Artifact, Agent Cards, JSON-RPC `message/send` + `tasks/get`). Sub-agents use MCP tools only, through a FastMCP server scoped to the tenant allowlist. Optional self-hosted LLM routing with keyword fallback, replans that don't redo side effects, `mcp_call` metering, audit events `swarm.run` / `a2a.task` / `mcp.call`.
- Added 8 `/api/v1/empire/swarm/*`, `/a2a/*` and `/tenant/swarm|a2a/*` routes and 12 tests.

## [Unreleased] — Three-Way Empire phase 9

- Added `src/empire/scaling.py`: multi-tenant job queues with weighted fair share, elastic worker pool backed by AI Factory deployments (scale-to-zero, idle reaping, capacity-aware), `cpu_second` metering and per-tenant/worker/pool cost attribution, opt-in background loop (`EMPIRE_SCALING_INTERVAL`).
- Added 9 `/api/v1/empire/scaling/*` and `/tenant/jobs*` routes and 13 tests.

## [Unreleased] — Three-Way Empire phases 1–8

- Added `src/empire`: pillars, per-client auth modes, OSS infra, MCP server (9 tools), plan→act→check graph, client onboarding state machine, metering/pricing/invoices, hash-chained audit log, per-tenant podman-compose + Gitea CI bundles.
- Added `/api/v1/empire` router (18 routes) and 27 tests.

## [1.0.0-rc.1] — 2026-08-01

### Added
- **Prompt injection sanitizer** (`src/api/security/sanitizer.py`) — strips role-override, instruction-leak, and jailbreak patterns from user-supplied text before it reaches the LLM. Applied to task submission, agent execution, agent streaming, and WebSocket endpoints.
- **`/api/v1/system/auth-status` endpoint** — reports whether authentication is enforced and whether JWT secret is stable. Suitable for use in monitoring and operator health checks.
- **`SECURITY.md`** — responsible disclosure policy and supported versions table.
- **Per-identity rate limiting** — rate-limit buckets are now keyed by the authenticated JWT subject or API key ID instead of the raw `X-API-Key` header value. Falls back to IP for unauthenticated requests.

### Changed
- **CORS default** changed from `*` (allow all) to `http://localhost:8000`. Set `CORS_ORIGINS` explicitly for any production deployment.
- **JWT secret handling** — a startup warning is now emitted when `JWT_SECRET` is not set via environment variable, making the ephemeral (per-restart) key state explicit and visible in logs.
- **Auth bypass warning** — a startup warning is now emitted when no API keys are configured (`API_KEYS` / `API_KEY` unset), making the open-access state explicit in logs.
- **CORS wildcard warning** — a startup warning is now emitted when `CORS_ORIGINS=*` is used outside of `LOG_LEVEL=DEBUG` mode.
- **Version bumped** to `1.0.0-rc.1` in `pyproject.toml`, FastAPI app metadata, and `/api/v1/system/info` response.
- **`auth_identity`** is now stored in `request.state` by the auth middleware (alongside `auth_role`), enabling downstream middleware to make per-user decisions.
- **`.env.example`** updated to document `JWT_SECRET` as required in production and add CORS guidance.

---

## [0.1.0] — Initial release

### Added
- FastAPI application with 88 REST endpoints across 16 route groups: `health`, `agents`, `tasks` (SSE), `crew`, `ide`, `cde`, `platform`, `webhooks`, `sessions`, `eval`, `auth`, `system`, `scheduler`, `usage`, `memory`.
- 12 AI agent types: `PLANNING`, `RESEARCH`, `ANALYSIS`, `WRITING`, `REVIEW`, `CODING`, `SUMMARIZATION`, `IDE`, `CDE`, `KALLY`, `EXECUTION`.
- `BaseAgent` with retry logic and circuit breaker (opens for 60 s after 5 consecutive failures).
- Three-layer memory architecture: short-term (in-process), long-term/episodic (ChromaDB), and hybrid (`HybridMemory` / `MemoryManager`).
- Async task queue backed by `asyncio.Queue` or Redis, with SQLite persistence.
- `TaskScheduler` for periodic/scheduled jobs.
- JWT authentication (`JWTManager`) and API key management (`KeyStore`).
- Role-aware token-bucket rate limiting middleware (`admin` bypass, `read` at 50% capacity).
- Prometheus metrics at `/metrics` and OpenTelemetry tracing support.
- CrewAI multi-agent orchestration (`src/crew/`).
- LangGraph integration within agent pipelines.
- Docker Compose, Podman, Helm chart, and Kubernetes raw manifests for deployment.
- 355 unit tests.
