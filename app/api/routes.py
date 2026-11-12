"""REST API routes and the chat/voice command handler."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.agents.base import swarm
from app.agents.brain import brain
from app.agents.knowledge import kb
from app.core import alerter
from app.core.auth import require_admin, require_viewer
from app.core.intents import HELP_TEXT, parse
from app.core.models import (
    ChatRequest,
    ChatResponse,
    CheckType,
    Device,
    DeviceStatus,
)
from app.core.state import store
from app.monitors.scheduler import check_device, latency_history
from app.remediation import engine

router = APIRouter(prefix="/api")


# ---------------- device & status endpoints ----------------

@router.get("/devices", dependencies=[Depends(require_viewer)])
def list_devices() -> list[dict]:
    out = []
    for d in store.devices.values():
        out.append(
            {
                **d.model_dump(),
                "status": store.status.get(d.id, DeviceStatus.unknown),
                "last": store.last_results.get(d.id).model_dump()
                if d.id in store.last_results
                else None,
            }
        )
    return out


@router.post("/devices", status_code=201, dependencies=[Depends(require_admin)])
def add_device(device: Device) -> dict:
    store.add_device(device)
    return device.model_dump()


@router.delete("/devices/{device_id}", dependencies=[Depends(require_admin)])
def remove_device(device_id: str) -> dict:
    d = store.find_device(device_id)
    if not d or not store.remove_device(d.id):
        raise HTTPException(404, "device not found")
    return {"removed": d.name}


@router.get("/status", dependencies=[Depends(require_viewer)])
def overall_status() -> dict:
    counts = {s.value: 0 for s in DeviceStatus}
    for s in store.status.values():
        counts[s.value] += 1
    return {
        "devices": len(store.devices),
        "by_status": counts,
        "open_incidents": len(store.open_incidents()),
    }


@router.get("/incidents", dependencies=[Depends(require_viewer)])
def incidents(open_only: bool = True) -> list[dict]:
    items = store.open_incidents() if open_only else list(store.incidents.values())
    return [i.model_dump() for i in items]


@router.post("/devices/{device_id}/check", dependencies=[Depends(require_admin)])
async def manual_check(device_id: str) -> dict:
    d = store.find_device(device_id)
    if not d:
        raise HTTPException(404, "device not found")
    await check_device(d.id)
    result = store.last_results[d.id]
    return {"device": d.name, **result.model_dump(), "status": store.status[d.id]}


@router.post("/devices/{device_id}/action/{action}", dependencies=[Depends(require_admin)])
async def run_remediation(device_id: str, action: str) -> dict:
    d = store.find_device(device_id)
    if not d:
        raise HTTPException(404, "device not found")
    result = await engine.run_action(d, action)
    if result is None:
        raise HTTPException(400, f"unknown action; available: {list(engine.AVAILABLE_ACTIONS)}")
    store.log_action(result)
    return result.model_dump()


@router.get("/devices/{device_id}/history", dependencies=[Depends(require_viewer)])
def history(device_id: str) -> dict:
    d = store.find_device(device_id)
    if not d:
        raise HTTPException(404, "device not found")
    return {"device": d.name, "latency_ms": latency_history(d.id)}


@router.get("/actions", dependencies=[Depends(require_viewer)])
def action_log() -> list[dict]:
    return [a.model_dump() for a in store.action_log]


# ---------------- brain & swarm endpoints ----------------

class GoalRequest(ChatRequest):
    pass


@router.post("/brain/goal", dependencies=[Depends(require_admin)])
async def submit_goal(req: GoalRequest) -> dict:
    result = await brain.pursue(req.message)
    return result.model_dump()


@router.get("/brain/goals", dependencies=[Depends(require_viewer)])
def goal_history() -> list[dict]:
    return [g.model_dump() for g in brain.goals.values()]


@router.get("/brain/knowledge", dependencies=[Depends(require_viewer)])
def knowledge() -> dict:
    return kb.stats()


@router.get("/agents", dependencies=[Depends(require_viewer)])
def agents() -> list[dict]:
    return swarm.roster()


@router.get("/agents/tasks", dependencies=[Depends(require_viewer)])
def agent_tasks() -> list[dict]:
    return [t.model_dump() for t in swarm.tasks.values()]


# ---------------- chat / voice command endpoint ----------------

@router.get("/alerts", dependencies=[Depends(require_viewer)])
def alert_state() -> dict:
    return alerter.escalation_state()


@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(require_admin)])
async def chat(req: ChatRequest) -> ChatResponse:
    intent = parse(req.message)

    if intent.name == "status":
        s = overall_status()
        open_inc = store.open_incidents()
        if open_inc:
            names = ", ".join(i.device_name for i in open_inc)
            reply = f"{s['devices']} devices monitored. {len(open_inc)} open incident(s): {names}."
        else:
            reply = f"All clear. {s['devices']} devices monitored, none down."
        return ChatResponse(reply=reply, data=s)

    if intent.name == "list_devices":
        devices = list_devices()
        if not devices:
            return ChatResponse(reply="No devices registered yet.")
        lines = [f"{d['name']} ({d['host']}) - {d['status']}" for d in devices]
        return ChatResponse(reply="; ".join(lines), data={"devices": devices})

    if intent.name == "add_device":
        name = intent.args["name"]
        host = intent.args["host"]
        port = int(intent.args["port"]) if "port" in intent.args else None
        device = Device(
            name=name,
            host=host,
            port=port,
            check=CheckType.tcp_port if port else CheckType.ping,
        )
        store.add_device(device)
        check = f"TCP port {port}" if port else "ping"
        return ChatResponse(
            reply=f"Added {name} at {host}, monitoring via {check}.",
            data=device.model_dump(),
        )

    if intent.name == "remove_device":
        d = store.find_device(intent.target or "")
        if not d:
            return ChatResponse(reply=f"I couldn't find a device matching '{intent.target}'.")
        store.remove_device(d.id)
        return ChatResponse(reply=f"Removed {d.name}.")

    if intent.name == "check":
        d = store.find_device(intent.target or "")
        if not d:
            return ChatResponse(reply=f"I couldn't find a device matching '{intent.target}'.")
        await check_device(d.id)
        r = store.last_results[d.id]
        state = store.status[d.id].value
        lat = f" at {r.latency_ms} ms" if r.latency_ms is not None else ""
        return ChatResponse(
            reply=f"{d.name} is {state}{lat}. {r.detail}",
            data=r.model_dump(),
        )

    if intent.name == "remediate":
        d = store.find_device(intent.target or "")
        if not d:
            return ChatResponse(reply=f"I couldn't find a device matching '{intent.target}'.")
        # pick the same heuristic as the auto engine
        from app.core.models import CheckResult, Incident, Severity

        fake_result = CheckResult(device_id=d.id, ok=False, detail="manual request")
        fake_inc = Incident(
            device_id=d.id, device_name=d.name,
            severity=Severity.warning, message="manual remediation via chat",
        )
        actions = await engine.auto_remediate(d, fake_result, fake_inc)
        for a in actions:
            store.log_action(a)
        ok = all(a.success for a in actions)
        names = ", ".join(a.action for a in actions)
        await check_device(d.id)
        state = store.status[d.id].value
        return ChatResponse(
            reply=f"Ran {names} on {d.name} ({'succeeded' if ok else 'failed'}). Current state: {state}."
        )

    if intent.name == "list_incidents":
        open_inc = store.open_incidents()
        if not open_inc:
            return ChatResponse(reply="No open incidents.")
        lines = [f"{i.device_name}: {i.message}" for i in open_inc]
        return ChatResponse(reply=" | ".join(lines), data={"incidents": [i.model_dump() for i in open_inc]})

    if intent.name == "history":
        d = store.find_device(intent.target or "")
        if not d:
            return ChatResponse(reply=f"I couldn't find a device matching '{intent.target}'.")
        hist = latency_history(d.id)
        if not hist:
            return ChatResponse(reply=f"No latency samples for {d.name} yet.")
        avg = sum(hist) / len(hist)
        return ChatResponse(
            reply=f"{d.name}: {len(hist)} samples, avg {avg:.1f} ms, min {min(hist):.1f}, max {max(hist):.1f}.",
            data={"latency_ms": hist},
        )

    if intent.name == "brain_goal":
        result = await brain.pursue(req.message)
        return ChatResponse(reply=result.summary, data=result.model_dump())

    if intent.name == "help":
        return ChatResponse(reply=HELP_TEXT)

    return ChatResponse(
        reply="I didn't understand that. Say 'help' to hear what I can do.",
    )
