import asyncio
import functools

import pytest

from app.agents import specialists
from app.agents.base import Task
from app.agents.knowledge import KnowledgeBase
from app.core.models import ActionResult, CheckResult, CheckType, Device
from app.remediation import engine


def _sync(fn):
    """Run an async test without requiring pytest-asyncio."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        return asyncio.run(fn(*args, **kwargs))
    return wrapper


def test_parse_action_splits_argument():
    assert engine.parse_action("restart_service:networking") == ("restart_service", "networking")
    assert engine.parse_action("flush_dns") == ("flush_dns", None)


def test_is_known_action():
    assert engine.is_known_action("flush_dns")
    assert engine.is_known_action("restart_service:networking")
    assert not engine.is_known_action("none_needed")
    assert not engine.is_known_action("flush_dns:extra")
    assert not engine.is_known_action("restart_service:bad name; rm -rf")


def test_candidates_learned_first_and_deduplicated():
    out = engine.candidates_for("dns", "restart_service:networking")
    assert out == ["restart_service:networking", "flush_dns"]


def test_candidates_ignores_unknown_learned_action():
    assert engine.candidates_for("reachability", "none_needed") == [
        "renew_dhcp", "restart_service:networking",
    ]


def test_candidates_unknown_failure_type_is_empty():
    assert engine.candidates_for("bogus") == []


@_sync
async def test_run_action_rejects_invalid_service_name():
    device = Device(name="r1", host="10.0.0.1")
    result = await engine.run_action(device, "restart_service:bad name")
    assert isinstance(result, ActionResult)
    assert result.success is False
    assert result.output == "invalid service name"


@_sync
async def test_run_action_unknown_returns_none():
    device = Device(name="r1", host="10.0.0.1")
    assert await engine.run_action(device, "none_needed") is None
    assert await engine.run_action(device, "flush_dns:arg") is None


@_sync
async def test_repair_agent_prefers_learned_then_verifies(tmp_path, monkeypatch):
    device = Device(name="sw1", host="10.0.0.2", check=CheckType.dns, dns_query="example.com")
    kb = KnowledgeBase(tmp_path / "kb.json")
    kb.record("dns", "restart_service:networking", True)
    monkeypatch.setattr(specialists, "kb", kb)

    ran: list[str] = []

    async def fake_run_action(dev, action):
        ran.append(action)
        return ActionResult(action=action, device_id=dev.id, success=True, output="ok")

    checks = iter([
        CheckResult(device_id=device.id, ok=False, detail="dns fail"),  # initial diagnosis
        CheckResult(device_id=device.id, ok=True, detail="resolved"),   # verification
    ])

    async def fake_check(dev):
        return next(checks)

    monkeypatch.setattr(specialists.store, "find_device", lambda _: device)
    monkeypatch.setattr(specialists.store, "log_action", lambda _: None)
    monkeypatch.setattr(specialists.store, "resolve_incidents_for", lambda _: None)
    monkeypatch.setattr(specialists, "run_check", fake_check)
    monkeypatch.setattr(engine, "run_action", fake_run_action)

    report = await specialists.RepairAgent().handle(
        Task(kind="repair", description="fix sw1", params={"device": "sw1"})
    )
    assert report.success is True
    assert ran == ["restart_service:networking"]
    assert "knowledge base prefers" in report.summary


@_sync
async def test_repair_agent_reports_failure_when_unverified(tmp_path, monkeypatch):
    device = Device(name="sw2", host="10.0.0.3")
    monkeypatch.setattr(specialists, "kb", KnowledgeBase(tmp_path / "kb.json"))
    monkeypatch.setattr(specialists.settings, "repair_max_attempts", 2)

    ran: list[str] = []

    async def fake_run_action(dev, action):
        ran.append(action)
        return ActionResult(action=action, device_id=dev.id, success=True, output="ok")

    async def fake_check(dev):
        return CheckResult(device_id=dev.id, ok=False, detail="still down")

    monkeypatch.setattr(specialists.store, "find_device", lambda _: device)
    monkeypatch.setattr(specialists.store, "log_action", lambda _: None)
    monkeypatch.setattr(specialists.store, "resolve_incidents_for", lambda _: None)
    monkeypatch.setattr(specialists, "run_check", fake_check)
    monkeypatch.setattr(engine, "run_action", fake_run_action)

    report = await specialists.RepairAgent().handle(
        Task(kind="repair", description="fix sw2", params={"device": "sw2"})
    )
    assert report.success is False
    assert ran == ["renew_dhcp", "restart_service:networking"]
