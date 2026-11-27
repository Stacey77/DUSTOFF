"""Regression tests for the PR #9 review: tenant isolation and webhook targets."""

from __future__ import annotations

import pytest

from src.empire.auth_mode import AuthMode, ProviderAuth
from src.empire.mcp_server import TOOL_NAMES, build_tools
from src.empire.onboarding import Proposal
from src.empire.platform import EmpirePlatform
from src.webhooks.dispatcher import (
    UnsafeWebhookURL,
    WebhookDispatcher,
    check_webhook_url,
)


def _two_tenant_deployments(p: EmpirePlatform) -> tuple[str, str]:
    auth = ProviderAuth(AuthMode.LOCAL)
    a = p.foundry.scaffold("a-app", p.foundry.list_blueprints()[0]["key"], "ten_a", auth)
    b = p.foundry.scaffold("b-app", p.foundry.list_blueprints()[0]["key"], "ten_b", auth)
    da = p.factory.deploy(a.id, "dev", tenant_id="ten_a")
    db = p.factory.deploy(b.id, "dev", tenant_id="ten_b")
    return da.id, db.id


def test_tenant_cannot_tear_down_another_tenants_deployment() -> None:
    p = EmpirePlatform()
    _, b_dep = _two_tenant_deployments(p)
    tools = build_tools(p)
    with pytest.raises(PermissionError):
        tools["factory_teardown"](b_dep, tenant_id="ten_a")
    assert p.factory.deployments[b_dep].status != "stopped"
    assert tools["factory_teardown"](b_dep, tenant_id="ten_b")["status"] == "stopped"


def test_tenant_cannot_deploy_another_tenants_app() -> None:
    p = EmpirePlatform()
    _two_tenant_deployments(p)
    b_app = next(a for a in p.foundry.apps.values() if a.tenant_id == "ten_b")
    with pytest.raises(PermissionError):
        build_tools(p)["factory_deploy"](b_app.id, tenant_id="ten_a")


def test_tenant_snapshot_hides_other_tenants() -> None:
    p = EmpirePlatform()
    _two_tenant_deployments(p)
    snap = build_tools(p)["platform_snapshot"](tenant_id="ten_a")
    assert "tenants" not in snap
    assert snap["pillars"]["foundry"]["apps"] == 1
    assert snap["pillars"]["factory"]["deployments"] == 1
    assert len(build_tools(p)["platform_snapshot"]()["tenants"]) == len(p.onboarding.tenants)


def test_empty_tool_grant_means_no_tools() -> None:
    p = EmpirePlatform()
    t = p.onboarding.accept(Proposal(client_name="Zero Tools", contact_email="z@z.test",
                                     mcp_tools=[]))
    t, _ = p.onboarding.run_to_live(t.id)
    assert t.mcp_tools == []
    d = p.onboarding.accept(Proposal(client_name="Defaults", contact_email="d@d.test"))
    d, _ = p.onboarding.run_to_live(d.id)
    assert d.mcp_tools == list(TOOL_NAMES)


@pytest.mark.parametrize("url", [
    "http://127.0.0.1/hook", "http://localhost:8000/x", "http://10.0.0.5/",
    "http://169.254.169.254/latest/meta-data", "http://[::1]/", "ftp://example.com/",
    "http://192.168.1.10/", "http://[::ffff:127.0.0.1]/",
])
def test_internal_webhook_targets_rejected(url: str) -> None:
    with pytest.raises(UnsafeWebhookURL):
        WebhookDispatcher().register(url, ["ping"])


def test_public_webhook_target_allowed_and_override(monkeypatch: pytest.MonkeyPatch) -> None:
    assert WebhookDispatcher().register("https://example.com/hook", ["ping"])
    monkeypatch.setenv("WEBHOOK_ALLOW_PRIVATE", "1")
    check_webhook_url("http://127.0.0.1/hook", resolve=True)


def test_recurring_invoice_bills_only_its_own_month() -> None:
    from src.empire.metering import PLANS, Metering, current_period

    m = Metering()
    tier = next(t for t, plan in PLANS.items() if plan.recurring)
    m.open_account("ten_r", tier)
    acct = m.accounts["ten_r"]
    acct.usage["agent_run"] = 999_999          # old month's usage
    acct.periods["2026-10"] = {"agent_run": 999_999}
    nov = m.invoice("ten_r", "2099-01")
    assert nov["usage"] == {} and len(nov["lines"]) == 1
    oct_ = m.invoice("ten_r", "2026-10")
    assert any("overage" in line["description"] for line in oct_["lines"])
    m.record("ten_r", "agent_run", 3)
    assert m.accounts["ten_r"].periods[current_period()]["agent_run"] == 3


def test_metering_periods_survive_restart(tmp_path) -> None:
    from src.empire.state import load, save

    p = EmpirePlatform()
    from src.empire.metering import PLANS

    p.metering.open_account("ten_s", next(t for t, pl in PLANS.items() if pl.recurring))
    p.metering.record("ten_s", "agent_run", 2)
    path = tmp_path / "state.json"
    save(p, path)
    q = EmpirePlatform()
    load(q, path)
    assert q.metering.accounts["ten_s"].periods == p.metering.accounts["ten_s"].periods


def test_failed_onboarding_still_returns_issued_key() -> None:
    from src.empire.onboarding import OnboardingError

    p = EmpirePlatform()
    for pool in p.factory.pools.values():  # no capacity: the deploy stage fails
        pool.allocated_cpus = pool.cpus
    t = p.onboarding.accept(Proposal(client_name="Full Box", contact_email="f@f.test"))
    with pytest.raises(OnboardingError) as info:
        p.onboarding.run_to_live(t.id)
    key = info.value.api_key
    assert key and p.tenant_for_key(key) == t.id


@pytest.mark.parametrize("agent_type", ["kally", "cde", "ide"])
def test_agent_types_without_llm_param_register(agent_type: str) -> None:
    from src.agents.agent_factory import create_agent
    from src.agents.base_agent import AgentConfig, AgentType

    agent = create_agent(AgentConfig(name=f"t-{agent_type}", agent_type=AgentType(agent_type)),
                         llm=None)
    assert agent is not None


def test_agent_websocket_requires_credentials_when_keys_configured() -> None:
    from fastapi.testclient import TestClient
    from starlette.websockets import WebSocketDisconnect

    from src.api.main import app

    with TestClient(app) as c:
        from src.auth.key_store import KeyRole

        raw, made = app.state.key_store.create_key("ws-test", KeyRole.ADMIN)
        with pytest.raises(WebSocketDisconnect) as info, \
                c.websocket_connect("/api/v1/agents/nope/ws") as ws:
            ws.receive_json()
        assert info.value.code == 1008
        with c.websocket_connect(f"/api/v1/agents/nope/ws?api_key={raw}") as ws:
            assert "not found" in ws.receive_json()["error"]
        app.state.key_store.revoke_key(made.key_id)


def test_background_scaling_tick_persists_finished_jobs(tmp_path) -> None:
    import asyncio
    import json

    path = tmp_path / "state.json"
    p = EmpirePlatform(state_path=str(path))
    t = p.onboarding.accept(Proposal(client_name="Loop Co", contact_email="l@l.test"))
    t, _ = p.onboarding.run_to_live(t.id)
    job = p.scaling.submit(t.id, "summarise the handbook")
    p.persist()

    async def one_pass() -> None:
        stop = asyncio.Event()
        task = asyncio.create_task(p.scaling.run_loop(0.01, stop))
        for _ in range(200):
            await asyncio.sleep(0.01)
            if not p.scaling.queued():
                break
        stop.set()
        await task

    asyncio.run(one_pass())
    saved = json.loads(path.read_text())
    assert job.id in json.dumps(saved["scaling"])
    assert '"queued"' not in json.dumps([j for j in saved["scaling"].get("jobs", [])
                                         if j.get("id") == job.id])
