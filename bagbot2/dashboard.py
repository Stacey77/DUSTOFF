"""FastAPI dashboard for BAGBOT2 paper trading. Paper only: there are no live-trading controls."""
from __future__ import annotations

import hmac
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse

from config import load_settings
from engine import PaperEngine

settings = load_settings()
engine = PaperEngine(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    worker = threading.Thread(target=engine.run_forever, daemon=True, name="paper-engine")
    worker.start()
    yield
    engine.stop_event.set()
    engine.save()


app = FastAPI(title="BAGBOT2 Paper Dashboard", version="3.1", lifespan=lifespan)


def _require_token(token: str | None) -> None:
    # Controls stay disabled until DASHBOARD_TOKEN is set on the server.
    if not settings.dashboard_token:
        raise HTTPException(503, "DASHBOARD_TOKEN is not set on the server")
    if not token or not hmac.compare_digest(token, settings.dashboard_token):
        raise HTTPException(401, "bad or missing X-Dashboard-Token")


DASHBOARD_HTML = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BAGBOT2 Paper Dashboard</title>
<style>
:root{--bg:#0b1220;--panel:#131d30;--line:#22304a;--text:#e6edf7;--muted:#8a9bb8;
--green:#34d399;--red:#f87171;--amber:#fbbf24;--blue:#60a5fa}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.4 system-ui,Segoe UI,Arial,sans-serif}
header{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--line)}
.brand{font-weight:800;font-size:18px;letter-spacing:.5px}
.badge{padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:#3b2f0b;color:var(--amber)}
.state{margin-left:auto;color:var(--muted);font-size:13px}
main{padding:16px 20px;display:grid;gap:14px;max-width:1280px;margin:0 auto}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px}
.panel h2{margin:0 0 10px;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;font-weight:600}
.kpi .v{font-size:24px;font-weight:700;margin-top:2px}
.sub{color:var(--muted);font-size:12px;margin-top:4px}
.pos{color:var(--green)}.neg{color:var(--red)}
.grid2{display:grid;grid-template-columns:2fr 1fr;gap:14px}
@media (max-width:860px){.grid2{grid-template-columns:1fr}}
.grid3{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:860px){.grid3{grid-template-columns:1fr}}
svg.curve{width:100%;height:200px;display:block}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:6px 4px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
th{color:var(--muted);font-weight:600}
.scroll{overflow-x:auto;max-height:260px;overflow-y:auto}
.feed{max-height:260px;overflow-y:auto;display:grid;gap:6px}
.evt{padding:7px 9px;border-radius:8px;background:#0f1828;border-left:3px solid var(--blue);font-size:13px}
.evt .k{display:inline-block;min-width:54px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted)}
.evt.trade{border-color:var(--green)}.evt.tune{border-color:var(--blue)}
.evt.alert{border-color:var(--amber)}.evt.error{border-color:var(--red)}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
button{padding:8px 14px;border:0;border-radius:8px;font-weight:600;cursor:pointer;color:#fff;background:var(--blue)}
button.warn{background:#b45309}button.ok{background:#047857}
input{padding:8px;border-radius:8px;border:1px solid var(--line);background:#0f1828;color:var(--text);min-width:200px}
.muted{color:var(--muted)}
.msg{font-size:12px;color:var(--muted)}
</style></head>
<body>
<header>
  <div class="brand">BAGBOT2</div>
  <span class="badge">PAPER MODE</span>
  <span id="runstate" class="muted"></span>
  <span class="state" id="meta">loading...</span>
</header>
<main>
  <section class="kpis">
    <div class="panel kpi"><h2>Portfolio value</h2><div class="v" id="k-equity">-</div><div class="sub" id="k-return">-</div></div>
    <div class="panel kpi"><h2>Current drawdown</h2><div class="v" id="k-dd">-</div><div class="sub" id="k-maxdd">-</div></div>
    <div class="panel kpi"><h2>Sharpe ratio</h2><div class="v" id="k-sharpe">-</div><div class="sub">annualised, from equity curve</div></div>
    <div class="panel kpi"><h2>Win rate</h2><div class="v" id="k-win">-</div><div class="sub" id="k-closed">-</div></div>
    <div class="panel kpi"><h2>Open positions</h2><div class="v" id="k-open">-</div><div class="sub" id="k-cash">-</div></div>
  </section>

  <section class="grid2">
    <div class="panel">
      <h2>Performance overview</h2>
      <svg class="curve" id="curve" viewBox="0 0 600 200" preserveAspectRatio="none"></svg>
      <div class="sub" id="curve-note"></div>
    </div>
    <div class="panel">
      <h2>System status &amp; controls</h2>
      <div class="controls">
        <input id="tok" type="password" placeholder="dashboard token" autocomplete="off">
      </div>
      <div class="controls" style="margin-top:10px">
        <button class="ok" onclick="act('retune')">Retune now</button>
        <button class="warn" onclick="act('pause')">Pause</button>
        <button onclick="act('resume')">Resume</button>
      </div>
      <div class="msg" id="msg" style="margin-top:8px"></div>
      <div class="sub" style="margin-top:12px" id="sys"></div>
    </div>
  </section>

  <section class="grid3">
    <div class="panel"><h2>Real-time alerts &amp; events</h2><div class="feed" id="events"></div></div>
    <div class="panel"><h2>Open positions</h2><div class="scroll" id="positions"></div></div>
  </section>

  <section class="panel"><h2>Recent trades</h2><div class="scroll" id="trades"></div></section>
  <section class="panel"><h2>Tuning log</h2><div class="scroll" id="tunes"></div></section>
</main>
<script>
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = v => "$" + Number(v).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
const pct = (v, d = 2) => (Number(v) * 100).toFixed(d) + "%";
function table(rows, cols, empty) {
  if (!rows.length) return '<div class="muted">' + esc(empty) + '</div>';
  return "<table><tr>" + cols.map(c => "<th>" + esc(c[0]) + "</th>").join("") + "</tr>" +
    rows.map(r => "<tr>" + cols.map(c => "<td>" + esc(c[1](r)) + "</td>").join("") + "</tr>").join("") + "</table>";
}
function drawCurve(hist) {
  const svg = document.getElementById("curve");
  const note = document.getElementById("curve-note");
  if (hist.length < 2) { svg.innerHTML = ""; note.textContent = "Equity curve appears after two engine cycles."; return; }
  const vals = hist.map(h => h.equity), lo = Math.min(...vals), hi = Math.max(...vals), span = (hi - lo) || 1;
  const pts = vals.map((v, i) => (i / (vals.length - 1) * 600).toFixed(1) + "," + (190 - (v - lo) / span * 180).toFixed(1)).join(" ");
  svg.innerHTML = '<line x1="0" y1="190" x2="600" y2="190" stroke="#22304a"/>' +
    '<polyline fill="none" stroke="#60a5fa" stroke-width="2" vector-effect="non-scaling-stroke" points="' + pts + '"/>';
  note.textContent = "Low " + money(lo) + " · High " + money(hi) + " · " + vals.length + " cycles";
}
async function refresh() {
  try {
    const s = await (await fetch("/api/state")).json();
    document.getElementById("meta").textContent = "last cycle " + (s.last_cycle ? new Date(s.last_cycle).toLocaleTimeString() : "never");
    document.getElementById("runstate").textContent = s.paused ? "Paused" : "Running";
    document.getElementById("k-equity").textContent = money(s.equity);
    const r = document.getElementById("k-return");
    r.textContent = (s.return_pct >= 0 ? "+" : "") + s.return_pct + "% vs start";
    r.className = "sub " + (s.return_pct >= 0 ? "pos" : "neg");
    const dd = document.getElementById("k-dd");
    dd.textContent = pct(s.drawdown);
    dd.className = "v " + (s.drawdown > 0.05 ? "neg" : "");
    document.getElementById("k-maxdd").textContent = "max " + pct(s.max_drawdown);
    const sh = document.getElementById("k-sharpe");
    sh.textContent = Number(s.sharpe).toFixed(2);
    sh.className = "v " + (s.sharpe >= 0 ? "pos" : "neg");
    document.getElementById("k-win").textContent = pct(s.win_rate, 1);
    document.getElementById("k-closed").textContent = s.closed_trades + " closed trades";
    document.getElementById("k-open").textContent = Object.keys(s.open_positions).length;
    document.getElementById("k-cash").textContent = money(s.cash) + " cash";
    drawCurve(s.equity_history);
    document.getElementById("sys").textContent = "Mode: paper · Peak " + money(s.peak) + " · Errors recorded: " + s.errors.length;

    document.getElementById("events").innerHTML = s.events.length
      ? s.events.map(e => '<div class="evt ' + esc(e.kind) + '"><span class="k">' + esc(e.kind) + '</span>' + esc(e.text) +
          '<div class="muted" style="font-size:11px">' + esc(new Date(e.t).toLocaleTimeString()) + '</div></div>').join("")
      : '<div class="muted">No events yet.</div>';
    document.getElementById("positions").innerHTML = table(
      Object.entries(s.open_positions).map(([sym, p]) => Object.assign({sym: sym}, p)),
      [["Symbol", r => r.sym], ["Qty", r => Number(r.qty).toFixed(2)], ["Entry", r => Number(r.entry_px).toFixed(2)],
       ["Stop", r => Number(r.stop).toFixed(2)], ["Take", r => Number(r.take).toFixed(2)]], "No open positions.");
    document.getElementById("trades").innerHTML = table(s.recent_trades,
      [["Time", r => r.t], ["Symbol", r => r.symbol], ["Side", r => r.side], ["Price", r => r.price],
       ["Qty", r => r.qty], ["Reason", r => r.reason], ["P&L", r => r.pnl ?? ""]], "No trades yet.");
    document.getElementById("tunes").innerHTML = table(s.tune_log,
      [["Time", r => r.t], ["Symbol", r => r.symbol], ["Accepted", r => r.accepted], ["Reason", r => r.reason],
       ["Valid current", r => r.valid_current], ["Valid candidate", r => r.valid_candidate]], "No tuning runs yet.");
  } catch (e) {
    document.getElementById("meta").textContent = "dashboard offline: " + e;
  }
}
async function act(name) {
  const tok = document.getElementById("tok").value;
  const r = await fetch("/api/" + name, {method: "POST", headers: {"X-Dashboard-Token": tok}});
  document.getElementById("msg").textContent = r.ok ? name + ": ok" : name + " failed (" + r.status + ")";
  refresh();
}
refresh();
setInterval(refresh, 10000);
</script></body></html>
"""


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return DASHBOARD_HTML


@app.get("/health")
def health():
    st = engine.status()
    healthy = False
    if st["last_cycle"]:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(st["last_cycle"])
        healthy = age.total_seconds() <= 3 * settings.interval_seconds
    body = {"status": "ok" if healthy else "stale", "paused": st["paused"], "last_cycle": st["last_cycle"]}
    return JSONResponse(body, status_code=200 if healthy else 503)


@app.get("/api/state")
def state() -> dict:
    return engine.status()


def render_metrics(st: dict) -> str:
    rows = [
        ("bagbot2_equity_usd", st["equity"], "Paper account equity"),
        ("bagbot2_cash_usd", st["cash"], "Uninvested cash"),
        ("bagbot2_drawdown_ratio", st["drawdown"], "Drawdown from peak"),
        ("bagbot2_max_drawdown_ratio", st["max_drawdown"], "Largest drawdown in equity curve"),
        ("bagbot2_sharpe_ratio", st["sharpe"], "Annualised Sharpe ratio"),
        ("bagbot2_return_pct", st["return_pct"], "Return versus starting cash"),
        ("bagbot2_open_positions", len(st["open_positions"]), "Open paper positions"),
        ("bagbot2_closed_trades_total", st["closed_trades"], "Closed paper trades"),
        ("bagbot2_win_rate", st["win_rate"], "Win rate of closed trades"),
        ("bagbot2_paused", 1 if st["paused"] else 0, "1 if the engine is paused"),
        ("bagbot2_errors_recent", len(st["errors"]), "Recent engine errors"),
    ]
    out: list[str] = []
    for name, value, help_text in rows:
        out += [f"# HELP {name} {help_text}", f"# TYPE {name} gauge", f"{name} {value}"]
    return "\n".join(out) + "\n"


@app.get("/metrics", response_class=PlainTextResponse)
def metrics() -> str:
    # Bound to localhost by default. Scrape it through an SSH tunnel or a local Prometheus.
    return render_metrics(engine.status())


@app.post("/api/retune")
def retune(x_dashboard_token: str | None = Header(default=None)):
    _require_token(x_dashboard_token)

    def job() -> None:
        for sym in settings.symbols:
            try:
                engine.retune(sym)
            except Exception as exc:
                engine.record_error(sym, exc)

    threading.Thread(target=job, daemon=True, name="manual-retune").start()
    return {"status": "retune started"}


@app.post("/api/pause")
def pause(x_dashboard_token: str | None = Header(default=None)):
    _require_token(x_dashboard_token)
    engine.set_paused(True)
    return {"status": "paused"}


@app.post("/api/resume")
def resume(x_dashboard_token: str | None = Header(default=None)):
    _require_token(x_dashboard_token)
    engine.set_paused(False)
    return {"status": "resumed"}
