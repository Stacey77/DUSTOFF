"""Central agentic brain.

Accepts a natural-language goal, decomposes it into tasks, delegates them
to the specialist swarm, and synthesizes a single human-readable answer.
The brain is deliberately model-agnostic: today it uses a deterministic
rule planner; an LLM planner can be dropped into `_plan()` later.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import time
import urllib.request
import uuid

from pydantic import BaseModel, Field

from app.agents.base import Swarm, Task, swarm
from app.core.config import settings
from app.core.state import store

log = logging.getLogger("brain")


class GoalResult(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    goal: str
    plan: list[str]
    tasks: list[Task]
    summary: str
    elapsed_s: float


class Brain:
    def __init__(self, swarm_ref: Swarm) -> None:
        self.swarm = swarm_ref
        self.goals: dict[str, GoalResult] = {}

    # ---- planning ----

    _LLM_PROMPT = (
        "You are the planner for a network-repair agent swarm. "
        "Decompose the user's goal into tasks. Reply with ONLY a JSON array; "
        "each item: {\"kind\": one of repair|setup|execute|design|learn, "
        "\"description\": short string, \"params\": object (device, action, scale as relevant)}. "
        "Known devices: {devices}. Available execute actions: flush_dns, restart_service, renew_dhcp."
    )

    async def _plan_llm(self, goal: str) -> list[Task] | None:
        """Ask an OpenAI-compatible LLM to plan; None on any failure."""
        if not (settings.llm_planner and settings.llm_api_key):
            return None
        devices = ", ".join(d.name for d in store.devices.values()) or "none"
        body = json.dumps({
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": self._LLM_PROMPT.format(devices=devices)},
                {"role": "user", "content": goal},
            ],
            "temperature": 0,
        }).encode()
        req = urllib.request.Request(
            f"{settings.llm_base_url}/chat/completions",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.llm_api_key}",
            },
        )
        try:
            resp = await asyncio.to_thread(urllib.request.urlopen, req, timeout=20)
            content = json.loads(resp.read())["choices"][0]["message"]["content"]
            items = json.loads(content[content.index("["):content.rindex("]") + 1])
            tasks = [
                Task(kind=i["kind"], description=i.get("description", goal),
                     params=i.get("params", {}))
                for i in items if i.get("kind") in ("repair", "setup", "execute", "design", "learn")
            ]
            if tasks:
                log.info("LLM planner produced %d task(s)", len(tasks))
                return tasks
        except Exception as exc:
            log.warning("LLM planner failed, falling back to rules: %s", exc)
        return None

    def _plan(self, goal: str) -> list[Task]:
        low = goal.lower()
        tasks: list[Task] = []

        device = self._extract_device(low)

        if any(w in low for w in ("design", "architect", "plan a", "blueprint")):
            scale = "large" if any(w in low for w in ("enterprise", "large", "campus")) else "mid-size"
            tasks.append(Task(kind="design", description=goal, params={"scale": scale}))

        if any(w in low for w in ("setup", "set up", "deploy", "provision", "install")):
            tasks.append(Task(kind="setup", description=goal,
                              params={"device": device} if device else {}))

        if any(w in low for w in ("repair", "fix", "heal", "troubleshoot", "restore")):
            tasks.append(Task(kind="repair", description=goal,
                              params={"device": device} if device else {}))

        m = re.search(r"(?:run|execute)\s+(\w+)\s+(?:on|for|against)\s+([\w\-\.]+)", low)
        if m:
            tasks.append(Task(kind="execute", description=goal,
                              params={"action": m.group(1), "device": m.group(2)}))
        elif "execute" in low and device:
            tasks.append(Task(kind="execute", description=goal,
                              params={"device": device, "action": "renew_dhcp"}))

        if any(w in low for w in ("learn", "what have you learned", "knowledge", "improve")):
            tasks.append(Task(kind="learn", description=goal, params={}))

        # after any repair/execute, always learn from the outcome
        if any(t.kind in ("repair", "execute") for t in tasks) and not any(
            t.kind == "learn" for t in tasks
        ):
            tasks.append(Task(kind="learn", description="consolidate outcomes", params={}))

        if not tasks:
            tasks.append(Task(kind="learn", description=goal, params={}))
        return tasks

    _STOPWORDS = {"and", "the", "a", "an", "new", "then", "from", "it", "them", "all"}

    @classmethod
    def _extract_device(cls, low: str) -> str | None:
        # 1) explicit "device/host/on/for <name>" mention
        m = re.search(r"(?:on|for|device|host)\s+([\w\-\.]+)", low)
        if m and m.group(1) not in cls._STOPWORDS:
            return m.group(1)
        # 2) any registered device name/host mentioned as a whole token
        tokens = set(re.findall(r"[\w\-\.]+", low))
        for d in store.devices.values():
            if d.name.lower() in tokens or d.host.lower() in tokens:
                return d.name
        return None

    # ---- execution ----

    async def pursue(self, goal: str) -> GoalResult:
        start = time.perf_counter()
        tasks = await self._plan_llm(goal) or self._plan(goal)
        # 'learn' tasks consolidate outcomes, so they must run after the rest
        work = [t for t in tasks if t.kind != "learn"]
        learn = [t for t in tasks if t.kind == "learn"]
        results = list(await asyncio.gather(*(self.swarm.dispatch(t) for t in work)))
        for t in learn:
            results.append(await self.swarm.dispatch(t))
        summary = self._synthesize(goal, results)
        gr = GoalResult(
            goal=goal,
            plan=[f"{t.kind}: {t.description}" for t in tasks],
            tasks=list(results),
            summary=summary,
            elapsed_s=round(time.perf_counter() - start, 2),
        )
        self.goals[gr.id] = gr
        return gr

    @staticmethod
    def _synthesize(goal: str, tasks: list[Task]) -> str:
        parts = []
        for t in tasks:
            icon = "✅" if t.status.value == "done" else "❌"
            parts.append(f"{icon} [{t.assigned_to or t.kind}] {t.result}")
        return "\n".join(parts)


brain = Brain(swarm)
