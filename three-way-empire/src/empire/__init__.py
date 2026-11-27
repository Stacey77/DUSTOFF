"""Three-Way Empire — Nova Digitus Designs private AI platform.

Phases:
  1  Pillars: AI Foundry, AI Factory, Agentic Studio
  2  Per-client auth modes (api_key / enterprise_token / local) + OSS infra
  3  MCP tool server exposing the pillars
  4  plan -> act -> check execution graph (self-hosted first, Ollama)
  5  Client onboarding: tenant, auth bootstrap, MCP enablement, proposal-to-live
  6  REST API (/api/v1/empire)
  7  Metering, pricing tiers, invoice drafts, tamper-evident audit log
  8  Per-tenant deploy packaging (podman-compose) + Gitea Actions CI
  9  Agentic scaling: fair-share multi-tenant jobs, elastic workers, cost attribution
  10 Agent swarm: brain + specialist sub-agents over A2A, MCP-only tool access
  11 Skills library: SKILL.md folders the brain picks and follows, tool-scoped
  12 Vectorless RAG: per-tenant knowledge base (structure + BM25, cited answers)
"""

from src.empire.platform import EmpirePlatform

__all__ = ["EmpirePlatform"]
