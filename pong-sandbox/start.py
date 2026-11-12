"""One-click launcher: Praetor + Vigil + Front Desk + console, all local. Ctrl+C stops everything."""
import subprocess, sys, time, webbrowser, os, httpx
HERE = os.path.dirname(os.path.abspath(__file__)); PY = sys.executable
procs = []
def start(args, name):
    p = subprocess.Popen(args, cwd=HERE); procs.append(p); print(f"[start] {name} (pid {p.pid})"); return p
def healthy(url, tries=30):
    for _ in range(tries):
        try: httpx.get(url, timeout=1); return True
        except Exception: time.sleep(0.5)
    return False
def stop_all():
    for p in procs: p.terminate()
    print("[stop] all services stopped")

if not os.path.exists(os.path.join(HERE, ".env")):
    open(os.path.join(HERE, ".env"), "w").write("SLACK_WEBHOOK_URL=\nANTHROPIC_API_KEY=\n")
    print("[setup] created a blank local .env (it stays on this machine)")

URL = "http://127.0.0.1:8710/console.html"
try:
    start([PY, "-m", "uvicorn", "praetor:app", "--host", "127.0.0.1", "--port", "8700", "--log-level", "warning"], "Praetor")
    if not healthy("http://127.0.0.1:8700/status"): raise SystemExit("Praetor failed to start")
    start([PY, "vigil.py"], "Vigil")
    start([PY, "-m", "uvicorn", "desk:app", "--app-dir", os.path.join("packs", "ai_receptionist"),
           "--host", "127.0.0.1", "--port", "8720", "--log-level", "warning"], "Front Desk")
    if not healthy("http://127.0.0.1:8720/state"): raise SystemExit("Front Desk failed to start")
    start([PY, "console_server.py", "8710"], "Console")
    if not healthy(URL): raise SystemExit("Console failed to start")
except SystemExit as e:
    print(e); stop_all(); sys.exit(1)

print(f"\nPong Sandbox is running locally:  {URL}")
print("Bound to 127.0.0.1 only - nothing is exposed outside this machine. Ctrl+C to stop.\n")
if "--no-browser" not in sys.argv: webbrowser.open(URL)
try:
    while all(p.poll() is None for p in procs): time.sleep(1)
except KeyboardInterrupt: pass
finally:
    stop_all()
