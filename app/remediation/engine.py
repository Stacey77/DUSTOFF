"""Rule-based auto-remediation engine.

Each rule inspects the failed check and optionally runs a safe, dry-run-able
corrective action. Actions are SIMULATED by default (SAFE_MODE=True) so the
bot can be demoed without touching the real network. Set SAFE_MODE=False to
execute real commands.
"""
from __future__ import annotations

import asyncio
import logging
import platform
import re

from app.core.config import settings
from app.core.models import ActionResult, CheckResult, CheckType, Device, Incident

log = logging.getLogger("remediation")

SAFE_MODE = settings.safe_mode  # simulate actions instead of executing them


async def _run(cmd: list[str]) -> tuple[bool, str]:
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
        return proc.returncode == 0, out.decode(errors="ignore")[:500]
    except Exception as exc:
        return False, str(exc)


async def _simulate(name: str) -> tuple[bool, str]:
    return True, f"[simulated] {name} completed"


async def flush_dns(device: Device) -> ActionResult:
    name = "flush_dns"
    if SAFE_MODE:
        ok, out = await _simulate(name)
    elif platform.system().lower() == "windows":
        ok, out = await _run(["ipconfig", "/flushdns"])
    else:
        ok, out = await _run(["resolvectl", "flush-caches"])
    return ActionResult(action=name, device_id=device.id, success=ok, output=out)


async def restart_service(device: Device, service: str = "networking") -> ActionResult:
    name = f"restart_service:{service}"
    if SAFE_MODE:
        ok, out = await _simulate(name)
    elif platform.system().lower() == "windows":
        ok, out = await _run(["net", "stop", service])
        if ok:
            ok, out = await _run(["net", "start", service])
    else:
        ok, out = await _run(["systemctl", "restart", service])
    return ActionResult(action=name, device_id=device.id, success=ok, output=out)


async def renew_dhcp(device: Device) -> ActionResult:
    name = "renew_dhcp"
    if SAFE_MODE:
        ok, out = await _simulate(name)
    elif platform.system().lower() == "windows":
        ok, out = await _run(["ipconfig", "/renew"])
    else:
        ok, out = await _run(["dhclient", "-r"])
    return ActionResult(action=name, device_id=device.id, success=ok, output=out)


async def auto_remediate(
    device: Device, result: CheckResult, incident: Incident
) -> list[ActionResult]:
    """Pick remediation actions based on the failing check type."""
    actions: list[ActionResult] = []
    if device.check == CheckType.dns:
        actions.append(await flush_dns(device))
    elif device.check == CheckType.tcp_port:
        actions.append(await restart_service(device))
    else:  # ping / reachability
        actions.append(await renew_dhcp(device))
    for a in actions:
        level = log.info if a.success else log.error
        level("auto-remediate %s on %s -> %s", a.action, device.name, a.success)
    return actions


AVAILABLE_ACTIONS = {
    "flush_dns": flush_dns,
    "restart_service": restart_service,
    "renew_dhcp": renew_dhcp,
}

# Ordered fallback chains per failure type. The first entry is the default heuristic.
FALLBACK_CHAINS: dict[str, list[str]] = {
    "dns": ["flush_dns", "restart_service:networking"],
    "service": ["restart_service:networking", "flush_dns"],
    "reachability": ["renew_dhcp", "restart_service:networking"],
}

_SERVICE_RE = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")


def parse_action(action: str) -> tuple[str, str | None]:
    """Split 'restart_service:networking' into ('restart_service', 'networking')."""
    base, _, arg = action.partition(":")
    return base, (arg or None)


def is_known_action(action: str) -> bool:
    base, arg = parse_action(action)
    if base not in AVAILABLE_ACTIONS:
        return False
    return arg is None or (base == "restart_service" and bool(_SERVICE_RE.match(arg)))


def candidates_for(failure_type: str, learned: str | None = None) -> list[str]:
    """Learned action first (if it is a real remediation action), then the fallback chain."""
    ordered = [learned] if learned and is_known_action(learned) else []
    ordered += FALLBACK_CHAINS.get(failure_type, [])
    seen: set[str] = set()
    return [a for a in ordered if not (a in seen or seen.add(a))]


async def run_action(device: Device, action: str) -> ActionResult | None:
    base, arg = parse_action(action)
    fn = AVAILABLE_ACTIONS.get(base)
    if not fn:
        return None
    if base == "restart_service":
        service = arg or "networking"
        if not _SERVICE_RE.match(service):
            return ActionResult(action=action, device_id=device.id, success=False,
                                output="invalid service name")
        return await restart_service(device, service)
    if arg is not None:
        return None
    return await fn(device)
