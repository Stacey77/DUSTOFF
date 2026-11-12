from app.agents.brain import Brain
from app.agents.base import Swarm
from app.core.models import CheckType, Device
from app.core.state import store


def _brain() -> Brain:
    return Brain(Swarm())


def test_plan_design_and_setup():
    brain = _brain()
    kinds = [t.kind for t in brain._plan("design an enterprise network and set up the branch")]
    assert "design" in kinds and "setup" in kinds


def test_plan_repair_appends_learn():
    brain = _brain()
    kinds = [t.kind for t in brain._plan("repair the core switch")]
    assert "repair" in kinds and "learn" in kinds


def test_plan_execute_parses_action_and_device():
    brain = _brain()
    tasks = brain._plan("run renew_dhcp on core-router")
    exe = [t for t in tasks if t.kind == "execute"]
    assert exe and exe[0].params == {"action": "renew_dhcp", "device": "core-router"}


def test_extract_device_prefers_registered():
    d = store.add_device(Device(name="sw-42", host="10.9.9.9", check=CheckType.ping))
    try:
        assert Brain._extract_device("please repair sw-42 now") == "sw-42"
        assert Brain._extract_device("repair 10.9.9.9") == "sw-42"
    finally:
        store.remove_device(d.id)


def test_extract_device_ignores_stopwords():
    assert Brain._extract_device("set up the branch and design it") is None


def test_fallback_is_learn():
    brain = _brain()
    tasks = brain._plan("flibberty gibbet")
    assert len(tasks) == 1 and tasks[0].kind == "learn"
