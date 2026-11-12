"""Squad MCP server: one hardened server per Super Agent, launched with AGENT_NAME.
Exposes only the tools policy.yaml grants that agent. Every call is gated by Praetor."""
import os, re, time, json, httpx, yaml
from mcp.server.fastmcp import FastMCP

PRAETOR = os.getenv("PRAETOR_URL", "http://localhost:8700")
AGENT = os.getenv("AGENT_NAME", "Explorator")
TOOLS = yaml.safe_load(open(os.path.join(os.path.dirname(__file__), "policy.yaml")))["agents"].get(AGENT, {}).get("tools", [])
mcp = FastMCP(f"{AGENT.lower()}-hardened")
INJECT = re.compile(r"(ignore previous|disregard instructions|system prompt)", re.I)
CALLS = []

def gate(tool, args, amount=0, records=0):
    now = time.time(); CALLS[:] = [t for t in CALLS if now - t < 60]
    if len(CALLS) >= 20: return {"type": "block", "reason": "rate limit"}
    CALLS.append(now)
    return httpx.post(f"{PRAETOR}/act", json={"agent": AGENT, "tool": tool, "args": args,
                      "amount": amount, "records": records}, timeout=5).json()

def make(tool):
    def run(task: str = "", amount: float = 0, records: int = 0) -> str:
        v = gate(tool, {"task": task}, amount, records)
        if v["type"] == "freeze": return f"FROZEN: waiting for human approval (id {v['pending_id']})."
        if v["type"] != "allow": return f"DENIED by Praetor: {v['reason']}"
        out = f"{AGENT} completed {tool}: {task or 'ok'} (simulated in sandbox)"
        return INJECT.sub("[BLOCKED INSTRUCTION]", out)
    run.__name__ = tool; run.__doc__ = f"{tool} for {AGENT}. Simulated inside the sandbox."
    return run

for t in TOOLS: mcp.tool()(make(t))

if __name__ == "__main__":
    mcp.run()
