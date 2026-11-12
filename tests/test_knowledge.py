from app.agents.knowledge import KnowledgeBase


def test_record_and_recommend(tmp_path):
    kb = KnowledgeBase(tmp_path / "kb.json")
    kb.record("service", "restart_service", True)
    kb.record("service", "restart_service", True)
    kb.record("service", "flush_dns", False)
    action, rate = kb.recommend("service")
    assert action == "restart_service" and rate == 1.0


def test_recommend_unknown(tmp_path):
    kb = KnowledgeBase(tmp_path / "kb.json")
    assert kb.recommend("dns") == (None, 0.0)


def test_persistence_roundtrip(tmp_path):
    path = tmp_path / "kb.json"
    kb1 = KnowledgeBase(path)
    kb1.record("dns", "flush_dns", True)
    kb2 = KnowledgeBase(path)
    action, rate = kb2.recommend("dns")
    assert action == "flush_dns" and rate == 1.0


def test_stats(tmp_path):
    kb = KnowledgeBase(tmp_path / "kb.json")
    kb.record("reachability", "renew_dhcp", False)
    stats = kb.stats()
    assert stats["rules_learned"] == 1
    assert stats["entries"]["reachability|renew_dhcp"]["success_rate"] == 0.0
