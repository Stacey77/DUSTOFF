"""Swarm runtime: task model, base agent, and agent registry."""
from __future__ import annotations

import time
import uuid
from enum import Enum

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class Task(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    kind: str  # repair | setup | execute | design | learn
    description: str
    params: dict = Field(default_factory=dict)
    assigned_to: str | None = None
    status: TaskStatus = TaskStatus.queued
    result: str | None = None
    created_at: float = Field(default_factory=time.time)
    finished_at: float | None = None


class AgentReport(BaseModel):
    agent: str
    task_id: str
    success: bool
    summary: str
    details: dict = Field(default_factory=dict)


class BaseAgent:
    """A specialist in the swarm."""

    name: str = "base"
    capabilities: set[str] = set()

    def can_handle(self, kind: str) -> bool:
        return kind in self.capabilities

    async def handle(self, task: Task) -> AgentReport:  # pragma: no cover
        raise NotImplementedError

    async def run(self, task: Task) -> Task:
        task.status = TaskStatus.running
        task.assigned_to = self.name
        try:
            report = await self.handle(task)
            task.status = TaskStatus.done if report.success else TaskStatus.failed
            task.result = report.summary
        except Exception as exc:  # keep the swarm alive on agent failure
            task.status = TaskStatus.failed
            task.result = f"{self.name} crashed: {exc}"
        task.finished_at = time.time()
        return task


class Swarm:
    def __init__(self) -> None:
        self.agents: dict[str, BaseAgent] = {}
        self.tasks: dict[str, Task] = {}

    def register(self, agent: BaseAgent) -> None:
        self.agents[agent.name] = agent

    def roster(self) -> list[dict]:
        return [
            {"name": a.name, "capabilities": sorted(a.capabilities)}
            for a in self.agents.values()
        ]

    async def dispatch(self, task: Task) -> Task:
        self.tasks[task.id] = task
        for agent in self.agents.values():
            if agent.can_handle(task.kind):
                return await agent.run(task)
        task.status = TaskStatus.failed
        task.result = f"no agent capable of '{task.kind}'"
        task.finished_at = time.time()
        return task


swarm = Swarm()
