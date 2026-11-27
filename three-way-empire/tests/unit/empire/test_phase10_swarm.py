import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.endpoints.empire import router
from src.empire.graph import RuleLLM
from src.empire.onboarding import Proposal
from src.empire.platform import EmpirePlatform
from src.empire.server import create_app
from src.empire.swarm import (
    AGENTS,
    TaskState,
    intent,
    jsonrpc,
    parse_args,
    pick_skill,
    route,
    text_message,
)

GOAL = ("list blueprints, show pool capacity then "
        "scaffold app name=crm blueprint=support-bot, platform status")


def _live(p: EmpirePlatform, name: str = "Acme", **kw) -> str:
    t = p.onboarding.accept(Proposal(name, f"ops@{name.lower()}.test", **kw))
    p.onboarding.run_to_live(t.id)
    return t.id


def _calls(task: dict) -> list[str]:
    return [c["tool"] for c in task["artifacts"][0]["parts"][0]["data"]["calls"]]


# ---------------- routing ----------------
def test_keyword_routing_ignores_arguments():
    assert route("list blueprints") == "foundry"
    assert route("how much cpu capacity is free") == "factory"
    assert route("open a session repo=nova/crm") == "studio"
    assert route("platform status") == "ops"
    assert route("factory_teardown deployment_id=dep_1") == "factory"
    assert route("sing a song") is None
    # "blueprint=" is an argument, not intent: this is a scaffold, not a listing
    assert intent("scaffold app name=x blueprint=support-bot").strip() == "scaffold app"
    assert pick_skill(AGENTS["foundry"],
                      "scaffold app name=crm blueprint=support-bot").tool == "foundry_scaffold_app"


def test_parse_args_kv_and_json():
    assert parse_args("deploy app_id=app_1 cpus=2 environment='prod'") == {
        "app_id": "app_1", "cpus": 2, "environment": "prod"}
    assert parse_args('{"repo": "nova/x", "kind": "ide"}') == {"repo": "nova/x", "kind": "ide"}
    with pytest.raises(ValueError):
        parse_args("{not json")
    with pytest.raises(ValueError):
        parse_args("[1, 2]")


# ---------------- brain + sub-agents ----------------
def test_brain_delegates_each_step_to_a_specialist_over_a2a():
    p = EmpirePlatform()
    out = p.swarm.run(GOAL)
    assert out["done"] and out["error"] is None and out["routing"] == "keywords"
    assert [t["metadata"]["agent"] for t in out["tasks"]] == [
        "foundry", "factory", "foundry", "ops"]
    assert all(t["status"]["state"] == "completed" for t in out["tasks"])
    assert len({t["contextId"] for t in out["tasks"]}) == 1  # one A2A conversation
    assert _calls(out["tasks"][2]) == ["foundry_scaffold_app"]
    assert any(a.name == "crm" for a in p.foundry.apps.values())


def test_tenant_swarm_is_metered_audited_and_scaffolds_into_the_tenant():
    p = EmpirePlatform()
    tid = _live(p)
    before = p.metering.accounts[tid].usage.get("mcp_call", 0)
    out = p.swarm.run(GOAL, tid)
    assert out["done"]
    usage = p.metering.accounts[tid].usage
    assert usage["mcp_call"] - before == 4 and usage["agent_run"] == 1
    crm = next(a for a in p.foundry.apps.values() if a.name == "crm")
    assert crm.tenant_id == tid
    actions = [e.action for e in p.audit.events]
    assert actions.count("mcp.call") == 4 and actions.count("swarm.run") == 1
    assert actions.count("a2a.task") == 8  # submitted + final state, per task
    assert p.audit.verify() == (True, None)
    assert p.snapshot()["swarm"]["tasks"] == 4


def test_mcp_allowlist_is_enforced_per_tenant():
    p = EmpirePlatform()
    tid = _live(p, mcp_tools=["platform_snapshot", "factory_list_pools"])
    ok = p.swarm.run("platform status then show pools", tid)
    assert ok["done"]
    blocked = p.swarm.run("list blueprints", tid)
    assert not blocked["done"] and "not enabled" in blocked["error"]
    assert blocked["tasks"][-1]["status"]["state"] == "failed"
    # only granted skills are advertised on the tenant's agent cards
    cards = {c["name"]: c for c in p.swarm.cards("http://x", tid)}
    assert set(cards) == {"nova-factory", "nova-ops"}
    assert [s["id"] for s in cards["nova-factory"]["skills"]] == ["list_pools"]


def test_failed_delegation_replans_without_redoing_side_effects():
    p = EmpirePlatform()
    tid = _live(p)
    apps_before = len(p.foundry.apps)
    # step 2 fails (no such deployment) -> brain replans -> scaffold must not rerun
    out = p.swarm.run("scaffold app name=one blueprint=support-bot, "
                      "teardown deployment_id=dep_missing", tid)
    assert not out["done"] and out["attempts"] == 2
    assert len(p.foundry.apps) == apps_before + 1
    agents = [t["metadata"]["agent"] for t in out["tasks"]]
    assert agents == ["foundry", "factory", "factory"]
    assert "dep_missing" in out["error"]


def test_unroutable_goal_and_bad_input():
    p = EmpirePlatform()
    out = p.swarm.run("sing a song")
    assert not out["done"] and "no specialist" in out["error"] and out["tasks"] == []
    with pytest.raises(ValueError):
        p.swarm.run("   ")
    early = p.onboarding.accept(Proposal("Early", "a@b.co"))
    with pytest.raises(ValueError, match="not live"):
        p.swarm.run("platform status", early.id)
    with pytest.raises(KeyError):
        p.swarm.run("platform status", "ten_nope")


class RouterLLM(RuleLLM):
    """Self-hosted model stand-in that answers the brain's routing prompt."""

    def __init__(self, answer):
        self.answer, self.prompts = answer, 0

    def complete(self, prompt):
        if prompt.startswith("PLAN_ROUTE:"):
            self.prompts += 1
            return self.answer
        return super().complete(prompt)


def test_llm_routing_is_used_when_valid_and_falls_back_otherwise():
    llm = RouterLLM(json.dumps(["ops"]))
    out = EmpirePlatform(llm=llm).swarm.run("give me the overview")
    assert out["routing"] == "llm" and out["tasks"][0]["metadata"]["agent"] == "ops"
    bad = RouterLLM("I think the factory agent should do it")
    out = EmpirePlatform(llm=bad).swarm.run("show pools")
    assert bad.prompts == 1 and out["routing"] == "keywords" and out["done"]
    unknown = RouterLLM(json.dumps(["marketing"]))  # not one of our agents
    out = EmpirePlatform(llm=unknown).swarm.run("show pools")
    assert out["tasks"][0]["metadata"]["agent"] == "factory"


# ---------------- A2A JSON-RPC ----------------
def test_jsonrpc_message_send_and_tasks_get():
    p = EmpirePlatform()
    req = {"jsonrpc": "2.0", "id": 7, "method": "message/send",
           "params": {"message": text_message("user", "list blueprints")}}
    r = jsonrpc(p.swarm, "foundry", req, None)
    assert r["id"] == 7 and r["result"]["kind"] == "task"
    assert r["result"]["status"]["state"] == "completed"
    tid = r["result"]["id"]
    g = jsonrpc(p.swarm, "foundry", {"jsonrpc": "2.0", "id": 8, "method": "tasks/get",
                                     "params": {"id": tid}}, None)
    assert g["result"]["id"] == tid and len(g["result"]["history"]) == 2
    codes = [
        jsonrpc(p.swarm, "foundry", {"id": 1}, None),
        jsonrpc(p.swarm, "foundry", {"jsonrpc": "2.0", "id": 1, "method": "x/y"}, None),
        jsonrpc(p.swarm, "foundry", {"jsonrpc": "2.0", "id": 1, "method": "message/send",
                                     "params": {}}, None),
        jsonrpc(p.swarm, "foundry", {"jsonrpc": "2.0", "id": 1, "method": "tasks/get",
                                     "params": {"id": "task_nope"}}, None),
        jsonrpc(p.swarm, "nobody", req, None),
        jsonrpc(p.swarm, "foundry", {"jsonrpc": "2.0", "id": 1, "method": "message/send",
                                     "params": {"message": {"parts": []}}}, None),
    ]
    assert [c["error"]["code"] for c in codes] == [
        -32600, -32601, -32602, -32001, -32602, -32602]


def test_skill_mismatch_returns_failed_task_not_error():
    p = EmpirePlatform()
    t = p.swarm.send("ops", text_message("user", "deploy everything"))
    assert t.state is TaskState.FAILED and "no skill" in t.error


# ---------------- REST ----------------
def _api() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _onboard(c: TestClient, name: str, **extra) -> tuple[str, dict[str, str]]:
    b = c.post("/api/v1/empire/onboarding", json={
        "client_name": name, "contact_email": f"it@{name.lower()}.test",
        "run_to_live": True, **extra}).json()
    return b["tenant"]["id"], {"X-Tenant-Key": b["tenant_api_key"]}


def test_rest_swarm_cards_and_tenant_isolation():
    c = _api()
    a_id, a_key = _onboard(c, "Alpha")
    _, b_key = _onboard(c, "Beta", mcp_tools=["platform_snapshot"])

    r = c.post("/api/v1/empire/tenant/swarm/run", headers=a_key,
               json={"goal": "show pools then platform status"})
    assert r.status_code == 200 and r.json()["done"]
    assert c.post("/api/v1/empire/tenant/swarm/run",
                  json={"goal": "status"}).status_code == 401

    cards = c.get("/api/v1/empire/a2a/agents").json()
    assert {x["name"] for x in cards} == {f"nova-{n}" for n in AGENTS}
    assert cards[0]["url"].startswith("http://testserver/api/v1/empire/a2a/")
    assert c.get("/api/v1/empire/a2a/factory/agent-card.json").json()["name"] == "nova-factory"
    assert c.get("/api/v1/empire/a2a/nobody/agent-card.json").status_code == 404
    b_cards = c.get("/api/v1/empire/tenant/a2a/agents", headers=b_key).json()
    assert [x["name"] for x in b_cards] == ["nova-ops"]

    send = {"jsonrpc": "2.0", "id": 1, "method": "message/send",
            "params": {"message": text_message("user", "show pools")}}
    t = c.post("/api/v1/empire/tenant/a2a/factory", headers=a_key, json=send).json()
    task_id = t["result"]["id"]
    get = {"jsonrpc": "2.0", "id": 2, "method": "tasks/get", "params": {"id": task_id}}
    assert c.post("/api/v1/empire/tenant/a2a/factory", headers=a_key,
                  json=get).json()["result"]["id"] == task_id
    # Beta can neither read Alpha's task nor use a tool it was not granted
    assert c.post("/api/v1/empire/tenant/a2a/factory", headers=b_key,
                  json=get).json()["error"]["code"] == -32001
    denied = c.post("/api/v1/empire/tenant/a2a/factory", headers=b_key, json=send).json()
    assert denied["result"]["status"]["state"] == "failed"

    bad = c.post("/api/v1/empire/a2a/factory", content=b"{nope",
                 headers={"content-type": "application/json"}).json()
    assert bad["error"]["code"] == -32700
    op = c.post("/api/v1/empire/swarm/run", json={"goal": "status", "tenant_id": a_id})
    assert op.status_code == 200 and op.json()["done"]
    assert c.post("/api/v1/empire/swarm/run",
                  json={"goal": "status", "tenant_id": "ten_x"}).status_code == 404
    assert c.get("/api/v1/empire/swarm/status").json()["tasks"] >= 5


def test_standalone_service_guards_swarm_routes(tmp_path):
    p = EmpirePlatform(audit_path=tmp_path / "a.jsonl", state_path=tmp_path / "s.json")
    c = TestClient(create_app(p, admin_key="op"))
    assert c.post("/api/v1/empire/swarm/run", json={"goal": "status"}).status_code == 401
    assert c.get("/api/v1/empire/a2a/agents").status_code == 401
    r = c.post("/api/v1/empire/onboarding", headers={"X-API-Key": "op"}, json={
        "client_name": "Gamma", "contact_email": "g@g.co", "run_to_live": True})
    key = {"X-Tenant-Key": r.json()["tenant_api_key"]}
    run = c.post("/api/v1/empire/tenant/swarm/run", headers=key, json={"goal": "status"})
    assert run.status_code == 200 and run.json()["done"]
