"""Background monitoring loop: periodically probes all registered devices,
tracks consecutive failures, opens incidents, and triggers auto-remediation."""
from __future__ import annotations

import asyncio
import logging

from app.core import alerter
from app.core.config import settings
from app.core.models import DeviceStatus, Incident, Severity
from app.core.state import store
from app.monitors.probes import run_check
from app.remediation import engine

log = logging.getLogger("monitor")

_fail_counts: dict[str, int] = {}
_latency_history: dict[str, list[float]] = {}
DEGRADE_LATENCY_MS = settings.degrade_latency_ms
FAIL_THRESHOLD = settings.fail_threshold


async def check_device(device_id: str) -> None:
    device = store.devices.get(device_id)
    if not device:
        return
    result = await run_check(device)
    fails = _fail_counts.get(device_id, 0)

    if result.ok:
        fails = 0
        if result.latency_ms is not None:
            hist = _latency_history.setdefault(device_id, [])
            hist.append(result.latency_ms)
            del hist[:-50]
            status = (
                DeviceStatus.degraded
                if result.latency_ms > DEGRADE_LATENCY_MS
                else DeviceStatus.healthy
            )
        else:
            status = DeviceStatus.healthy
        store.record_result(result, status)
        resolved = store.resolve_incidents_for(device_id)
        alerter.remediation_succeeded(device_id)
        if resolved:
            log.info("auto-resolved %d incident(s) for %s", resolved, device.name)
    else:
        fails += 1
        status = DeviceStatus.down if fails >= FAIL_THRESHOLD else DeviceStatus.degraded
        store.record_result(result, status)
        if fails == FAIL_THRESHOLD:
            inc = store.open_incident(
                Incident(
                    device_id=device_id,
                    device_name=device.name,
                    severity=Severity.critical,
                    message=f"{device.name} unreachable: {result.detail}",
                )
            )
            log.warning("incident %s opened for %s", inc.id, device.name)
            await alerter.incident_opened(inc)
            actions = await engine.auto_remediate(device, result, inc)
            if actions:
                inc.auto_actions.extend(a.action for a in actions)
                for a in actions:
                    store.log_action(a)
                if not all(a.success for a in actions):
                    await alerter.remediation_failed(device.name, device_id)
        elif fails > FAIL_THRESHOLD:
            # remediation was already attempted and the device is still down
            await alerter.remediation_failed(device.name, device_id)
    _fail_counts[device_id] = fails


async def monitoring_loop(interval: float = 30.0) -> None:
    log.info("monitoring loop started (interval=%ss)", interval)
    while True:
        try:
            ids = list(store.devices.keys())
            if ids:
                await asyncio.gather(*(check_device(i) for i in ids), return_exceptions=True)
        except Exception:
            log.exception("monitoring tick failed")
        await asyncio.sleep(interval)


def latency_history(device_id: str) -> list[float]:
    return list(_latency_history.get(device_id, []))
