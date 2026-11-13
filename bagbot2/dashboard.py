"""FastAPI dashboard for BAGBOT2 paper trading. Paper only: there are no live-trading controls."""
from __future__ import annotations

import hmac
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse

from backtest import simulate
from config import load_settings
from data import fetch_bars
from engine import PaperEngine

try:
    import psutil
except ImportError:  # system stats are optional
    psutil = None

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
<title>BagBot.io · BAGBOT2 Paper</title>
<style>
:root{--bg:#0d0b1f;--side:#120e2a;--panel:#16122e;--panel2:#1d1840;--line:#2e2760;--text:#eceaff;--muted:#9a94c4;
--green:#4ade80;--red:#f87171;--amber:#fbbf24;--violet:#8b5cf6;--violet2:#6d28d9;--cyan:#38bdf8}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 60% -10%,#241a55 0%,var(--bg) 60%);color:var(--text);font:14px/1.45 system-ui,Segoe UI,Arial,sans-serif;min-height:100vh;display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:14px;padding:12px 18px;border-bottom:1px solid var(--line);background:rgba(13,11,31,.85);position:sticky;top:0;z-index:3}
.logo{font-weight:800;font-size:19px}.logo span{color:var(--violet)}
.badge{padding:4px 11px;border-radius:999px;font-size:12px;font-weight:700;background:#3a2c08;color:var(--amber)}
.right{margin-left:auto;color:var(--muted);font-size:13px}
.shell{display:grid;grid-template-columns:200px 1fr;flex:1;min-height:0}
@media (max-width:820px){.shell{grid-template-columns:1fr}aside{flex-direction:row!important;overflow-x:auto}}
aside{background:var(--side);border-right:1px solid var(--line);padding:14px 10px;display:flex;flex-direction:column;gap:4px}
aside a{padding:10px 12px;border-radius:9px;color:var(--muted);text-decoration:none;font-weight:600;white-space:nowrap;cursor:pointer}
aside a:hover{color:var(--text);background:#1d1840}
aside a.on{color:var(--text);background:linear-gradient(90deg,#3b2d7a,#241c55)}
main{padding:18px;display:grid;gap:16px;align-content:start;min-width:0}
.view{display:none;gap:16px;grid-template-columns:1fr}
.view.on{display:grid}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}
.panel{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);border-radius:14px;padding:16px;min-width:0}
.panel h2{margin:0 0 12px;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;font-weight:700}
.kpi .v{font-size:24px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums}
.sub{color:var(--muted);font-size:12px;margin-top:4px}
.pos{color:var(--green)}.neg{color:var(--red)}
.two{display:grid;grid-template-columns:1.6fr 1fr;gap:16px}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
@media (max-width:1000px){.two,.three{grid-template-columns:1fr}}
svg.curve{width:100%;height:220px;display:block}
.row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);gap:10px}
.row:last-child{border-bottom:0}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:var(--green)}
.dot.off{background:var(--red)}
.feed{max-height:320px;overflow-y:auto;display:grid;gap:8px}
.evt{padding:9px 11px;border-radius:10px;background:#120e28;border:1px solid var(--line);font-size:13px}
.evt .k{display:inline-block;min-width:58px;font-size:11px;font-weight:800;text-transform:uppercase;color:var(--muted)}
.evt.trade .k{color:var(--green)}.evt.tune .k{color:var(--cyan)}.evt.alert .k{color:var(--amber)}.evt.error .k{color:var(--red)}
.evt .t{font-size:11px;color:var(--muted);margin-top:3px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
th{color:var(--muted);font-weight:700;font-size:12px}
.scroll{overflow-x:auto;max-height:300px;overflow-y:auto}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
button{padding:9px 14px;border:0;border-radius:9px;font-weight:700;cursor:pointer;color:#fff;background:var(--violet2)}
button:hover{filter:brightness(1.1)}
button.ghost{background:#24204a;color:var(--text);border:1px solid var(--line)}
button.amber{background:#92400e}
input{padding:9px;border-radius:9px;border:1px solid var(--line);background:#0f0c24;color:var(--text);min-width:200px}
.muted{color:var(--muted)}
.msg{font-size:12px;color:var(--muted);margin-top:8px;min-height:16px}
/* strategy builder blocks */
.flow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.blk{background:#0f0c24;border:1px solid #4c3fa0;border-radius:10px;padding:8px 10px;font-size:12px;min-width:130px}
.blk b{display:block;color:var(--cyan);font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.arrow{color:var(--muted);font-size:18px}
/* engine core */
.core{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.node{background:#0f0c24;border:1px solid var(--line);border-radius:12px;padding:12px;font-size:13px}
.node .dot{margin-right:6px}
.node .sub{margin-top:6px}
pre.cfg{margin:0;font-size:12px;color:var(--muted);white-space:pre-wrap}
.note{font-size:12px;color:var(--muted);border-top:1px solid var(--line);margin-top:12px;padding-top:10px}
footer{display:flex;flex-wrap:wrap;gap:18px;padding:9px 18px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;background:var(--side)}
footer b{color:var(--text);font-weight:600}
</style></head>
<body>
<header>
  <div class="logo">BagBot<span>.io</span></div>
  <span class="badge">PAPER MODE</span>
  <div class="right" id="meta">loading...</div>
</header>
<div class="shell">
<aside>
  <a data-view="dashboard" class="on">Dashboard</a>
  <a data-view="strategy">Strategy Builder</a>
  <a data-view="performance">Performance Analytics</a>
  <a data-view="market">Market Data</a>
  <a data-view="alerts">Alerts</a>
  <a data-view="settings">Settings</a>
</aside>
<main>

  <!-- DASHBOARD -->
  <section class="view on" id="v-dashboard">
    <div class="kpis">
      <div class="panel kpi"><h2>Portfolio value</h2><div class="v" id="k-equity">-</div><div class="sub" id="k-return">-</div></div>
      <div class="panel kpi"><h2>Current drawdown</h2><div class="v" id="k-dd">-</div><div class="sub" id="k-maxdd">-</div></div>
      <div class="panel kpi"><h2>Sharpe ratio</h2><div class="v" id="k-sharpe">-</div><div class="sub">annualised, from equity curve</div></div>
      <div class="panel kpi"><h2>Win rate</h2><div class="v" id="k-win">-</div><div class="sub" id="k-closed">-</div></div>
    </div>
    <div class="two">
      <div class="panel"><h2>Performance overview</h2><svg class="curve" id="curve" viewBox="0 0 600 220" preserveAspectRatio="none"></svg><div class="sub" id="curve-note"></div></div>
      <div class="panel">
        <h2>System status &amp; controls</h2>
        <div class="row"><span><span class="dot" id="dot"></span>Paper engine</span><span id="s-engine">-</span></div>
        <div class="row"><span>Market data</span><span class="muted" id="s-data">-</span></div>
        <div class="row"><span>Local state</span><span class="muted" id="s-state">-</span></div>
        <div class="row"><span>Live trading</span><span class="muted">not available</span></div>
        <div class="controls" style="margin-top:12px"><button class="ghost" onclick="act('resume')">Resume paper engine</button><button class="amber" onclick="act('pause')">Pause</button><button onclick="act('retune')">Retune now</button></div>
        <div class="msg" id="msg"></div>
      </div>
    </div>
    <div class="two">
      <div class="panel">
        <h2>Engine core</h2>
        <div class="core" id="core"></div>
      </div>
      <div class="panel"><h2>Real-time alerts</h2><div class="feed" id="events-dash"></div></div>
    </div>
    <div class="panel"><h2>Recent executions</h2><div class="scroll" id="trades-dash"></div></div>
  </section>

  <!-- STRATEGY BUILDER -->
  <section class="view" id="v-strategy">
    <div class="panel">
      <h2>Strategy Builder · current parameters</h2>
      <div id="flows"></div>
      <div class="note">Blocks show the parameters the paper engine is using right now. They change only after a retune is accepted out-of-sample.</div>
    </div>
    <div class="panel">
      <h2>Backtest</h2>
      <div class="controls"><input id="tok-bt" type="password" placeholder="dashboard token" autocomplete="off"><button onclick="runBacktest()">Run Backtest</button></div>
      <div class="msg" id="bt-msg">Runs the current parameters on the tuning history. Results are not live performance.</div>
      <div class="scroll" id="bt-out" style="margin-top:10px"></div>
    </div>
  </section>

  <!-- PERFORMANCE -->
  <section class="view" id="v-performance">
    <div class="kpis">
      <div class="panel kpi"><h2>Sharpe ratio</h2><div class="v" id="p-sharpe">-</div></div>
      <div class="panel kpi"><h2>Volatility (ann.)</h2><div class="v" id="p-vol">-</div></div>
      <div class="panel kpi"><h2>Max drawdown</h2><div class="v" id="p-maxdd">-</div></div>
      <div class="panel kpi"><h2>Profit factor</h2><div class="v" id="p-pf">-</div></div>
      <div class="panel kpi"><h2>Win rate</h2><div class="v" id="p-win">-</div><div class="sub" id="p-closed">-</div></div>
    </div>
    <div class="panel"><h2>Equity curve</h2><svg class="curve" id="curve2" viewBox="0 0 600 220" preserveAspectRatio="none" style="height:300px"></svg><div class="sub" id="curve2-note"></div></div>
    <div class="panel"><h2>Tuning log</h2><div class="scroll" id="tunes"></div></div>
  </section>

  <!-- MARKET DATA -->
  <section class="view" id="v-market">
    <div class="panel"><h2>Symbols on paper</h2><div class="scroll" id="market"></div>
      <div class="note">Last prices come from the most recent engine cycle. Quotes are delayed and not an execution feed.</div></div>
    <div class="panel"><h2>Open positions</h2><div class="scroll" id="positions"></div></div>
  </section>

  <!-- ALERTS -->
  <section class="view" id="v-alerts">
    <div class="panel"><h2>Alerts &amp; events</h2><div class="feed" id="events-all" style="max-height:none"></div></div>
  </section>

  <!-- SETTINGS -->
  <section class="view" id="v-settings">
    <div class="panel">
      <h2>Controls</h2>
      <div class="controls"><input id="tok" type="password" placeholder="dashboard token" autocomplete="off"></div>
      <div class="controls" style="margin-top:10px"><button class="ghost" onclick="act('resume')">Resume paper engine</button><button class="amber" onclick="act('pause')">Pause</button><button onclick="act('retune')">Retune now</button></div>
      <div class="msg" id="msg2"></div>
    </div>
    <div class="panel"><h2>Configuration (read-only)</h2><pre class="cfg" id="cfg"></pre>
      <div class="note">Secrets such as the dashboard token and alert webhook are never shown. Change them on the server.</div></div>
  </section>

</main>
</div>
<footer>
  <span>CPU <b id="f-cpu">-</b></span>
  <span>Memory <b id="f-mem">-</b></span>
  <span>Uptime <b id="f-up">-</b></span>
  <span>Cycles <b id="f-cyc">-</b></span>
  <span>Errors <b id="f-err">-</b></span>
  <span style="margin-left:auto">Last update <b id="f-last">-</b></span>
</footer>
<script>
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = v => "$" + Number(v).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
const pct = (v, d = 2) => (Number(v) * 100).toFixed(d) + "%";
const dash = v => (v === undefined || v === null) ? "-" : v;
function table(rows, cols, empty) {
  if (!rows.length) return '<div class="muted">' + esc(empty) + '</div>';
  return "<table><tr>" + cols.map(c => "<th>" + esc(c[0]) + "</th>").join("") + "</tr>" +
    rows.map(r => "<tr>" + cols.map(c => "<td>" + esc(c[1](r)) + "</td>").join("") + "</tr>").join("") + "</table>";
}
function feed(events, empty) {
  return events.length ? events.map(e => '<div class="evt ' + esc(e.kind) + '"><span class="k">' + esc(e.kind) + '</span>' + esc(e.text) +
    '<div class="t">' + esc(new Date(e.t).toLocaleTimeString()) + '</div></div>').join("") : '<div class="muted">' + esc(empty) + '</div>';
}
function drawCurve(id, noteId, hist) {
  const svg = document.getElementById(id), note = document.getElementById(noteId);
  if (hist.length < 2) { svg.innerHTML = ""; note.textContent = "Equity curve appears after two engine cycles."; return; }
  const vals = hist.map(h => h.equity), lo = Math.min(...vals), hi = Math.max(...vals), span = (hi - lo) || 1;
  const pts = vals.map((v, i) => (i / (vals.length - 1) * 600).toFixed(1) + "," + (200 - (v - lo) / span * 180).toFixed(1)).join(" ");
  svg.innerHTML = '<line x1="0" y1="200" x2="600" y2="200" stroke="#2e2760"/>' +
    '<polyline fill="none" stroke="#8b5cf6" stroke-width="2.5" vector-effect="non-scaling-stroke" points="' + pts + '"/>';
  note.textContent = "Low " + money(lo) + " · High " + money(hi) + " · " + vals.length + " cycles";
}
function fmtUptime(s) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h + "h " + m + "m"; }

function renderCore(s) {
  const running = !s.paused;
  const parts = [
    ["Market data", "yfinance bars · " + s.symbols.length + " symbols"],
    ["Indicators", "RSI · SMA · EMA · MACD"],
    ["Strategy", "pullback rules, per symbol"],
    ["Walk-forward tuner", "out-of-sample gated"],
    ["Risk limits", "stop · take · drawdown alert"],
    ["Paper broker", "simulated fills only"],
    ["Alerts", "log · webhook"],
  ];
  document.getElementById("core").innerHTML = parts.map(([name, desc]) =>
    '<div class="node"><span class="dot' + (running ? "" : " off") + '"></span><b>' + esc(name) + '</b><div class="sub">' + esc(desc) + '</div></div>').join("");
}
function renderFlows(s) {
  document.getElementById("flows").innerHTML = Object.entries(s.params).map(([sym, p]) => {
    const blocks = [
      ["Data", sym + " · " + s.config.data_interval + " bars"],
      ["RSI entry", "≤ " + p.rsi_oversold + " (period " + p.rsi_period + ")"],
      ["Crash filter", "close > 95% of SMA(" + p.sma_window + ")"],
      ["MACD", p.macd_fast + "/" + p.macd_slow + "/" + p.macd_signal + " histogram rising"],
      ["Exit", "RSI ≥ " + p.rsi_overbought + " or close < EMA(" + p.ema_span + ")"],
      ["Risk", "stop " + (p.stop_loss * 100).toFixed(1) + "% · take " + (p.take_profit * 100).toFixed(1) + "%"],
    ];
    return '<div style="margin-bottom:16px"><div class="muted" style="margin-bottom:6px"><b style="color:var(--text)">' + esc(sym) + '</b></div><div class="flow">' +
      blocks.map((b, i) => (i ? '<span class="arrow">→</span>' : "") + '<div class="blk"><b>' + esc(b[0]) + '</b>' + esc(b[1]) + '</div>').join("") +
      '</div></div>';
  }).join("") || '<div class="muted">No strategy loaded.</div>';
}

async function refresh() {
  try {
    const s = await (await fetch("/api/state")).json();
    const last = s.last_cycle ? new Date(s.last_cycle) : null;
    document.getElementById("meta").textContent = "Paper · " + (s.paused ? "paused" : "running");

    // dashboard KPIs
    document.getElementById("k-equity").textContent = money(s.equity);
    const r = document.getElementById("k-return");
    r.textContent = (s.return_pct >= 0 ? "+" : "") + s.return_pct + "% vs starting cash";
    r.className = "sub " + (s.return_pct >= 0 ? "pos" : "neg");
    const dd = document.getElementById("k-dd");
    dd.textContent = pct(s.drawdown); dd.className = "v " + (s.drawdown > 0.05 ? "neg" : "");
    document.getElementById("k-maxdd").textContent = "max " + pct(s.max_drawdown);
    const sh = document.getElementById("k-sharpe");
    sh.textContent = Number(s.sharpe).toFixed(2); sh.className = "v " + (s.sharpe >= 0 ? "pos" : "neg");
    document.getElementById("k-win").textContent = pct(s.win_rate, 1);
    document.getElementById("k-closed").textContent = s.closed_trades + " closed trades";
    document.getElementById("dot").className = "dot" + (s.paused ? " off" : "");
    document.getElementById("s-engine").textContent = s.paused ? "Paused" : "Running";
    document.getElementById("s-data").textContent = last ? "last cycle " + last.toLocaleTimeString() : "waiting";
    document.getElementById("s-state").textContent = "saved · " + money(s.cash) + " cash";
    drawCurve("curve", "curve-note", s.equity_history);
    renderCore(s);
    document.getElementById("events-dash").innerHTML = feed(s.events.slice(0, 12), "No alerts yet.");
    document.getElementById("trades-dash").innerHTML = table(s.recent_trades.slice(0, 20),
      [["Time", r => r.t], ["Symbol", r => r.symbol], ["Side", r => r.side], ["Price", r => r.price],
       ["Qty", r => r.qty], ["Reason", r => r.reason], ["P&L", r => r.pnl ?? ""]], "No executions yet.");

    // strategy
    renderFlows(s);

    // performance
    document.getElementById("p-sharpe").textContent = Number(s.sharpe).toFixed(2);
    document.getElementById("p-vol").textContent = pct(s.volatility);
    document.getElementById("p-maxdd").textContent = pct(s.max_drawdown);
    document.getElementById("p-pf").textContent = Number(s.profit_factor).toFixed(2);
    document.getElementById("p-win").textContent = pct(s.win_rate, 1);
    document.getElementById("p-closed").textContent = s.closed_trades + " closed trades";
    drawCurve("curve2", "curve2-note", s.equity_history);
    document.getElementById("tunes").innerHTML = table(s.tune_log,
      [["Time", r => r.t], ["Symbol", r => r.symbol], ["Accepted", r => r.accepted], ["Reason", r => r.reason],
       ["Valid current", r => r.valid_current], ["Valid candidate", r => r.valid_candidate]], "No tuning runs yet.");

    // market
    document.getElementById("market").innerHTML = table(s.symbols.map(sym => ({
        sym: sym, price: s.last_price[sym], p: s.params[sym] })),
      [["Symbol", r => r.sym], ["Last price", r => r.price === undefined ? "-" : Number(r.price).toFixed(2)],
       ["RSI", r => r.p.rsi_oversold + "/" + r.p.rsi_overbought], ["SMA", r => r.p.sma_window],
       ["EMA", r => r.p.ema_span], ["Stop / take", r => (r.p.stop_loss*100).toFixed(1) + "% / " + (r.p.take_profit*100).toFixed(1) + "%"]],
      "No symbols configured.");
    document.getElementById("positions").innerHTML = table(
      Object.entries(s.open_positions).map(([sym, p]) => Object.assign({sym: sym}, p)),
      [["Symbol", r => r.sym], ["Qty", r => Number(r.qty).toFixed(2)], ["Entry", r => Number(r.entry_px).toFixed(2)],
       ["Stop", r => Number(r.stop).toFixed(2)], ["Take", r => Number(r.take).toFixed(2)]], "No open positions.");

    // alerts
    document.getElementById("events-all").innerHTML = feed(s.events, "No alerts yet. Trades, tuning decisions, drawdown breaches and errors appear here.");

    // settings
    document.getElementById("cfg").textContent = JSON.stringify(s.config, null, 2);

    // footer
    const sys = s.system || {};
    document.getElementById("f-cpu").textContent = sys.cpu_percent !== undefined ? sys.cpu_percent + "%" : "-";
    document.getElementById("f-mem").textContent = sys.memory_percent !== undefined ? sys.memory_percent + "%" : "-";
    document.getElementById("f-up").textContent = fmtUptime(s.uptime_s);
    document.getElementById("f-cyc").textContent = s.cycles;
    document.getElementById("f-err").textContent = s.errors.length;
    document.getElementById("f-last").textContent = last ? last.toLocaleTimeString() : "never";
  } catch (e) {
    document.getElementById("meta").textContent = "dashboard offline";
  }
}
async function act(name) {
  const tok = document.getElementById("tok").value || document.getElementById("tok-bt").value;
  const r = await fetch("/api/" + name, {method: "POST", headers: {"X-Dashboard-Token": tok}});
  const text = r.ok ? name + ": ok" : name + " failed (" + r.status + ")";
  document.getElementById("msg").textContent = text;
  document.getElementById("msg2").textContent = text;
  refresh();
}
async function runBacktest() {
  const tok = document.getElementById("tok-bt").value || document.getElementById("tok").value;
  const out = document.getElementById("bt-out");
  document.getElementById("bt-msg").textContent = "Running backtest on the tuning history...";
  const r = await fetch("/api/backtest", {method: "POST", headers: {"X-Dashboard-Token": tok}});
  if (!r.ok) { document.getElementById("bt-msg").textContent = "Backtest failed (" + r.status + ")"; return; }
  const data = await r.json();
  document.getElementById("bt-msg").textContent = "Backtest complete. Not live performance.";
  out.innerHTML = table(Object.entries(data).map(([sym, v]) => Object.assign({sym: sym}, v)),
    [["Symbol", r => r.sym], ["Return", r => r.error ? r.error : pct(r.total_return)], ["Max DD", r => r.error ? "" : pct(r.max_drawdown)],
     ["Sharpe", r => r.error ? "" : Number(r.sharpe).toFixed(2)], ["Win rate", r => r.error ? "" : pct(r.win_rate, 1)],
     ["Profit factor", r => r.error ? "" : Number(r.profit_factor).toFixed(2)], ["Trades", r => r.error ? "" : r.trades]], "No results.");
}

// tab switching
document.querySelectorAll("aside a").forEach(a => a.addEventListener("click", () => {
  document.querySelectorAll("aside a").forEach(x => x.classList.remove("on"));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("on"));
  a.classList.add("on");
  document.getElementById("v-" + a.dataset.view).classList.add("on");
}));

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


SAFE_CONFIG_KEYS = (
    "symbols", "data_period", "data_interval", "tune_period", "interval_seconds",
    "retune_hours", "starting_cash", "commission_rate", "slippage_bps", "max_drawdown_alert",
)


@app.get("/api/state")
def state() -> dict:
    st = engine.status()
    st["config"] = {k: getattr(settings, k) for k in SAFE_CONFIG_KEYS}  # never token or webhook
    if psutil is not None:
        st["system"] = {
            "cpu_percent": psutil.cpu_percent(interval=None),
            "memory_percent": psutil.virtual_memory().percent,
        }
    return st


@app.post("/api/backtest")
def backtest(x_dashboard_token: str | None = Header(default=None)):
    """Run the current parameters over the tuning history. Read-only: changes no paper state."""
    _require_token(x_dashboard_token)
    out = {}
    for sym in settings.symbols:
        try:
            df = fetch_bars(sym, settings.tune_period, settings.data_interval)
            with engine.lock:
                params = engine.params[sym]
            r = simulate(df, params, start_cash=settings.starting_cash, commission=settings.commission_rate,
                         slippage_bps=settings.slippage_bps, bars_per_year=settings.bars_per_year)
            out[sym] = {"total_return": round(r.total_return, 4), "max_drawdown": round(r.max_drawdown, 4),
                        "sharpe": round(r.sharpe, 3), "win_rate": round(r.win_rate, 4),
                        "profit_factor": round(r.profit_factor, 3), "trades": r.trades}
        except Exception as exc:
            out[sym] = {"error": f"{type(exc).__name__}: {exc}"}
    return out


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
