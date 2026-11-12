"""Alerting and escalation.

Sends JSON alerts to a configured webhook (Slack/Teams/ generic) when
critical incidents open, and escalates incidents whose auto-remediation
keeps failing. No-op when NRB_ALERT_WEBHOOK is unset.
"""
from __future__ import annotations

import asyncio
import json
import logging
import urllib.request

from app.core.config import settings
from app.core.models import Incident

log = logging.getLogger("alerter")

# device_id -> consecutive failed remediation cycles
_failed_cycles: dict[str, int] = {}
_escalated: set[str] = set()


async def send_alert(text: str, severity: str = "critical") -> bool:
    if not settings.alert_webhook:
        log.info("alert (no webhook configured): %s", text)
        return False
    payload = json.dumps({"text": text, "severity": severity}).encode()
    req = urllib.request.Request(
        settings.alert_webhook, data=payload, headers={"Content-Type": "application/json"}
    )
    try:
        await asyncio.to_thread(urllib.request.urlopen, req, timeout=5)
        return True
    except Exception as exc:
        log.error("alert webhook failed: %s", exc)
        return False


async def incident_opened(incident: Incident) -> None:
    await send_alert(f"🔴 Incident {incident.id}: {incident.message}")


async def remediation_failed(device_name: str, device_id: str) -> bool:
    """Track a failed remediation cycle; returns True if newly escalated."""
    count = _failed_cycles.get(device_id, 0) + 1
    _failed_cycles[device_id] = count
    if count >= settings.escalate_after and device_id not in _escalated:
        _escalated.add(device_id)
        await send_alert(
            f"🚨 ESCALATION: {device_name} still down after {count} auto-remediation "
            f"cycles. Human intervention required."
        )
        log.error("escalated %s after %d failed cycles", device_name, count)
        return True
    return False


def remediation_succeeded(device_id: str) -> None:
    _failed_cycles.pop(device_id, None)
    _escalated.discard(device_id)


def escalation_state() -> dict:
    return {
        "failed_cycles": dict(_failed_cycles),
        "escalated_devices": sorted(_escalated),
        "escalate_after": settings.escalate_after,
        "webhook_configured": bool(settings.alert_webhook),
    }
