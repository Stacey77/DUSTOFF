from __future__ import annotations

import asyncio
import ipaddress
import logging
import os
import socket
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_BASE_DELAY = 1.0  # seconds; doubles each retry
_ALLOW_PRIVATE_ENV = "WEBHOOK_ALLOW_PRIVATE"  # set to 1 to allow internal targets


class UnsafeWebhookURL(ValueError):
    """The webhook URL points at a private, loopback or otherwise internal address."""


def _blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast
            or ip.is_reserved or ip.is_unspecified)


def check_webhook_url(url: str, *, resolve: bool = False) -> None:
    """Reject non-http(s) URLs and URLs whose host is an internal address.

    With ``resolve=True`` the host name is looked up and every address it
    resolves to is checked too. A name that does not resolve is left to the
    HTTP client, which cannot connect to it either.
    """
    if os.environ.get(_ALLOW_PRIVATE_ENV) == "1":
        return
    parsed = httpx.URL(url)
    if parsed.scheme not in ("http", "https") or not parsed.host:
        raise UnsafeWebhookURL("webhook URL must be an absolute http(s) URL")
    host = parsed.host.rstrip(".").lower()
    if host == "localhost" or host.endswith(".localhost"):
        raise UnsafeWebhookURL("webhook URL may not target localhost")
    try:
        if _blocked_ip(ipaddress.ip_address(host)):
            raise UnsafeWebhookURL("webhook URL may not target an internal address")
        return
    except ValueError as exc:
        if isinstance(exc, UnsafeWebhookURL):
            raise
    if not resolve:
        return
    try:
        infos = socket.getaddrinfo(host, parsed.port or None, proto=socket.IPPROTO_TCP)
    except OSError:
        return
    for info in infos:
        if _blocked_ip(ipaddress.ip_address(info[4][0])):
            raise UnsafeWebhookURL("webhook URL resolves to an internal address")


class WebhookDispatcher:
    def __init__(self) -> None:
        self._webhooks: dict[str, dict[str, Any]] = {}

    def register(self, url: str, events: list[str]) -> str:
        check_webhook_url(url)
        webhook_id = str(uuid.uuid4())
        self._webhooks[webhook_id] = {
            "id": webhook_id,
            "url": url,
            "events": events,
            "created_at": datetime.now(UTC).isoformat(),
            "last_error": None,
            "delivery_count": 0,
            "failure_count": 0,
        }
        return webhook_id

    def unregister(self, webhook_id: str) -> bool:
        if webhook_id not in self._webhooks:
            return False
        del self._webhooks[webhook_id]
        return True

    def list_webhooks(self) -> list[dict[str, Any]]:
        return list(self._webhooks.values())

    async def dispatch(self, event: str, payload: dict[str, Any]) -> None:
        targets = [w for w in self._webhooks.values() if event in w["events"]]
        if not targets:
            return
        body = {"event": event, "payload": payload}
        await asyncio.gather(
            *[self._deliver(webhook, body) for webhook in targets],
            return_exceptions=True,
        )

    async def _deliver(self, webhook: dict[str, Any], body: dict[str, Any]) -> None:
        delay = _BASE_DELAY
        last_exc: Exception | None = None
        try:
            await asyncio.to_thread(check_webhook_url, webhook["url"], resolve=True)
        except UnsafeWebhookURL as exc:
            webhook["failure_count"] = webhook.get("failure_count", 0) + 1
            webhook["last_error"] = str(exc)
            logger.error("Webhook delivery refused (id=%s): %s", webhook["id"], exc)
            return
        async with httpx.AsyncClient(timeout=10.0) as client:
            for attempt in range(1, _MAX_RETRIES + 1):
                try:
                    resp = await client.post(webhook["url"], json=body)
                    resp.raise_for_status()
                    webhook["delivery_count"] = webhook.get("delivery_count", 0) + 1
                    webhook["last_error"] = None
                    logger.debug(
                        "Webhook delivered (id=%s event=%s attempt=%d status=%d)",
                        webhook["id"],
                        body.get("event"),
                        attempt,
                        resp.status_code,
                    )
                    return
                except Exception as exc:  # noqa: BLE001
                    last_exc = exc
                    logger.warning(
                        "Webhook delivery attempt %d/%d failed (id=%s url=%s): %s",
                        attempt,
                        _MAX_RETRIES,
                        webhook["id"],
                        webhook["url"],
                        exc,
                    )
                    if attempt < _MAX_RETRIES:
                        await asyncio.sleep(delay)
                        delay *= 2
        webhook["failure_count"] = webhook.get("failure_count", 0) + 1
        webhook["last_error"] = str(last_exc)
        logger.error(
            "Webhook delivery permanently failed after %d attempts (id=%s url=%s)",
            _MAX_RETRIES,
            webhook["id"],
            webhook["url"],
        )
