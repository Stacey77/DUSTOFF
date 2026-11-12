"""Praetor - the outer wall of the Pong Sandbox.
Every agent action is POSTed here. Praetor scores risk against policy.yaml plus any
installed niche packs, then allows, blocks, or freezes for human approval, and writes
a tamper-evident audit log.
Run: uvicorn praetor:app --host 127.0.0.1 --port 8700
"""
import hashlib, json, time, uuid, os, glob, yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

load_dotenv()  # secrets stay in local .env, never committed
HERE = os.path.dirname(os.path.abspath(__file__))
SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL", "")
DATA = os.getenv("PRAETOR_DATA", os.path.join(HERE, "data"))
os.makedirs(DATA, exist_ok=True)
LOG_FILE = os.getenv("PRAETOR_LOG", os.path.join(HERE, "audit.log"))
PACKS_DIR = os.path.join(HERE, "packs")
INSTALLED_FILE = os.path.join(DATA, "installed_packs.json")
BASE = yaml.safe_load(open(os.path.join(HERE, "policy.yaml")))

app = FastAPI(title="Praetor")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PENDING, DECISIONS, EVENTS = {}, {}, []
KILLED = False

def _resume_chain():
    """Continue the hash chain from the last line so restarts don't break verification."""
    if not os.path.exists(LOG_FILE): return "GENESIS"
    last = "GENESIS"
    with open(LOG_FILE) as f:
        for line in f:
            if line.strip(): last = json.loads(line)["hash"]
    return last
_last_hash = _resume_chain()

# ---------- niche packs ----------
def available_packs() -> dict:
    packs = {}
    for path in glob.glob(os.path.join(PACKS_DIR, "*", "pack.yaml")):
        p = yaml.safe_load(open(path)); packs[p["id"]] = p
    return packs

def installed() -> list:
    try: return json.load(open(INSTALLED_FILE))
    except Exception: return []

def policy() -> dict:
    """Base policy merged with every installed pack. Packs can add agents and rules,
    never remove base forbidden tools or loosen limits."""
    pol = {"limits": dict(BASE["limits"]), "agents": dict(BASE["agents"]),
           "forbidden_tools": list(BASE.get("forbidden_tools", [])),
           "risky_tools": list(BASE.get("risky_tools", []))}
    packs = available_packs()
    for pid in installed():
        p = packs.get(pid)
        if not p: continue
        pol["agents"].update(p.get("agents", {}))
        pol["forbidden_tools"] += p.get("forbidden_tools", [])
        pol["risky_tools"] += p.get("risky_tools", [])
    return pol

class Action(BaseModel):
    agent: str
    tool: str
    args: dict = {}
    amount: float = 0
    records: int = 0

def audit(entry: dict):
    """Append-only, hash-chained log: editing any line breaks the chain."""
    global _last_hash
    entry["ts"] = time.time(); entry["prev"] = _last_hash
    _last_hash = hashlib.sha256(json.dumps(entry, sort_keys=True).encode()).hexdigest()
    entry["hash"] = _last_hash
    with open(LOG_FILE, "a") as f: f.write(json.dumps(entry) + "\n")
    EVENTS.append(entry); del EVENTS[:-500]

INJECTION = ["ignore previous", "disregard instructions", "system prompt", "exfiltrate", "base64"]

def score(a: Action) -> tuple[str, str]:
    pol = policy()
    if KILLED:
        return "block", "kill switch engaged"
    if a.tool in pol["forbidden_tools"]:
        return "block", f"{a.tool} is forbidden"
    if a.tool not in pol["agents"].get(a.agent, {}).get("tools", []):
        return "block", f"{a.agent} has no permission for {a.tool}"
    if any(p in json.dumps(a.args).lower() for p in INJECTION):
        return "block", "possible prompt injection"
    lim = pol["limits"]
    if a.tool in pol["risky_tools"]:
        return "freeze", f"{a.tool} always needs human approval"
    if a.amount > lim["max_amount"]:
        return "freeze", f"${a.amount:,.0f} is over the ${lim['max_amount']:,.0f} limit"
    if a.records > lim["max_records"]:
        return "freeze", f"{a.records} records is over the {lim['max_records']} limit"
    return "allow", "within policy"

async def ping_human(pid, a, reason):
    if not SLACK_WEBHOOK: return
    msg = f"Praetor approval needed [{pid}]: {a.agent} wants {a.tool} ({reason})"
    try:
        async with httpx.AsyncClient() as c: await c.post(SLACK_WEBHOOK, json={"text": msg}, timeout=5)
    except Exception: pass  # a failed ping never unblocks anything

@app.post("/act")
async def act(a: Action):
    verdict, reason = score(a)
    entry = {"type": verdict, "agent": a.agent, "tool": a.tool, "reason": reason}
    if verdict == "freeze":
        pid = uuid.uuid4().hex[:8]
        PENDING[pid] = {"action": a.model_dump(), "reason": reason, "created": time.time()}
        DECISIONS[pid] = "pending"
        entry["pending_id"] = pid
        await ping_human(pid, a, reason)
    audit(entry)
    return entry  # caller must only execute when type == "allow"

def _expire():
    now = time.time(); timeout = BASE["limits"]["approval_timeout_sec"]
    for pid in [p for p, v in PENDING.items() if now - v["created"] > timeout]:
        PENDING.pop(pid); DECISIONS[pid] = "expired"
        audit({"type": "block", "pending_id": pid, "reason": "approval timed out (fail closed)"})

@app.get("/pending")
def pending():
    _expire()
    return PENDING

@app.post("/decide/{pid}")
def decide(pid: str, approve: bool):
    item = PENDING.pop(pid, None)
    if not item: raise HTTPException(404, "not pending")
    DECISIONS[pid] = "approved" if approve else "denied"
    audit({"type": DECISIONS[pid], "pending_id": pid, **item["action"]})
    return {"pending_id": pid, "approved": approve}

@app.get("/decision/{pid}")
def decision(pid: str):
    """Lets the agent's service learn the human's answer. Unknown ids count as denied."""
    _expire()
    return {"pending_id": pid, "status": DECISIONS.get(pid, "denied")}

@app.get("/events")
def events(since: float = 0):
    """Theatrum polls this to animate the arena."""
    return [e for e in EVENTS if e["ts"] > since]

@app.get("/packs")
def packs():
    inst = installed()
    return [{"id": p["id"], "name": p["name"], "niche": p.get("niche", ""),
             "agents": list(p.get("agents", {})), "installed": p["id"] in inst}
            for p in available_packs().values()]

@app.post("/packs/{pid}/install")
def install(pid: str):
    if KILLED: raise HTTPException(423, "kill switch engaged; re-arm first")
    if pid not in available_packs(): raise HTTPException(404, "unknown pack")
    inst = installed()
    if pid not in inst:
        inst.append(pid); json.dump(inst, open(INSTALLED_FILE, "w"))
        audit({"type": "pack_installed", "pack": pid, "reason": "human installed niche pack"})
    return {"installed": inst}

@app.post("/packs/{pid}/uninstall")
def uninstall(pid: str):
    inst = [p for p in installed() if p != pid]; json.dump(inst, open(INSTALLED_FILE, "w"))
    audit({"type": "pack_removed", "pack": pid, "reason": "human removed niche pack"})
    return {"installed": inst}

@app.post("/killswitch")
def kill():
    global KILLED
    KILLED = True
    for pid in list(PENDING): PENDING.pop(pid); DECISIONS[pid] = "denied"
    audit({"type": "killswitch", "reason": "all agent permissions revoked"})
    return {"status": "all agents frozen"}

@app.post("/killswitch/rearm")
def rearm():
    global KILLED
    KILLED = False
    audit({"type": "rearmed", "reason": "human re-armed the sandbox"})
    return {"status": "re-armed"}

@app.get("/status")
def status():
    return {"killed": KILLED, "installed_packs": installed(), "pending": len(PENDING)}

@app.get("/verify-log")
def verify():
    prev = "GENESIS"
    if not os.path.exists(LOG_FILE): return {"intact": True, "entries": 0}
    n = 0
    for line in open(LOG_FILE):
        if not line.strip(): continue
        e = json.loads(line); h = e.pop("hash"); n += 1
        if e["prev"] != prev or hashlib.sha256(json.dumps(e, sort_keys=True).encode()).hexdigest() != h:
            return {"intact": False, "broken_at": n}
        prev = h
    return {"intact": True, "entries": n}
