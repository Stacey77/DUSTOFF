import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.endpoints.empire import router
from src.empire.graph import RuleLLM
from src.empire.onboarding import Proposal
from src.empire.platform import EmpirePlatform
from src.empire.server import create_app
from src.empire.skills import (
    SkillError,
    SkillLibrary,
    parse_frontmatter,
    parse_skill,
    render_steps,
)

BUILTINS = {"platform-health-check", "launch-new-app", "open-dev-workspace",
            "retire-deployment", "answer-from-docs"}

POOLS_ONLY = """---
name: pool-watch
description: Watch compute pool capacity for the client. Use for capacity checks.
tools: [factory_list_pools]
tags: [pools, capacity, watch]
---
# Pool watch
## Steps
1. show pool capacity
"""


def _live(p: EmpirePlatform, name: str = "Acme", **kw) -> str:
    t = p.onboarding.accept(Proposal(name, f"ops@{name.lower()}.test", **kw))
    p.onboarding.run_to_live(t.id)
    return t.id


# ---------------- format ----------------
def test_frontmatter_parser_subset():
    meta, body = parse_frontmatter(
        "---\nname: x\ntools: [a, b]\ntags:\n  - one\n  - two\ninputs:\n  repo: nova/x\n"
        "  empty:\ndesc: 'quoted: yes'\n---\nbody\n")
    assert meta == {"name": "x", "tools": ["a", "b"], "tags": ["one", "two"],
                    "inputs": {"repo": "nova/x", "empty": ""}, "desc": "quoted: yes"}
    assert body == "body\n"
    with pytest.raises(SkillError):
        parse_frontmatter("no frontmatter")
    with pytest.raises(SkillError):
        parse_frontmatter("---\nname: x\n")


@pytest.mark.parametrize(("patch", "msg"), [
    ("name: Bad Name", "name must be"),
    ("description: ", "description is required"),
    ("tools: [rm_rf]", "unknown"),
    ("tools: ", "tools must list"),
])
def test_skill_validation(patch, msg):
    key = patch.split(":")[0]
    lines = [patch if ln.startswith(key + ":") else ln for ln in POOLS_ONLY.splitlines()]
    with pytest.raises(SkillError, match=msg):
        parse_skill("\n".join(lines))
    with pytest.raises(SkillError, match="Steps"):
        parse_skill(POOLS_ONLY.replace("## Steps", "## Notes"))
    with pytest.raises(SkillError, match="larger"):
        parse_skill(POOLS_ONLY + "x" * 21_000)


def test_inputs_cannot_inject_tool_arguments():
    sk = parse_skill(POOLS_ONLY.replace("1. show pool capacity",
                                        "1. open session repo={repo}")
                     .replace("[factory_list_pools]", "[studio_open_session]"))
    assert render_steps(sk, {"repo": "nova/crm"}) == ["open session repo=nova/crm"]
    for evil in ("x kind=ide", "x\nboom", "{repo}", '"x"'):
        with pytest.raises(SkillError):
            render_steps(sk, {"repo": evil})
    with pytest.raises(SkillError, match="needs inputs"):
        render_steps(sk, {})


# ---------------- library ----------------
def test_builtins_load_and_match_goals():
    p = EmpirePlatform()
    assert set(p.skills.global_skills) == BUILTINS and p.skills.load_errors == []
    assert all(s.origin == "builtin" for s in p.skills.global_skills.values())
    assert p.skills.match("is the platform healthy, any capacity left?")[0].name == \
        "platform-health-check"
    assert p.skills.match("build a new support bot for the client")[0].name == \
        "launch-new-app"
    assert p.skills.match("start coding on our repo")[0].name == "open-dev-workspace"
    assert p.skills.match("tell me a joke") == (None, "keywords")


def test_skills_dir_loading_and_bad_folders(tmp_path):
    (tmp_path / "pool-watch").mkdir()
    (tmp_path / "pool-watch" / "SKILL.md").write_text(POOLS_ONLY)
    (tmp_path / "wrong-folder").mkdir()
    (tmp_path / "wrong-folder" / "SKILL.md").write_text(POOLS_ONLY)
    (tmp_path / "broken").mkdir()
    (tmp_path / "broken" / "SKILL.md").write_text("nope")
    lib = SkillLibrary(EmpirePlatform(), skills_dir=tmp_path)
    assert lib.global_skills["pool-watch"].origin == "dir"
    assert len(lib.load_errors) == 2


def test_named_run_goes_through_swarm_scoped_to_declared_tools():
    p = EmpirePlatform()
    tid = _live(p)
    out = p.skills.run(skill="launch-new-app", tenant_id=tid,
                       inputs={"app_name": "crm", "blueprint": "support-bot"})
    assert out["done"] and out["skill"] == "launch-new-app" and out["chosen_by"] == "named"
    assert out["steps"][1] == "scaffold app name=crm blueprint=support-bot"
    assert [t["metadata"]["agent"] for t in out["tasks"]] == ["foundry", "foundry", "factory"]
    crm = next(a for a in p.foundry.apps.values() if a.name == "crm")
    assert crm.tenant_id == tid and crm.blueprint == "support-bot"
    usage = p.metering.accounts[tid].usage
    assert usage["skill_run"] == 1 and usage["mcp_call"] == 3
    assert "skill.run" in [e.action for e in p.audit.events]
    assert p.audit.verify() == (True, None)


def test_skill_cannot_use_a_tool_it_did_not_declare():
    p = EmpirePlatform()
    sneaky = POOLS_ONLY.replace("1. show pool capacity",
                                "1. show pool capacity\n2. list blueprints")
    p.skills.install(sneaky)
    out = p.skills.run(skill="pool-watch")
    assert not out["done"]
    assert out["tasks"][-1]["status"]["state"] == "failed"
    assert "not enabled" in out["error"]


def test_goal_run_picks_skill_or_falls_back_to_plain_swarm():
    p = EmpirePlatform()
    hit = p.skills.run(goal="quick health check on the platform")
    assert hit["skill"] == "platform-health-check" and hit["done"]
    miss = p.skills.run(goal="list assistants")
    assert miss["skill"] is None and miss["done"]
    with pytest.raises(SkillError):
        p.skills.run()


class PickLLM(RuleLLM):
    def __init__(self, answer):
        self.answer = answer

    def complete(self, prompt):
        if prompt.startswith("SKILL_PICK:"):
            if self.answer is RuntimeError:
                raise RuntimeError("ollama down")
            return self.answer
        return super().complete(prompt)


def test_llm_skill_pick_with_fallback():
    p = EmpirePlatform(llm=PickLLM("platform-health-check"))
    assert p.skills.match("anything at all") == (
        p.skills.global_skills["platform-health-check"], "llm")
    p = EmpirePlatform(llm=PickLLM("none"))
    assert p.skills.match("is the platform healthy") == (None, "llm")
    p = EmpirePlatform(llm=PickLLM("made-up-skill"))  # unknown -> keywords
    assert p.skills.match("is the platform healthy")[1] == "keywords"
    p = EmpirePlatform(llm=PickLLM(RuntimeError))
    assert p.skills.match("is the platform healthy")[0].name == "platform-health-check"


def test_tenant_visibility_install_and_isolation():
    p = EmpirePlatform()
    narrow = _live(p, "Narrow", mcp_tools=["platform_snapshot", "factory_list_pools"])
    other = _live(p, "Other")
    assert {s.name for s in p.skills.visible(narrow)} == {"platform-health-check"}
    with pytest.raises(KeyError):  # hidden, not "forbidden": never reveal it exists
        p.skills.get("launch-new-app", narrow)
    with pytest.raises(KeyError):
        p.skills.run(skill="launch-new-app", tenant_id=narrow)

    mine = p.skills.install(POOLS_ONLY, narrow)
    assert mine.scope == "tenant" and mine.owner == narrow
    assert "pool-watch" in {s.name for s in p.skills.visible(narrow)}
    assert "pool-watch" not in {s.name for s in p.skills.visible(other)}
    with pytest.raises(KeyError):
        p.skills.run(skill="pool-watch", tenant_id=other)
    assert p.skills.run(skill="pool-watch", tenant_id=narrow)["done"]

    with pytest.raises(SkillError, match="not granted"):
        p.skills.install(POOLS_ONLY.replace("pool-watch", "x-bp")
                         .replace("[factory_list_pools]", "[foundry_list_blueprints]"), narrow)
    with pytest.raises(SkillError, match="platform skill name"):
        p.skills.install(POOLS_ONLY.replace("pool-watch", "platform-health-check"), narrow)
    with pytest.raises(SkillError, match="built-in"):
        p.skills.install(POOLS_ONLY.replace("pool-watch", "platform-health-check"))
    with pytest.raises(SkillError, match="built-in"):
        p.skills.remove("launch-new-app")
    p.skills.remove("pool-watch", narrow)
    with pytest.raises(KeyError):
        p.skills.remove("pool-watch", narrow)


def test_installed_skills_survive_restart(tmp_path):
    kw = {"audit_path": tmp_path / "a.jsonl", "state_path": tmp_path / "s.json"}
    p = EmpirePlatform(**kw)
    tid = _live(p)
    p.skills.install(POOLS_ONLY, tid)
    p.skills.install(POOLS_ONLY.replace("pool-watch", "ops-pools"))
    p.persist()
    q = EmpirePlatform(**kw)
    assert q.skills.get("pool-watch", tid).owner == tid
    assert q.skills.global_skills["ops-pools"].origin == "api"
    assert set(q.skills.global_skills) == BUILTINS | {"ops-pools"}
    assert q.skills.run(skill="pool-watch", tenant_id=tid)["done"]


# ---------------- REST ----------------
def test_rest_operator_and_tenant_skill_routes():
    app = FastAPI()
    app.include_router(router)
    c = TestClient(app)
    b = c.post("/api/v1/empire/onboarding", json={
        "client_name": "River", "contact_email": "it@river.test", "run_to_live": True,
        "mcp_tools": ["platform_snapshot", "factory_list_pools"]}).json()
    tid, key = b["tenant"]["id"], {"X-Tenant-Key": b["tenant_api_key"]}

    allskills = c.get("/api/v1/empire/skills").json()
    assert {s["name"] for s in allskills["skills"]} == BUILTINS
    src = c.get("/api/v1/empire/skills/launch-new-app").json()
    assert src["source"].startswith("---") and src["placeholders"] == ["app_name", "blueprint"]

    assert [s["name"] for s in c.get("/api/v1/empire/tenant/skills", headers=key).json()] == [
        "platform-health-check"]
    assert c.get("/api/v1/empire/tenant/skills/launch-new-app",
                 headers=key).status_code == 404
    assert c.post("/api/v1/empire/tenant/skills", headers=key,
                  json={"content": POOLS_ONLY}).status_code == 201
    assert c.post("/api/v1/empire/tenant/skills", headers=key,
                  json={"content": "---\nname: x\n---\n"}).status_code == 422
    run = c.post("/api/v1/empire/tenant/skills/run", headers=key,
                 json={"goal": "watch pool capacity"}).json()
    assert run["skill"] == "pool-watch" and run["done"]
    assert c.post("/api/v1/empire/tenant/skills/run", headers=key,
                  json={"skill": "launch-new-app"}).status_code == 404
    assert c.post("/api/v1/empire/tenant/skills/run",
                  json={"skill": "pool-watch"}).status_code == 401

    op = c.post("/api/v1/empire/skills/run", json={
        "skill": "open-dev-workspace", "inputs": {"repo": "nova/crm"}}).json()
    assert op["done"] and op["steps"][1].startswith("open session repo=nova/crm")
    assert c.post("/api/v1/empire/skills/run", json={
        "skill": "open-dev-workspace"}).status_code == 422  # repo required
    assert c.post("/api/v1/empire/skills/run", json={
        "skill": "open-dev-workspace", "inputs": {"repo": "x kind=ide"}}).status_code == 422
    assert c.get(f"/api/v1/empire/skills/pool-watch?owner={tid}").json()["owner"] == tid
    assert c.delete(f"/api/v1/empire/skills/pool-watch?owner={tid}").status_code == 200
    assert c.delete("/api/v1/empire/skills/launch-new-app").status_code == 422
    assert c.get("/api/v1/empire/snapshot").json()["skills"]["global"] == len(BUILTINS)


def test_standalone_service_guards_skill_routes(tmp_path):
    p = EmpirePlatform(audit_path=tmp_path / "a.jsonl", state_path=tmp_path / "s.json")
    c = TestClient(create_app(p, admin_key="op"))
    assert c.get("/api/v1/empire/skills").status_code == 401
    assert c.post("/api/v1/empire/skills", json={"content": POOLS_ONLY}).status_code == 401
    assert c.post("/api/v1/empire/skills", headers={"X-API-Key": "op"},
                  json={"content": POOLS_ONLY}).status_code == 201
    assert (tmp_path / "s.json").read_text().count("pool-watch") >= 1  # autosaved
