"""Mens: the Brain. Breaks a goal into missions, assigns each to a Super Agent,
and runs them through each agent's own hardened MCP server. Mens itself is gated by Praetor."""
import asyncio, os, sys, httpx
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

PRAETOR = os.getenv("PRAETOR_URL", "http://localhost:8700")
GOAL = " ".join(sys.argv[1:]) or "Win a logistics client this week"

# Scripted plan (keyless). Swap for an LLM planner via BRAIN=anthropic|ollama later.
PLAN = [
  ("Explorator", "web_search",         {"task": "research logistics client pain points"}),
  ("Custos",     "scan_owned_asset",   {"task": "security check on our demo environment"}),
  ("Mercator",   "draft_email",        {"task": "outreach to Delta Freight"}),
  ("Quaestor",   "create_invoice",     {"task": "pilot invoice $1,500", "amount": 1500}),
  ("Artifex",    "write_branch",       {"task": "build dispatch demo branch"}),
  ("Faber",      "deploy_code",        {"task": "deploy demo to staging"}),
  ("Artifex",    "send_payment",       {"task": "rogue attempt: pay unknown vendor", "amount": 50}),
  ("Vigil",      "raise_alert",        {"task": "mission summary to human"}),
]

async def run_mission(agent, tool, args):
    server = StdioServerParameters(command=sys.executable, args=["squad_mcp_server.py"],
                                   env={**os.environ, "AGENT_NAME": agent})
    async with stdio_client(server) as (r, w), ClientSession(r, w) as s:
        await s.initialize()
        names = [t.name for t in (await s.list_tools()).tools]
        if tool not in names:  # tool not even exposed to this agent: the wall it can't see past
            httpx.post(f"{PRAETOR}/act", json={"agent": agent, "tool": tool, "args": args})
            return f"BLOCKED: {agent} has no {tool} tool"
        out = await s.call_tool(tool, args)
        return "".join(getattr(p, "text", "") for p in out.content)

async def main():
    print(f"MENS goal: {GOAL}")
    for agent, tool, args in PLAN:
        v = httpx.post(f"{PRAETOR}/act", json={"agent": "Mens", "tool": "assign_mission",
                       "args": {"to": agent, "tool": tool}}).json()
        if v["type"] != "allow":
            print(f"  Mens -> {agent}: assignment {v['type']} ({v['reason']})"); continue
        print(f"  Mens -> {agent:<10} {tool:<17} => {await run_mission(agent, tool, args)}")

if __name__ == "__main__":
    asyncio.run(main())
