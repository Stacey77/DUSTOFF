"""Vigil: the Watchman. Watches Praetor's event stream, reports to humans (not to Mens),
and pulls the kill switch if blocked attacks spike. Keeps watching after it pulls the switch."""
import time, os, httpx
PRAETOR = os.getenv("PRAETOR_URL", "http://127.0.0.1:8700")
SPIKE = int(os.getenv("VIGIL_SPIKE", "5"))      # blocked attacks
WINDOW = int(os.getenv("VIGIL_WINDOW", "30"))   # seconds
NOT_ATTACKS = ("kill switch engaged", "approval timed out (fail closed)")  # Praetor's own blocks

def watch(once=False):
    since, recent = 0, []
    while True:
        try:
            for e in httpx.get(f"{PRAETOR}/events", params={"since": since}, timeout=5).json():
                since = max(since, e["ts"])
                if e["type"] == "block" and e.get("reason") not in NOT_ATTACKS:
                    recent.append(e["ts"]); print(f"VIGIL: blocked {e.get('agent')} {e.get('tool')} - {e['reason']}", flush=True)
            recent = [t for t in recent if time.time() - t < WINDOW]
            if len(recent) >= SPIKE and not httpx.get(f"{PRAETOR}/status", timeout=5).json()["killed"]:
                print(f"VIGIL: {len(recent)} attacks in {WINDOW}s - pulling kill switch, alerting human", flush=True)
                httpx.post(f"{PRAETOR}/killswitch", timeout=5); recent.clear()
                if once: return "killed"
        except httpx.HTTPError:
            pass  # Praetor restarting; keep watching
        if once: return "ok"
        time.sleep(2)

if __name__ == "__main__":
    watch()
