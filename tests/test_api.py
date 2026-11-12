"""API tests via FastAPI TestClient (no live monitoring loop)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:  # lifespan runs: seeds devices, registers swarm
        yield c


def test_index_serves(client):
    r = client.get("/")
    assert r.status_code == 200 and "Network Repair Bot" in r.text


def test_status(client):
    r = client.get("/api/status")
    assert r.status_code == 200
    assert r.json()["devices"] >= 3


def test_agents_roster(client):
    names = {a["name"] for a in client.get("/api/agents").json()}
    assert names == {"repair", "setup", "execution", "learning", "design"}


def test_add_and_remove_device(client):
    r = client.post("/api/devices", json={"name": "t-dev", "host": "10.1.2.3", "check": "ping"})
    assert r.status_code == 201
    dev_id = r.json()["id"]
    assert any(d["name"] == "t-dev" for d in client.get("/api/devices").json())
    assert client.delete(f"/api/devices/{dev_id}").status_code == 200


def test_chat_status(client):
    r = client.post("/api/chat", json={"message": "status"})
    assert r.status_code == 200
    assert "devices monitored" in r.json()["reply"]


def test_chat_add_via_natural_language(client):
    r = client.post("/api/chat", json={"message": "add device nl-test at 10.4.4.4 port 8443"})
    assert "Added nl-test" in r.json()["reply"]
    client.post("/api/chat", json={"message": "remove nl-test"})


def test_brain_goal_design(client):
    r = client.post("/api/brain/goal", json={"message": "design a small branch network"})
    assert r.status_code == 200
    body = r.json()
    assert any(t["kind"] == "design" and t["status"] == "done" for t in body["tasks"])


def test_device_404(client):
    assert client.get("/api/devices/nonexistent/history").status_code == 404


def test_alerts_endpoint(client):
    body = client.get("/api/alerts").json()
    assert "escalate_after" in body and "webhook_configured" in body
