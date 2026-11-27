"""Phase 10 — agent swarm: a brain that delegates to specialist sub-agents over A2A.

The "agentic brain running a swarm of sub-agents across every platform section",
built only from earlier phases:

* **Brain = Phase 4 agent.** ``Swarm.run`` is a plan -> act -> check graph whose
  tools are the sub-agents. A failed delegation sends the brain back to *plan*.
* **Sub-agents = Phase 4 agents with MCP-only hands.** Each specialist (foundry,
  factory, studio, ops) is its own plan -> act -> check graph whose only tools are
  Phase 3 MCP tools, called through a real FastMCP server built with the
  tenant's allowlist. A sub-agent cannot reach a tool the tenant was not granted,
  and nothing calls a pillar's Python API directly.
* **Brain <-> sub-agent traffic is A2A.** Every delegation is an A2A ``Task``
  (``submitted -> working -> completed | failed``) carrying A2A ``Message`` parts
  and ``Artifact`` results. The same agents are reachable from outside over the
  A2A JSON-RPC methods ``message/send`` and ``tasks/get``, and each publishes an
  A2A ``AgentCard``.
* **Metered and audited.** Each swarm run is one ``agent_run``; each MCP tool call
  is one ``mcp_call`` (already priced in the Phase 7 plans). Every run, A2A task
  and MCP call is written to the hash-chained audit log.

Routing is deterministic by default (keyword skills), so it works offline and in
tests. If a self-hosted LLM is configured (``EmpirePlatform.llm``, e.g. Ollama),
the brain asks it to route first and falls back to the keyword router when the
model is unavailable or answers with an unknown agent.
"""

from __future__ import annotations

import asyncio
import json
import re
import threading
import uuid
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import TYPE_CHECKING, Any

from src.empire.graph import LLM, PlanActCheckAgent
from src.empire.mcp_server import TENANT_BOUND, TOOL_NAMES, build_server, build_tools

if TYPE_CHECKING:
    from src.empire.platform import EmpirePlatform

A2A_PROTOCOL_VERSION = "0.3.0"
MAX_TASKS = 1000  # in-memory A2A task history kept per platform


# --------------------------------------------------------------------------
# A2A data model (subset of the A2A spec: Task, Message, Part, Artifact, Card)
# --------------------------------------------------------------------------
class TaskState(str, Enum):
    SUBMITTED = "submitted"
    WORKING = "working"
    COMPLETED = "completed"
    FAILED = "failed"


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _mid() -> str:
    return f"msg_{uuid.uuid4().hex[:12]}"


def text_message(role: str, text: str, context_id: str | None = None,
                 task_id: str | None = None) -> dict[str, Any]:
    msg: dict[str, Any] = {"kind": "message", "role": role, "messageId": _mid(),
                           "parts": [{"kind": "text", "text": text}]}
    if context_id:
        msg["contextId"] = context_id
    if task_id:
        msg["taskId"] = task_id
    return msg


def message_text(message: dict[str, Any]) -> str:
    """Concatenate the text parts of an A2A message."""
    parts = message.get("parts") if isinstance(message, dict) else None
    if not isinstance(parts, list):
        raise ValueError("message.parts must be a list")  # noqa: TRY004 - JSON-RPC invalid params
    texts = [p.get("text", "") for p in parts
             if isinstance(p, dict) and p.get("kind", "text") == "text"]
    text = " ".join(t.strip() for t in texts if isinstance(t, str) and t.strip())
    if not text:
        raise ValueError("message has no text parts")
    return text


@dataclass
class A2ATask:
    id: str
    context_id: str
    agent: str
    tenant_id: str | None
    state: TaskState = TaskState.SUBMITTED
    history: list[dict[str, Any]] = field(default_factory=list)
    artifacts: list[dict[str, Any]] = field(default_factory=list)
    updated_at: str = field(default_factory=_now)
    error: str | None = None

    def set_state(self, state: TaskState) -> None:
        self.state = state
        self.updated_at = _now()

    def to_dict(self) -> dict[str, Any]:
        status: dict[str, Any] = {"state": self.state.value, "timestamp": self.updated_at}
        if self.error:
            status["message"] = text_message("agent", self.error, self.context_id, self.id)
        return {
            "kind": "task",
            "id": self.id,
            "contextId": self.context_id,
            "status": status,
            "history": self.history,
            "artifacts": self.artifacts,
            "metadata": {"agent": self.agent, "tenant_id": self.tenant_id},
        }


# --------------------------------------------------------------------------
# Sub-agents
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Skill:
    id: str
    tool: str  # MCP tool this skill drives
    description: str
    keywords: tuple[str, ...]
    free_arg: str | None = None  # step text (minus key=value args) fills this arg


@dataclass(frozen=True)
class AgentSpec:
    name: str
    description: str
    skills: tuple[Skill, ...]

    @property
    def tools(self) -> tuple[str, ...]:
        return tuple(dict.fromkeys(s.tool for s in self.skills))

    def card(self, url: str, granted: list[str] | None = None) -> dict[str, Any]:
        skills = [s for s in self.skills if granted is None or s.tool in granted]
        return {
            "protocolVersion": A2A_PROTOCOL_VERSION,
            "name": f"nova-{self.name}",
            "description": self.description,
            "url": url,
            "version": "1.0.0",
            "preferredTransport": "JSONRPC",
            "capabilities": {"streaming": False, "pushNotifications": False},
            "defaultInputModes": ["text/plain"],
            "defaultOutputModes": ["application/json", "text/plain"],
            "skills": [{"id": s.id, "name": s.id.replace("_", " "),
                        "description": s.description, "tags": list(s.keywords),
                        "examples": [s.keywords[0]]} for s in skills],
            "provider": {"organization": "Nova Digitus Designs"},
        }


AGENTS: dict[str, AgentSpec] = {a.name: a for a in (
    AgentSpec("foundry", "AI Foundry specialist: app blueprints and scaffolding.", (
        Skill("list_blueprints", "foundry_list_blueprints",
              "List the app blueprints the Foundry can scaffold.",
              ("blueprint", "template", "catalog")),
        Skill("scaffold_app", "foundry_scaffold_app",
              "Scaffold a new app. Args: name, blueprint.",
              ("scaffold", "new app", "create app", "generate app")),
    )),
    AgentSpec("factory", "AI Factory specialist: compute pools and deployments.", (
        Skill("list_pools", "factory_list_pools",
              "Show compute pools and free capacity.",
              ("pool", "capacity", "compute", "cpu", "gpu")),
        Skill("deploy", "factory_deploy",
              "Deploy an app. Args: app_id, environment, pool, cpus.",
              ("deploy", "release", "ship")),
        Skill("teardown", "factory_teardown",
              "Stop a deployment. Args: deployment_id.",
              ("teardown", "tear down", "stop deployment", "undeploy")),
    )),
    AgentSpec("studio", "Agentic Studio specialist: coding assistants and IDE/CDE sessions.", (
        Skill("list_assistants", "studio_list_assistants",
              "List the self-hosted coding assistants.",
              ("assistant", "coder", "copilot")),
        Skill("open_session", "studio_open_session",
              "Open a Gitea-backed coding session. Args: repo, assistant, kind.",
              ("session", "ide", "cde", "workspace", "repo")),
    )),
    AgentSpec("knowledge", "Knowledge specialist: the client's private, vectorless "
              "knowledge base (add documents, search, answer with citations).", (
        Skill("add_document", "knowledge_add",
              "Add a document. Args: title, text (quote values with spaces).",
              ("add document", "add doc", "ingest", "upload document", "save note")),
        Skill("search", "knowledge_search",
              "Search the knowledge base; returns ranked passages.",
              ("search", "look up", "lookup", "find in docs", "find document"),
              free_arg="query"),
        Skill("ask", "knowledge_ask",
              "Answer a question from the knowledge base, with citations.",
              ("ask", "question", "according to", "our policy", "docs say"),
              free_arg="question"),
    )),
    AgentSpec("ops", "Operations specialist: whole-platform status.", (
        Skill("snapshot", "platform_snapshot",
              "Full platform snapshot: pillars, tenants, audit, scaling.",
              ("snapshot", "status", "health", "overview", "report")),
    )),
)}

assert all(t in TOOL_NAMES for a in AGENTS.values() for t in a.tools)

_ARG_RE = re.compile(r"(\w+)\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s,;]+)")


def parse_args(text: str) -> dict[str, Any]:
    """``{"k": v}`` JSON, or ``key=value`` pairs anywhere in the text."""
    s = text.strip()
    if s.startswith(("{", "[")):
        try:
            data = json.loads(s)
        except json.JSONDecodeError as exc:
            raise ValueError(f"bad JSON arguments: {exc}") from exc
        if not isinstance(data, dict):
            raise ValueError("JSON arguments must be an object")
        return data
    out: dict[str, Any] = {}
    for k, v in _ARG_RE.findall(s):
        v = v.strip("\"'")
        out[k] = int(v) if v.isdigit() else v
    return out


def strip_args(text: str) -> str:
    """The step text with ``key=value`` pairs / a JSON object removed (case kept)."""
    s = text.strip()
    if "{" in s:
        s = s[: s.index("{")]
    return re.sub(r"\s+", " ", _ARG_RE.sub(" ", s)).strip()


def intent(text: str) -> str:
    """The words of a step with its arguments removed (args never route)."""
    s = text.strip()
    if "{" in s:
        s = s[: s.index("{")]
    return _ARG_RE.sub(" ", s).lower()


def _match(text: str, keywords: tuple[str, ...]) -> int:
    t = intent(text)
    return sum(1 for k in keywords if k in t)


def pick_skill(spec: AgentSpec, text: str) -> Skill | None:
    """Explicit ``tool_name`` wins; otherwise best keyword match."""
    low = intent(text)
    for s in spec.skills:
        if s.tool in low or s.id in low:
            return s
    best = max(spec.skills, key=lambda s: _match(text, s.keywords))
    return best if _match(text, best.keywords) else None


def route(text: str) -> str | None:
    """Keyword router: which specialist should handle this step?"""
    low = intent(text)
    for name, spec in AGENTS.items():  # explicit tool name -> its owner
        if any(t in low for t in spec.tools):
            return name
    scores = {n: max(_match(text, s.keywords) for s in a.skills) for n, a in AGENTS.items()}
    best = max(scores, key=lambda n: scores[n])
    return best if scores[best] else None


class _SkillPlanner:
    """Sub-agent planner: one step -> ``tool_name: {json args}``.

    Planning is deterministic (skill keywords) so a specialist never invents a
    tool; the LLM is only consulted by the brain for routing.
    """

    def __init__(self, spec: AgentSpec, granted: set[str]) -> None:
        self.spec, self.granted = spec, granted

    def complete(self, prompt: str) -> str:
        if prompt.startswith("PLAN:"):
            text = prompt[5:].strip()
            skill = pick_skill(self.spec, text)
            if skill is None:
                raise ValueError(f"{self.spec.name} has no skill for {text!r}")
            if skill.tool not in self.granted:
                raise PermissionError(f"MCP tool {skill.tool} is not enabled for this tenant")
            args = parse_args(text)
            if skill.free_arg and skill.free_arg not in args:
                free = strip_args(text)
                if not free:
                    raise ValueError(f"{skill.id} needs some text to work with")
                args[skill.free_arg] = free
            return json.dumps([f"{skill.tool}: {json.dumps(args)}"])
        return "ok"


class _BrainPlanner:
    """Brain planner: goal -> ``agent: step`` list (LLM first, keywords fallback)."""

    def __init__(self, llm: LLM | None, steps: list[str] | None = None) -> None:
        self.llm = llm
        self.steps = steps  # preset steps (e.g. from a skill): no goal splitting
        self.last_source = "keywords"

    def _llm_route(self, steps: list[str]) -> list[str | None] | None:
        if self.llm is None:
            return None
        prompt = (
            "PLAN_ROUTE: Assign each step to exactly one agent from "
            f"{sorted(AGENTS)}. Reply with ONLY a JSON array of agent names, one "
            "per step, same order.\nSteps: " + json.dumps(steps)
        )
        try:
            names = json.loads(self.llm.complete(prompt))
        except Exception:  # noqa: BLE001 - any model failure falls back
            return None
        if not isinstance(names, list) or len(names) != len(steps):
            return None
        return [n if n in AGENTS else None for n in names]

    def complete(self, prompt: str) -> str:
        if not prompt.startswith("PLAN:"):
            return "ok"
        goal = prompt[5:].strip()
        steps = self.steps or [s.strip() for s in
                               re.split(r",|;|\bthen\b|\band then\b", goal)
                               if s.strip()] or [goal]
        llm_names = self._llm_route(steps)
        self.last_source = "llm" if llm_names else "keywords"
        plan = []
        for i, step in enumerate(steps):
            name = (llm_names[i] if llm_names else None) or route(step)
            if name is None:
                raise ValueError(f"no specialist agent can handle {step!r}")
            plan.append(f"{name}: {step}")
        return json.dumps(plan)


# --------------------------------------------------------------------------
# Swarm
# --------------------------------------------------------------------------
class Swarm:
    def __init__(self, platform: EmpirePlatform) -> None:
        self.p = platform
        self.tasks: OrderedDict[str, A2ATask] = OrderedDict()
        self._lock = threading.RLock()

    # -- tenancy / MCP ---------------------------------------------------
    def granted_tools(self, tenant_id: str | None) -> list[str]:
        if tenant_id is None:
            return list(TOOL_NAMES)
        t = self.p.onboarding.get(tenant_id)  # KeyError if unknown
        return list(t.mcp_tools)

    def _require_live(self, tenant_id: str | None) -> None:
        if tenant_id is None:
            return
        from src.empire.onboarding import Stage

        t = self.p.onboarding.get(tenant_id)
        if t.stage is not Stage.LIVE:
            raise ValueError(f"tenant {tenant_id} is not live (stage={t.stage.value})")

    def _mcp_call(self, tenant_id: str | None, agent: str, tool: str,
                  args: dict[str, Any], granted: list[str]) -> Any:
        """Call one tool through a FastMCP server built with the tenant allowlist."""
        if tool not in granted:
            raise PermissionError(f"MCP tool {tool} is not enabled for this tenant")
        try:
            server = build_server(self.p, allowed=granted)
        except ImportError:  # mcp package absent: same allowlist, direct call
            server = None
        if tenant_id is not None and tool in TENANT_BOUND:
            args = {**args, "tenant_id": tenant_id}  # a tenant can only act on itself
        try:
            if server is None:
                out = build_tools(self.p)[tool](**args)
            else:
                res = _run_coro(server.call_tool(tool, args))
                out = res[1] if isinstance(res, tuple) else res
                if isinstance(out, dict) and set(out) == {"result"}:
                    out = out["result"]
                if isinstance(out, list | tuple) and out and hasattr(out[0], "text"):
                    out = [json.loads(c.text) if c.text[:1] in "[{" else c.text for c in out]
        except Exception as exc:
            self.p.audit.record("mcp.call", tenant_id, {"agent": agent, "tool": tool,
                                                        "ok": False, "error": str(exc)})
            raise
        finally:
            if tenant_id is not None:
                self.p.metering.record(tenant_id, "mcp_call", 1)
        self.p.audit.record("mcp.call", tenant_id, {"agent": agent, "tool": tool,
                                                    "ok": True})
        return out

    # -- A2A -------------------------------------------------------------
    def _store(self, task: A2ATask) -> None:
        with self._lock:
            self.tasks[task.id] = task
            while len(self.tasks) > MAX_TASKS:
                self.tasks.popitem(last=False)

    def send(self, agent: str, message: dict[str, Any], tenant_id: str | None = None,
             context_id: str | None = None,
             tool_scope: list[str] | None = None) -> A2ATask:
        """A2A ``message/send``: run one specialist on one message, return the Task."""
        if agent not in AGENTS:
            raise KeyError(f"unknown agent {agent!r}")
        self._require_live(tenant_id)
        text = message_text(message)  # ValueError on empty / malformed
        spec = AGENTS[agent]
        granted = self.granted_tools(tenant_id)
        if tool_scope is not None:  # e.g. a skill: never more than it declared
            granted = [t for t in granted if t in tool_scope]
        task = A2ATask(id=f"task_{uuid.uuid4().hex[:12]}",
                       context_id=context_id or message.get("contextId")
                       or f"ctx_{uuid.uuid4().hex[:10]}",
                       agent=agent, tenant_id=tenant_id)
        task.history.append({**message, "contextId": task.context_id, "taskId": task.id})
        self._store(task)
        self.p.audit.record("a2a.task", tenant_id, {"task_id": task.id, "agent": agent,
                                                    "state": task.state.value})
        task.set_state(TaskState.WORKING)

        calls: list[dict[str, Any]] = []

        def make_tool(tool: str):
            def run(arg: str) -> Any:
                out = self._mcp_call(tenant_id, agent, tool, parse_args(arg), granted)
                calls.append({"tool": tool, "output": out})
                return out
            return run

        sub = PlanActCheckAgent(_SkillPlanner(spec, set(granted)),
                                tools={t: make_tool(t) for t in spec.tools})
        try:
            state = sub.run(text, max_attempts=1)
            ok = bool(state.get("done"))
            err = None if ok else str(state.get("results", [{}])[-1].get("output"))
        except Exception as exc:  # noqa: BLE001 - planner refusal etc. -> failed task
            ok, err, state = False, str(exc), {}
        if ok:
            task.artifacts.append({
                "artifactId": f"art_{uuid.uuid4().hex[:10]}", "name": f"{agent}-result",
                "parts": [{"kind": "data", "data": {"calls": calls}}]})
            summary = ", ".join(c["tool"] for c in calls) or "done"
            task.history.append(text_message("agent", f"completed: {summary}",
                                             task.context_id, task.id))
            task.set_state(TaskState.COMPLETED)
        else:
            task.error = err
            task.history.append(text_message("agent", f"failed: {err}",
                                             task.context_id, task.id))
            task.set_state(TaskState.FAILED)
        self.p.audit.record("a2a.task", tenant_id, {"task_id": task.id, "agent": agent,
                                                    "state": task.state.value,
                                                    "tools": [c["tool"] for c in calls]})
        return task

    def get_task(self, task_id: str, tenant_id: str | None = None) -> A2ATask:
        task = self.tasks.get(task_id)
        # a tenant can never confirm another tenant's (or the operator's) task ids
        if task is None or (tenant_id is not None and task.tenant_id != tenant_id):
            raise KeyError(f"unknown task {task_id!r}")
        return task

    def cards(self, base_url: str, tenant_id: str | None = None) -> list[dict[str, Any]]:
        granted = None if tenant_id is None else self.granted_tools(tenant_id)
        out = []
        for name, spec in AGENTS.items():
            card = spec.card(f"{base_url.rstrip('/')}/{name}", granted)
            if card["skills"]:
                out.append(card)
        return out

    # -- brain -----------------------------------------------------------
    def run(self, goal: str, tenant_id: str | None = None,
            max_attempts: int = 2, *, steps: list[str] | None = None,
            tool_scope: list[str] | None = None) -> dict[str, Any]:
        if not goal.strip():
            raise ValueError("goal required")
        self._require_live(tenant_id)
        context_id = f"ctx_{uuid.uuid4().hex[:10]}"
        delegated: list[A2ATask] = []
        done_steps: dict[tuple[str, str], Any] = {}  # replans never redo side effects

        def delegate(agent: str):
            def run(step: str) -> Any:
                if (agent, step) in done_steps:
                    return done_steps[(agent, step)]
                task = self.send(agent, text_message("user", step, context_id),
                                 tenant_id, context_id, tool_scope)
                delegated.append(task)
                if task.state is TaskState.FAILED:
                    raise RuntimeError(f"{agent}: {task.error}")
                out = {"task_id": task.id, "state": task.state.value,
                       "artifacts": task.artifacts}
                done_steps[(agent, step)] = out
                return out
            return run

        planner = _BrainPlanner(self.p.llm, steps)
        brain = PlanActCheckAgent(planner, tools={n: delegate(n) for n in AGENTS})
        try:
            state = brain.run(goal, max_attempts=max_attempts)
            error = None if state.get("done") else "brain gave up after replanning"
        except Exception as exc:  # noqa: BLE001 - unroutable goal
            state, error = {"done": False, "plan": [], "results": []}, str(exc)
        if error and state.get("results"):
            error = str(state["results"][-1].get("output"))
        if tenant_id:
            self.p.metering.record(tenant_id, "agent_run", 1)
        result = {
            "context_id": context_id,
            "goal": goal,
            "done": bool(state.get("done")),
            "engine": brain.engine,
            "routing": planner.last_source,
            "plan": state.get("plan", []),
            "attempts": state.get("attempts", 0),
            "error": error,
            "tasks": [t.to_dict() for t in delegated],
        }
        self.p.audit.record("swarm.run", tenant_id, {
            "context_id": context_id, "done": result["done"],
            "agents": [t.agent for t in delegated], "routing": planner.last_source})
        return result

    def snapshot(self) -> dict[str, Any]:
        states: dict[str, int] = {}
        for t in self.tasks.values():
            states[t.state.value] = states.get(t.state.value, 0) + 1
        return {"agents": sorted(AGENTS), "tasks": len(self.tasks), "by_state": states}


def _run_coro(coro: Any) -> Any:
    """Run a coroutine from sync code, even if an event loop is already running."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    box: dict[str, Any] = {}

    def worker() -> None:
        try:
            box["v"] = asyncio.run(coro)
        except BaseException as exc:  # noqa: BLE001 - re-raised below
            box["e"] = exc

    th = threading.Thread(target=worker)
    th.start()
    th.join()
    if "e" in box:
        raise box["e"]
    return box["v"]


# --------------------------------------------------------------------------
# A2A JSON-RPC dispatch (used by the REST layer)
# --------------------------------------------------------------------------
JSONRPC_PARSE = -32700
JSONRPC_INVALID_REQUEST = -32600
JSONRPC_METHOD_NOT_FOUND = -32601
JSONRPC_INVALID_PARAMS = -32602
A2A_TASK_NOT_FOUND = -32001


def jsonrpc(swarm: Swarm, agent: str, body: Any, tenant_id: str | None) -> dict[str, Any]:
    rid = body.get("id") if isinstance(body, dict) else None

    def err(code: int, msg: str) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": rid, "error": {"code": code, "message": msg}}

    if not isinstance(body, dict) or body.get("jsonrpc") != "2.0" or "method" not in body:
        return err(JSONRPC_INVALID_REQUEST, "expected a JSON-RPC 2.0 request")
    params = body.get("params") or {}
    if not isinstance(params, dict):
        return err(JSONRPC_INVALID_PARAMS, "params must be an object")
    method = body["method"]
    try:
        if method == "message/send":
            msg = params.get("message")
            if not isinstance(msg, dict):
                return err(JSONRPC_INVALID_PARAMS, "params.message required")
            task = swarm.send(agent, msg, tenant_id)
        elif method == "tasks/get":
            if not isinstance(params.get("id"), str):
                return err(JSONRPC_INVALID_PARAMS, "params.id required")
            task = swarm.get_task(params["id"], tenant_id)
        else:
            return err(JSONRPC_METHOD_NOT_FOUND, f"method {method!r} not supported")
    except KeyError as exc:
        code = A2A_TASK_NOT_FOUND if method == "tasks/get" else JSONRPC_INVALID_PARAMS
        return err(code, str(exc.args[0] if exc.args else exc))
    except ValueError as exc:
        return err(JSONRPC_INVALID_PARAMS, str(exc))
    return {"jsonrpc": "2.0", "id": rid, "result": task.to_dict()}
