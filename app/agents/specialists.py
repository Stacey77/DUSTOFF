"""Specialist swarm agents.

- RepairAgent    diagnoses failures, consults learned knowledge, remediates
- SetupAgent     designs and applies network/system setup plans
- ExecutionAgent runs approved command playbooks step by step
- LearningAgent  records outcomes into the knowledge base and reports stats
- DesignAgent    produces AI/network system design documents
"""
from __future__ import annotations

from app.agents.base import AgentReport, BaseAgent, Task
from app.agents.knowledge import kb
from app.core.config import settings
from app.core.models import CheckType, Device
from app.core.state import store
from app.monitors.probes import run_check
from app.remediation import engine


def _failure_type(device: Device) -> str:
    return {
        CheckType.ping: "reachability",
        CheckType.tcp_port: "service",
        CheckType.dns: "dns",
    }[device.check]


class RepairAgent(BaseAgent):
    name = "repair"
    capabilities = {"repair"}

    async def handle(self, task: Task) -> AgentReport:
        device = store.find_device(task.params.get("device", ""))
        if not device:
            return AgentReport(
                agent=self.name, task_id=task.id, success=False,
                summary=f"no device matches '{task.params.get('device')}'",
            )

        result = await run_check(device)
        if result.ok:
            kb.record(_failure_type(device), "none_needed", True, device.name)
            return AgentReport(
                agent=self.name, task_id=task.id, success=True,
                summary=f"{device.name} is reachable ({result.detail}); no repair needed.",
            )

        ftype = _failure_type(device)
        learned_action, rate = kb.recommend(ftype)
        use_learned = (learned_action
                       if rate >= settings.learned_min_rate and engine.is_known_action(learned_action or "")
                       else None)
        steps: list[str] = [f"diagnosed {device.name}: {result.detail}"]
        if use_learned:
            steps.append(f"knowledge base prefers '{use_learned}' (historical success {rate:.0%})")

        # try learned action first, then the fallback chain; verify after each attempt
        candidates = engine.candidates_for(ftype, use_learned)[: max(1, settings.repair_max_attempts)]
        success = False
        for action in candidates:
            outcome = await engine.run_action(device, action)
            if outcome is None:
                continue
            store.log_action(outcome)
            kb.record(ftype, outcome.action, outcome.success, device.name)
            steps.append(f"{outcome.action}: {'ok' if outcome.success else 'failed'}")
            verify = await run_check(device)
            steps.append(f"verification: {verify.detail}")
            if verify.ok:
                success = True
                break
        if success:
            store.resolve_incidents_for(device.id)
        return AgentReport(
            agent=self.name, task_id=task.id, success=success,
            summary=f"repair of {device.name} {'succeeded' if success else 'did not restore connectivity'} — "
                    + " → ".join(steps),
            details={"device": device.name, "failure_type": ftype, "verified": success},
        )


class SetupAgent(BaseAgent):
    name = "setup"
    capabilities = {"setup"}

    DEFAULT_PLAN = [
        "inventory existing devices and links",
        "assign IP addressing plan and VLANs",
        "configure gateways, DNS and NTP",
        "register all nodes with the monitoring swarm",
        "baseline latency and availability, then enable auto-remediation",
    ]

    async def handle(self, task: Task) -> AgentReport:
        target = task.params.get("device")
        lines = [f"setup plan for {task.description}:"]
        lines += [f"  {i+1}. {s}" for i, s in enumerate(self.DEFAULT_PLAN)]
        applied = None
        if target:
            d = store.find_device(target)
            if d and d.id not in store.status:
                store.add_device(d)
            applied = target
            lines.append(f"applied: '{target}' is now registered with the monitoring swarm")
        return AgentReport(
            agent=self.name, task_id=task.id, success=True,
            summary="\n".join(lines),
            details={"applied_to": applied, "plan_steps": self.DEFAULT_PLAN},
        )


class ExecutionAgent(BaseAgent):
    name = "execution"
    capabilities = {"execute"}

    async def handle(self, task: Task) -> AgentReport:
        device_name = task.params.get("device")
        action = task.params.get("action")
        device = store.find_device(device_name) if device_name else None
        if not device or not action:
            return AgentReport(
                agent=self.name, task_id=task.id, success=False,
                summary="execution needs both 'device' and 'action' params",
            )
        result = await engine.run_action(device, action)
        if result is None:
            return AgentReport(
                agent=self.name, task_id=task.id, success=False,
                summary=f"unknown action '{action}'; available: {list(engine.AVAILABLE_ACTIONS)}",
            )
        store.log_action(result)
        kb.record(_failure_type(device), action, result.success, "manual execution")
        return AgentReport(
            agent=self.name, task_id=task.id, success=result.success,
            summary=f"executed {action} on {device.name}: "
                    f"{'success' if result.success else 'failed'} — {result.output[:120]}",
        )


class LearningAgent(BaseAgent):
    name = "learning"
    capabilities = {"learn"}

    async def handle(self, task: Task) -> AgentReport:
        stats = kb.stats()
        if stats["rules_learned"] == 0:
            summary = "knowledge base is empty — it fills as repairs run"
        else:
            top = sorted(stats["entries"].items(),
                         key=lambda kv: (kv[1]["success_rate"], kv[1]["attempts"]), reverse=True)[:3]
            lines = [f"{k}: {v['success_rate']:.0%} over {v['attempts']} attempt(s)" for k, v in top]
            summary = f"learned {stats['rules_learned']} rule(s). Best: " + "; ".join(lines)
        return AgentReport(agent=self.name, task_id=task.id, success=True,
                           summary=summary, details=stats)


class DesignAgent(BaseAgent):
    name = "design"
    capabilities = {"design"}

    async def handle(self, task: Task) -> AgentReport:
        scale = task.params.get("scale", "mid-size")
        doc = f"""# System Design — {task.description}

## Architecture
- **Edge**: redundant internet gateways, BGP/failover, perimeter firewall
- **Core**: L3 spine-leaf ({scale}), redundant core switches, OSPF underlay
- **Access**: VLAN-segmented access switches, 802.1X port security, PoE budget per closet
- **Services**: redundant DNS/DHCP/NTP, central syslog + NTP, PKI for device certs

## AI operations layer
- **Monitoring swarm**: probe agents per site reporting to the central brain
- **Repair agents**: knowledge-guided auto-remediation with verification loops
- **Learning**: every outcome feeds the knowledge base; recommendations improve over time
- **Safety**: SAFE_MODE simulation gate before any action executes for real

## Rollout
1. Pilot site with monitoring-only mode
2. Enable remediation in SAFE_MODE, review action log
3. Gradual live execution with approval thresholds
"""
        return AgentReport(agent=self.name, task_id=task.id, success=True,
                           summary=doc, details={"format": "markdown"})


def register_all() -> None:
    from app.agents.base import swarm
    for agent in (RepairAgent(), SetupAgent(), ExecutionAgent(), LearningAgent(), DesignAgent()):
        swarm.register(agent)
