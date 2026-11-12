"""Domain models for devices, checks, incidents and remediation actions."""
from __future__ import annotations

import time
import uuid
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Severity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class DeviceStatus(str, Enum):
    unknown = "unknown"
    healthy = "healthy"
    degraded = "degraded"
    down = "down"


class CheckType(str, Enum):
    ping = "ping"
    tcp_port = "tcp_port"
    dns = "dns"


class Device(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str
    host: str
    check: CheckType = CheckType.ping
    port: int | None = None  # for tcp_port checks
    dns_query: str | None = None  # for dns checks
    tags: list[str] = Field(default_factory=list)


class CheckResult(BaseModel):
    device_id: str
    ok: bool
    latency_ms: float | None = None
    detail: str = ""
    checked_at: float = Field(default_factory=time.time)


class Incident(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:10])
    device_id: str
    device_name: str
    severity: Severity
    message: str
    opened_at: float = Field(default_factory=time.time)
    resolved_at: float | None = None
    auto_actions: list[str] = Field(default_factory=list)


class ActionResult(BaseModel):
    action: str
    device_id: str
    success: bool
    output: str
    ran_at: float = Field(default_factory=time.time)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    data: dict[str, Any] = Field(default_factory=dict)
