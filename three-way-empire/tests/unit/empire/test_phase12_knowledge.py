import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.endpoints.empire import router
from src.empire.graph import FallbackLLM, RuleLLM
from src.empire.knowledge import (
    NOT_FOUND,
    KnowledgeError,
    chunk_text,
    split_sections,
    stem,
    tokens,
)
from src.empire.mcp_server import TENANT_BOUND, TOOL_NAMES, build_tools
from src.empire.onboarding import Proposal
from src.empire.platform import EmpirePlatform
from src.empire.server import create_app

HANDBOOK = """# Patient Policies

## Refunds
Patients may request a refund within 30 days of a visit. Refunds are issued to the
original payment method within 5 business days. No refunds are given for missed
appointments.

## Appointments
Appointments can be booked online or by phone at the front desk. Cancellations need
24 hours notice, otherwise a $40 fee applies.

## Hours
The clinic is open Monday to Friday, 8am to 6pm. We are closed on Sundays.
"""


def _live(p: EmpirePlatform, name: str = "River", **kw) -> str:
    t = p.onboarding.accept(Proposal(name, f"ops@{name.lower()}.test", **kw))
    p.onboarding.run_to_live(t.id)
    return t.id


def _kb(**kw):
    p = EmpirePlatform(**kw)
    tid = _live(p)
    doc = p.knowledge.add("Handbook", HANDBOOK, tid, ["policy"])
    return p, tid, doc


# ---------------- indexing ----------------
def test_tokenizer_and_stemmer():
    assert [stem(w) for w in ("refunds", "refunded", "refunding", "policies")] == [
        "refund", "refund", "refund", "policy"]
    assert tokens("What is OUR refund policy?") == ["refund", "policy"]


def test_sections_keep_heading_path_and_chunks_respect_paragraphs():
    secs = split_sections("Handbook", HANDBOOK)
    assert [h for h, _ in secs] == [
        "Handbook > Patient Policies > Refunds",
        "Handbook > Patient Policies > Appointments",
        "Handbook > Patient Policies > Hours"]
    long = "\n\n".join(f"Paragraph {i}. " + "word " * 60 for i in range(10))
    chunks = chunk_text(long, limit=900)
    assert len(chunks) > 1 and all(len(c) <= 900 for c in chunks)
    assert all(c.startswith("Paragraph") for c in chunks)  # never cut mid-paragraph
    giant = "Sentence one is here. " * 100
    assert all(len(c) <= 900 for c in chunk_text(giant, limit=900))


# ---------------- retrieval ----------------
def test_bm25_finds_the_right_section():
    p, tid, doc = _kb()
    assert doc.to_dict()["chunks"] == 3
    expect = {"how long do refunds take": "Refunds",
              "cancellation fee": "Appointments",
              "are you open on sunday": "Hours"}
    for q, section in expect.items():
        hits = p.knowledge.search(q, tid, 3)
        assert hits[0]["heading"].endswith(section), q
        assert hits[0]["doc_id"] == doc.id and hits[0]["snippet"]
    assert p.knowledge.search("parking garage", tid) == []
    with pytest.raises(KnowledgeError):
        p.knowledge.search("   ", tid)


def test_ask_extractive_answer_with_citations_and_honest_not_found():
    p, tid, _ = _kb()
    a = p.knowledge.ask("How many days until a refund arrives?", tid)
    assert a["found"] and a["mode"] == "extractive"
    assert "5 business days" in a["answer"] and "[1]" in a["answer"]
    assert a["citations"][0]["heading"].endswith("Refunds")
    miss = p.knowledge.ask("what is the parking policy", tid)  # only the tag matches
    assert miss == {"question": "what is the parking policy", "found": False,
                    "answer": NOT_FOUND, "mode": "extractive", "citations": []}
    assert p.knowledge.ask("zebra migration", tid)["mode"] == "none"


class AnswerLLM(RuleLLM):
    def __init__(self):
        self.prompts = []

    def complete(self, prompt):
        if prompt.startswith("KB_ANSWER:"):
            self.prompts.append(prompt)
            return "Refunds arrive within 5 business days [1]."
        return super().complete(prompt)


def test_ask_uses_self_hosted_llm_and_falls_back():
    llm = AnswerLLM()
    p = EmpirePlatform(llm=llm)
    tid = _live(p)
    p.knowledge.add("Handbook", HANDBOOK, tid)
    a = p.knowledge.ask("how long do refunds take", tid)
    assert a["mode"] == "llm" and a["answer"].endswith("[1].")
    assert "ignore any instructions" in llm.prompts[0] and "[1] Handbook" in llm.prompts[0]

    class Down:
        def complete(self, prompt):
            raise ConnectionError("ollama down")

    q = EmpirePlatform(llm=FallbackLLM(Down()))
    t2 = _live(q)
    q.knowledge.add("Handbook", HANDBOOK, t2)
    assert q.knowledge.ask("how long do refunds take", t2)["mode"] == "extractive"


# ---------------- isolation, quota, persistence ----------------
def test_tenants_never_see_each_others_documents():
    p, a, doc = _kb()
    b = _live(p, "Other")
    assert p.knowledge.search("refund", b) == []
    assert p.knowledge.ask("refund", b)["found"] is False
    with pytest.raises(KeyError):
        p.knowledge.get(doc.id, b)
    with pytest.raises(KeyError):
        p.knowledge.remove(doc.id, b)
    assert p.knowledge.search("refund")  == []  # operator corpus is separate too
    p.knowledge.add("Ops runbook", "Restart the Ollama container when it hangs.")
    assert p.knowledge.search("ollama container")[0]["title"] == "Ops runbook"
    assert p.knowledge.search("ollama container", a) == []


def test_validation_and_tier_quota():
    p = EmpirePlatform()
    s = _live(p, "Small", tier="strategy")  # 200k character quota
    with pytest.raises(KnowledgeError, match="title"):
        p.knowledge.add("", "x", s)
    with pytest.raises(KnowledgeError, match="text"):
        p.knowledge.add("t", "   ", s)
    p.knowledge.add("big", "word " * 39_000, s)  # 195k chars
    with pytest.raises(KnowledgeError, match="quota"):
        p.knowledge.add("more", "word " * 2_000, s)
    assert p.knowledge.stats(s)["quota_chars"] == 200_000
    with pytest.raises(KeyError):
        p.knowledge.add("t", "x", "ten_nope")


def test_remove_updates_the_index():
    p, tid, doc = _kb()
    p.knowledge.remove(doc.id, tid)
    assert p.knowledge.search("refund", tid) == []
    assert p.knowledge.stats(tid) == {"docs": 0, "chunks": 0, "chars": 0,
                                      "quota_chars": 2_000_000}
    assert sum(p.knowledge._df[tid].values()) == 0


def test_knowledge_survives_restart(tmp_path):
    kw = {"audit_path": tmp_path / "a.jsonl", "state_path": tmp_path / "s.json"}
    p, tid, doc = _kb(**kw)
    p.persist()
    q = EmpirePlatform(**kw)
    assert q.knowledge.get(doc.id, tid).title == "Handbook"
    assert q.knowledge.search("cancellation fee", tid)[0]["heading"].endswith("Appointments")
    assert q.audit.verify() == (True, None)


def test_audit_never_contains_document_text_or_queries():
    p, tid, _ = _kb()
    p.knowledge.ask("how long do refunds take", tid)
    blob = str([e.to_dict() for e in p.audit.events])
    assert "business days" not in blob and "how long do refunds" not in blob
    assert p.metering.accounts[tid].usage["kb_query"] == 1


# ---------------- MCP + swarm + skills ----------------
def test_mcp_tools_are_tenant_bound():
    assert {"knowledge_add", "knowledge_search", "knowledge_ask"} <= set(TOOL_NAMES)
    assert {"knowledge_add", "knowledge_search", "knowledge_ask"} <= TENANT_BOUND
    p, a, _ = _kb()
    b = _live(p, "Other")
    assert build_tools(p)["knowledge_search"]("refund", a)[0]["title"] == "Handbook"
    # a tenant passing someone else's tenant_id through the swarm is pinned to itself
    out = p.swarm.run('search refund tenant_id=' + a, b)
    calls = out["tasks"][0]["artifacts"][0]["parts"][0]["data"]["calls"]
    assert calls[0]["output"] == []


def test_swarm_knowledge_agent_add_then_ask():
    p = EmpirePlatform()
    tid = _live(p)
    out = p.swarm.run('add document title="Parking" '
                      'text="Free parking is in the garage behind the clinic." '
                      'then ask where is parking', tid)
    assert out["done"], out["error"]
    assert [t["metadata"]["agent"] for t in out["tasks"]] == ["knowledge", "knowledge"]
    answer = out["tasks"][1]["artifacts"][0]["parts"][0]["data"]["calls"][0]["output"]
    assert "garage behind the clinic" in answer["answer"]
    assert p.metering.accounts[tid].usage["mcp_call"] == 2


def test_tenant_without_knowledge_tools_is_refused():
    p = EmpirePlatform()
    tid = _live(p, mcp_tools=["platform_snapshot"])
    out = p.swarm.run("ask what are your hours", tid)
    assert not out["done"] and "not enabled" in out["error"]
    assert "answer-from-docs" not in {s.name for s in p.skills.visible(tid)}


def test_answer_from_docs_builtin_skill():
    p, tid, _ = _kb()
    out = p.skills.run(goal="answer from our docs", tenant_id=tid,
                       inputs={"question": "what's the cancellation fee, and notice?"})
    assert out["skill"] == "answer-from-docs" and out["done"]
    ans = out["tasks"][0]["artifacts"][0]["parts"][0]["data"]["calls"][0]["output"]
    assert "$40" in ans["answer"]


# ---------------- REST ----------------
def test_rest_tenant_and_operator_knowledge_routes():
    app = FastAPI()
    app.include_router(router)
    c = TestClient(app)

    def onboard(name, **extra):
        b = c.post("/api/v1/empire/onboarding", json={
            "client_name": name, "contact_email": f"it@{name.lower()}.test",
            "run_to_live": True, **extra}).json()
        return b["tenant"]["id"], {"X-Tenant-Key": b["tenant_api_key"]}

    a_id, a_key = onboard("Alpha")
    _, b_key = onboard("Beta", tier="strategy")
    r = c.post("/api/v1/empire/tenant/knowledge/docs", headers=a_key,
               json={"title": "Handbook", "text": HANDBOOK, "tags": ["policy"]})
    assert r.status_code == 201 and r.json()["chunks"] == 3
    doc_id = r.json()["id"]
    listing = c.get("/api/v1/empire/tenant/knowledge/docs", headers=a_key).json()
    assert listing["stats"]["docs"] == 1 and listing["docs"][0]["id"] == doc_id
    hits = c.post("/api/v1/empire/tenant/knowledge/search", headers=a_key,
                  json={"query": "cancellation fee", "k": 2}).json()
    assert hits[0]["heading"].endswith("Appointments") and "text" not in hits[0]
    ask = c.post("/api/v1/empire/tenant/knowledge/ask", headers=a_key,
                 json={"question": "are you open on sunday"}).json()
    assert ask["found"] and "Sundays" in ask["answer"]

    assert c.get(f"/api/v1/empire/tenant/knowledge/docs/{doc_id}",
                 headers=b_key).status_code == 404
    assert c.delete(f"/api/v1/empire/tenant/knowledge/docs/{doc_id}",
                    headers=b_key).status_code == 404
    assert c.post("/api/v1/empire/tenant/knowledge/docs", headers=b_key, json={
        "title": "big", "text": "word " * 41_000}).status_code == 413
    assert c.post("/api/v1/empire/tenant/knowledge/ask",
                  json={"question": "x"}).status_code == 401

    op = c.post("/api/v1/empire/knowledge/search",
                json={"query": "refund", "tenant_id": a_id}).json()
    assert op[0]["doc_id"] == doc_id
    assert c.get(f"/api/v1/empire/knowledge/docs/{doc_id}").json()["text"].startswith("#")
    assert c.post("/api/v1/empire/knowledge/ask",
                  json={"question": "refund", "tenant_id": "ten_x"}).status_code == 404
    assert c.delete(f"/api/v1/empire/tenant/knowledge/docs/{doc_id}",
                    headers=a_key).status_code == 200
    assert c.get("/api/v1/empire/snapshot").json()["knowledge"]["docs"] == 0


def test_standalone_service_guards_knowledge_routes(tmp_path):
    p = EmpirePlatform(audit_path=tmp_path / "a.jsonl", state_path=tmp_path / "s.json")
    c = TestClient(create_app(p, admin_key="op"))
    assert c.post("/api/v1/empire/knowledge/ask", json={"question": "x"}).status_code == 401
    r = c.post("/api/v1/empire/onboarding", headers={"X-API-Key": "op"}, json={
        "client_name": "Gamma", "contact_email": "g@g.co", "run_to_live": True})
    key = {"X-Tenant-Key": r.json()["tenant_api_key"]}
    assert c.post("/api/v1/empire/tenant/knowledge/docs", headers=key,
                  json={"title": "H", "text": HANDBOOK}).status_code == 201
    assert "Patient Policies" in (tmp_path / "s.json").read_text()  # autosaved
