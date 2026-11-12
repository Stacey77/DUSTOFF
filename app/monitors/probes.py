"""Concrete network probes: ICMP ping (via OS), TCP connect, DNS resolution."""
from __future__ import annotations

import asyncio
import platform
import socket
import time

from app.core.models import CheckResult, Device, CheckType


async def ping(host: str, timeout: float = 2.0) -> tuple[bool, float | None, str]:
    """Ping via the OS ping command (works without raw-socket privileges)."""
    system = platform.system().lower()
    if system == "windows":
        cmd = ["ping", "-n", "1", "-w", str(int(timeout * 1000)), host]
    else:
        cmd = ["ping", "-c", "1", "-W", str(int(timeout)), host]
    start = time.perf_counter()
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout + 2)
    except (asyncio.TimeoutError, FileNotFoundError) as exc:
        return False, None, f"ping failed to run: {exc}"
    latency = (time.perf_counter() - start) * 1000
    text = out.decode(errors="ignore").lower()
    ok = proc.returncode == 0 and ("ttl=" in text or "ttl " in text)
    return ok, round(latency, 1) if ok else None, "ok" if ok else "no reply"


async def tcp_port(host: str, port: int, timeout: float = 2.0) -> tuple[bool, float | None, str]:
    start = time.perf_counter()
    try:
        reader, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout)
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        latency = (time.perf_counter() - start) * 1000
        return True, round(latency, 1), f"port {port} open"
    except (asyncio.TimeoutError, OSError) as exc:
        return False, None, f"port {port} closed/unreachable: {exc}"


async def dns_resolve(query: str, timeout: float = 3.0) -> tuple[bool, float | None, str]:
    start = time.perf_counter()
    try:
        loop = asyncio.get_running_loop()
        infos = await asyncio.wait_for(
            loop.getaddrinfo(query, None, family=socket.AF_INET), timeout
        )
        latency = (time.perf_counter() - start) * 1000
        addrs = sorted({i[4][0] for i in infos})
        return True, round(latency, 1), f"{query} -> {', '.join(addrs[:3])}"
    except (asyncio.TimeoutError, socket.gaierror) as exc:
        return False, None, f"dns resolution failed: {exc}"


async def run_check(device: Device) -> CheckResult:
    if device.check == CheckType.ping:
        ok, latency, detail = await ping(device.host)
    elif device.check == CheckType.tcp_port:
        ok, latency, detail = await tcp_port(device.host, device.port or 80)
    elif device.check == CheckType.dns:
        ok, latency, detail = await dns_resolve(device.dns_query or device.host)
    else:
        ok, latency, detail = False, None, f"unknown check type {device.check}"
    return CheckResult(device_id=device.id, ok=ok, latency_ms=latency, detail=detail)
