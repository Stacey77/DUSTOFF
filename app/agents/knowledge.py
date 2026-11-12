"""Persistent knowledge base for the Learning agent.

Records outcomes of remediation/setup/execution attempts keyed by
(failure_type, action). The swarm consults it to recommend the action
with the best historical success rate. Stored as JSON so knowledge
survives restarts.
"""
from __future__ import annotations

import json
import threading
import time
from pathlib import Path

from app.core.config import settings

KB_FILE = settings.knowledge_file


class KnowledgeBase:
    def __init__(self, path: Path = KB_FILE) -> None:
        self._lock = threading.RLock()
        self._path = path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._entries: dict[str, dict] = {}
        self._episodes: list[dict] = []
        self._load()

    def _load(self) -> None:
        if self._path.exists():
            try:
                raw = json.loads(self._path.read_text(encoding="utf-8"))
                self._entries = raw.get("entries", {})
                self._episodes = raw.get("episodes", [])
            except Exception:
                self._entries, self._episodes = {}, []

    def _save(self) -> None:
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(
            json.dumps({"entries": self._entries, "episodes": self._episodes}, indent=2),
            encoding="utf-8",
        )
        tmp.replace(self._path)

    def record(self, failure_type: str, action: str, success: bool, context: str = "") -> None:
        with self._lock:
            key = f"{failure_type}|{action}"
            e = self._entries.setdefault(key, {"attempts": 0, "successes": 0, "last_seen": 0.0})
            e["attempts"] += 1
            e["successes"] += 1 if success else 0
            e["last_seen"] = time.time()
            self._episodes.append(
                {
                    "ts": time.time(),
                    "failure_type": failure_type,
                    "action": action,
                    "success": success,
                    "context": context[:200],
                }
            )
            del self._episodes[:-1000]
            self._save()

    def recommend(self, failure_type: str) -> tuple[str | None, float]:
        """Return (best_action, success_rate) for a failure type, or (None, 0)."""
        best_action, best_rate = None, 0.0
        with self._lock:
            for key, e in self._entries.items():
                ft, action = key.split("|", 1)
                if ft != failure_type or e["attempts"] == 0:
                    continue
                rate = e["successes"] / e["attempts"]
                if rate > best_rate:
                    best_action, best_rate = action, rate
        return best_action, round(best_rate, 2)

    def stats(self) -> dict:
        with self._lock:
            learned = {
                k: {"attempts": v["attempts"], "success_rate": round(v["successes"] / v["attempts"], 2)}
                for k, v in self._entries.items()
                if v["attempts"]
            }
            return {"rules_learned": len(learned), "entries": learned,
                    "recent_episodes": self._episodes[-10:]}


kb = KnowledgeBase()
