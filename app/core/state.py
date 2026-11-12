"""In-memory state store with JSON persistence for the device registry."""
from __future__ import annotations

import json
import threading
from collections import deque

from app.core.config import settings
from app.core.models import ActionResult, CheckResult, Device, DeviceStatus, Incident


class StateStore:
    def __init__(self, max_events: int = 500) -> None:
        self._lock = threading.RLock()
        self.devices: dict[str, Device] = {}
        self.status: dict[str, DeviceStatus] = {}
        self.last_results: dict[str, CheckResult] = {}
        self.incidents: dict[str, Incident] = {}
        self.action_log: deque[ActionResult] = deque(maxlen=max_events)

    # ---- devices ----
    def add_device(self, device: Device, persist: bool = True) -> Device:
        with self._lock:
            self.devices[device.id] = device
            self.status[device.id] = DeviceStatus.unknown
            if persist:
                self._save_devices()
        return device

    def remove_device(self, device_id: str) -> bool:
        with self._lock:
            if device_id not in self.devices:
                return False
            del self.devices[device_id]
            self.status.pop(device_id, None)
            self.last_results.pop(device_id, None)
            self._save_devices()
            return True

    def _save_devices(self) -> None:
        tmp = settings.devices_file.with_suffix(".tmp")
        tmp.write_text(
            json.dumps([d.model_dump() for d in self.devices.values()], indent=2),
            encoding="utf-8",
        )
        tmp.replace(settings.devices_file)

    def load_devices(self) -> int:
        if not settings.devices_file.exists():
            return 0
        try:
            raw = json.loads(settings.devices_file.read_text(encoding="utf-8"))
        except Exception:
            return 0
        count = 0
        for item in raw:
            try:
                self.add_device(Device(**item), persist=False)
                count += 1
            except Exception:
                continue
        return count

    def find_device(self, name_or_id: str) -> Device | None:
        with self._lock:
            if name_or_id in self.devices:
                return self.devices[name_or_id]
            lowered = name_or_id.lower()
            for d in self.devices.values():
                if lowered in d.name.lower() or lowered in d.host.lower():
                    return d
        return None

    # ---- results / status ----
    def record_result(self, result: CheckResult, status: DeviceStatus) -> None:
        with self._lock:
            self.last_results[result.device_id] = result
            self.status[result.device_id] = status

    # ---- incidents ----
    def open_incident(self, incident: Incident) -> Incident:
        with self._lock:
            self.incidents[incident.id] = incident
        return incident

    def resolve_incidents_for(self, device_id: str) -> int:
        import time

        count = 0
        with self._lock:
            for inc in self.incidents.values():
                if inc.device_id == device_id and inc.resolved_at is None:
                    inc.resolved_at = time.time()
                    count += 1
        return count

    def open_incidents(self) -> list[Incident]:
        with self._lock:
            return [i for i in self.incidents.values() if i.resolved_at is None]

    def log_action(self, action: ActionResult) -> None:
        with self._lock:
            self.action_log.append(action)


store = StateStore()
