"""Alerts: always logged; also POSTed to a webhook when ALERT_WEBHOOK_URL is set.

The payload is {"text": ...}, which Slack incoming webhooks accept. Discord needs "content"
instead, so change the key if you point this at Discord.
"""
from __future__ import annotations

import json
import logging
import urllib.request

log = logging.getLogger("bagbot2.alerts")


def send_alert(title: str, message: str, webhook_url: str = "") -> None:
    log.warning("ALERT %s: %s", title, message)
    if not webhook_url:
        return
    body = json.dumps({"text": f"[BAGBOT2] {title}: {message}"}).encode()
    req = urllib.request.Request(webhook_url, data=body, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=10).close()
    except Exception as exc:  # alerting must never crash trading
        log.error("alert delivery failed: %s", exc)
