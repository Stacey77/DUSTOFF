"""Shared state for the AI Receptionist pack: inbox, bookings, quotes, outbox.
Stored locally in data/desk_state.json. Uses a lock file that works on Windows and Linux."""
import json, os, time, uuid, datetime, contextlib, yaml

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DATA = os.getenv("PRAETOR_DATA", os.path.join(ROOT, "data"))
os.makedirs(DATA, exist_ok=True)
STATE = os.path.join(DATA, "desk_state.json")
LOCK = STATE + ".lock"
PACK = yaml.safe_load(open(os.path.join(HERE, "pack.yaml")))
BIZ, SERVICES = PACK["business"], PACK["services"]

def new_id(prefix): return f"{prefix}-{uuid.uuid4().hex[:6]}"
def now_iso(): return datetime.datetime.now().isoformat(timespec="seconds")

def empty():
    return {"inbox": [], "bookings": [], "quotes": [], "outbox": []}

@contextlib.contextmanager
def locked(timeout=10):
    start = time.time()
    while True:
        try:
            fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.close(fd); break
        except FileExistsError:
            if time.time() - os.path.getmtime(LOCK) > 30: os.remove(LOCK)  # stale lock
            elif time.time() - start > timeout: raise TimeoutError("desk state busy")
            time.sleep(0.05)
    try: yield
    finally:
        with contextlib.suppress(FileNotFoundError): os.remove(LOCK)

def load():
    try: return json.load(open(STATE))
    except Exception: return empty()

def save(state):
    tmp = STATE + ".tmp"
    json.dump(state, open(tmp, "w"), indent=1); os.replace(tmp, STATE)

@contextlib.contextmanager
def transaction():
    with locked():
        s = load(); yield s; save(s)

def open_slots(state, limit=6):
    """Next open appointment slots inside business hours, skipping booked ones and Sundays."""
    taken = {b["slot"] for b in state["bookings"] if b["status"] in ("booked", "dispatched")}
    out, day = [], datetime.date.today()
    nowdt = datetime.datetime.now()
    for d in range(BIZ["days_ahead"] + 2):
        date = day + datetime.timedelta(days=d)
        if date.weekday() == 6: continue  # closed Sunday
        for h in BIZ["slot_hours"]:
            slot = datetime.datetime(date.year, date.month, date.day, h)
            if slot <= nowdt + datetime.timedelta(hours=1): continue
            iso = slot.isoformat(timespec="minutes")
            if iso not in taken: out.append(iso)
            if len(out) >= limit: return out
    return out

def match_service(text: str) -> str:
    t = (text or "").lower()
    for key, svc in SERVICES.items():
        if key in ("emergency_call", "service_visit"): continue
        if any(k in t for k in svc["keywords"]): return key
    return "service_visit"

def known_phones(state):
    return {i["phone"] for i in state["inbox"]}

def nice_slot(iso):
    dt = datetime.datetime.fromisoformat(iso)
    return dt.strftime("%a %b %d, ") + dt.strftime("%I:%M %p").lstrip("0")
