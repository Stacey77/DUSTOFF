"""Natural-language intent parser for chat and voice commands.

Understands commands like:
  "status" / "how is the network"
  "check router-1" / "ping core switch"
  "fix router-1" / "repair the dns server"
  "add device web-01 at 10.0.0.5 port 443"
  "remove web-01"
  "incidents" / "any problems"
  "history router-1"
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class Intent:
    name: str
    target: str | None = None
    args: dict[str, str] = field(default_factory=dict)
    confidence: float = 1.0


_ADD_RE = re.compile(
    r"add (?:device |host )?(?P<name>[\w\-\.]+)\s+(?:at|on|host)\s+(?P<host>[\w\.\-:]+)"
    r"(?:\s+port\s+(?P<port>\d+))?",
    re.IGNORECASE,
)


def parse(message: str) -> Intent:
    text = message.strip()
    low = text.lower()

    m = _ADD_RE.search(low)
    if m:
        return Intent(
            "add_device",
            args={k: v for k, v in m.groupdict().items() if v},
        )

    if low.startswith(("remove", "delete", "unregister")):
        target = low.split(maxsplit=1)[1] if " " in low else ""
        return Intent("remove_device", target=target.replace("device", "").strip())

    if any(w in low for w in ("incident", "problem", "alert", "issue")) and not any(
        w in low for w in ("fix", "repair", "check", "history")
    ):
        return Intent("list_incidents")

    if "history" in low or "latency" in low:
        target = low.replace("history", "").replace("latency", "").replace("for", "").strip()
        return Intent("history", target=target or None)

    if any(w in low for w in ("design", "architect", "blueprint")) or (
        "set up" in low or "setup" in low and "device" not in low
    ):
        return Intent("brain_goal")

    if any(w in low for w in ("what have you learned", "knowledge", "learning")):
        return Intent("brain_goal")

    if low.startswith(("fix", "repair", "remediate", "heal", "restart")):
        for kw in ("fix", "repair", "remediate", "heal", "restart"):
            low = low.replace(kw, "", 1)
        return Intent("remediate", target=low.strip() or None)

    if low.startswith(("check", "ping", "test", "probe")):
        for kw in ("check", "ping", "test", "probe"):
            low = low.replace(kw, "", 1)
        return Intent("check", target=low.strip() or None)

    if any(w in low for w in ("status", "overview", "summary", "how is", "how's")):
        return Intent("status")

    if any(w in low for w in ("list", "devices", "show all")):
        return Intent("list_devices")

    if any(w in low for w in ("help", "what can you do", "commands")):
        return Intent("help")

    return Intent("unknown", confidence=0.0)


HELP_TEXT = (
    "I can: report network status, list devices, check a device "
    "('check core-router'), fix a device ('fix dns-01'), add a device "
    "('add device web-01 at 10.0.0.5 port 443'), remove one, show open "
    "incidents, and show latency history ('history core-router'). "
    "My agent swarm can also: design systems ('design an enterprise network'), "
    "set up infrastructure ('set up the new branch network'), and learn from "
    "every repair ('what have you learned')."
)
