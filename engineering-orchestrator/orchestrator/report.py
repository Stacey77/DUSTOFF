"""Review packet: one self-contained HTML page with every decision, its reason, and the solver evidence."""
import base64, html, io, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def _png(fig):
    buf = io.BytesIO(); fig.savefig(buf, format="png", dpi=150, bbox_inches="tight"); plt.close(fig)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def waveform_plot(outdir, history):
    fig, ax = plt.subplots(figsize=(8, 3.4))
    colors = ["#d9472b", "#e0a030", "#2f6fdb", "#2a9d6a", "#7a4fd0", "#555"]
    for h in history:
        path = os.path.join(outdir, f"round{h['round']}", "waveform.dat")
        if not os.path.exists(path):
            continue
        d = np.loadtxt(path); t = d[:, 0]; il = d[:, 3]
        m = t >= t[-1] - 6e-6
        ax.plot((t[m] - t[m][0]) * 1e6, il[m], lw=1.6, color=colors[(h["round"] - 1) % len(colors)],
                label=f"Round {h['round']}: U1 {h['parts'].get('U1')}, L1 {h['parts'].get('L1')}, peak {h['sim']['il_max']:.2f} A")
    ax.set_xlabel("Time (µs)"); ax.set_ylabel("Inductor current (A)"); ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, fontsize=8, loc="best")
    return _png(fig)


def thermal_plot(fem):
    pts, temp, tri = fem["grid"]
    fig, ax = plt.subplots(figsize=(4.4, 3.6))
    tc = ax.tripcolor(pts[0] * 1000, pts[1] * 1000, tri.T, temp, shading="gouraud", cmap="inferno")
    fig.colorbar(tc, ax=ax, label="°C"); ax.set_aspect("equal"); ax.set_xlabel("mm"); ax.set_ylabel("mm")
    ax.set_title("Board temperature (final round)", fontsize=10)
    return _png(fig)


def write(outdir, title, req, log, history, fem):
    e = html.escape
    rows = []
    for ev in log.events:
        cls = {"fail": "fail", "warn": "warn", "pass": "pass", "approved": "ok", "stop": "warn"}.get(ev["kind"], "")
        rows.append(f"<tr class='{cls}'><td>{e(ev['agent'])}</td><td>{e(ev['text'])}</td></tr>")
    final = history[-1]
    checks = "".join(f"<tr class='{r['status']}'><td>{e(r['text'])}</td><td>{e(str(r['measured']))}</td>"
                     f"<td>{e(str(r['limit']))}</td><td>{r['status'].upper()}</td></tr>" for r in final["rules"])
    opts = [ev for ev in log.events if ev["kind"] == "options"]
    sources = sorted({o.get("source") for ev in opts for o in ev["options"] if o.get("source")})
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title><style>
:root{{--bg:#fbfaf7;--fg:#1c1d21;--muted:#5b5f6a;--line:#e3e1db;--fail:#c0392b;--warn:#b7791f;--pass:#2a7d4f}}
@media (prefers-color-scheme:dark){{:root{{--bg:#121316;--fg:#ececee;--muted:#a3a7b1;--line:#2c2e34;--fail:#ff7a6b;--warn:#f0b54a;--pass:#5fd39a}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 -apple-system,Segoe UI,Inter,sans-serif}}
main{{max-width:960px;margin:0 auto;padding:32px 16px 64px}} h1{{font-size:1.6rem;margin:0 0 4px}} h2{{font-size:1.15rem;margin:36px 0 10px}}
.muted{{color:var(--muted)}} table{{width:100%;border-collapse:collapse;font-size:.88rem;display:block;overflow-x:auto}}
td,th{{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}} th{{color:var(--muted)}}
tr.fail td:last-child,tr.fail td:first-child{{color:var(--fail);font-weight:600}} tr.warn td:last-child{{color:var(--warn)}}
tr.pass td:last-child{{color:var(--pass)}} tr.ok td:first-child{{color:var(--pass);font-weight:600}}
img{{max-width:100%;border:1px solid var(--line);border-radius:6px;background:#fff}} .grid{{display:grid;grid-template-columns:2fr 1fr;gap:16px}}
@media (max-width:700px){{.grid{{grid-template-columns:1fr}}}}
</style></head><body><main>
<h1>{e(title)}</h1>
<p class="muted">Requirement: {req['vin']} V in, {req['vout']} V out ±{req['vout_tolerance']*100:.0f}%, {req['iout']} A, ambient {req['t_ambient']} °C, max rise {req['max_rise']} °C.
Final parts: {e(', '.join(f'{k}={v}' for k, v in final['parts'].items()))}; copper pour {'on' if final['board'].get('copper_pour') else 'off'}.
Result: <b>{'all checks pass' if all(r['status'] != 'fail' for r in final['rules']) else 'open failures — engineer decision needed'}</b>.</p>
<h2>Final checks</h2><table><tr><th>Check</th><th>Measured</th><th>Limit</th><th>Result</th></tr>{checks}</table>
<h2>Solver evidence</h2><div class="grid"><img alt="Inductor current per round" src="{waveform_plot(outdir, history)}"><img alt="Board temperature map" src="{thermal_plot(fem)}"></div>
<h2>Decision log</h2><table><tr><th>Agent</th><th>Event</th></tr>{''.join(rows)}</table>
<h2>Datasheet sources</h2><ul>{''.join(f'<li><a href="{e(s)}">{e(s)}</a></li>' for s in sources) or '<li>None used</li>'}</ul>
<p class="muted">Circuit: ngspice transient, switch-level synchronous buck with datasheet Rds(on), duty trimmed to regulate Vout. Thermal: 2-D finite-element board model (scikit-fem), convection 10 W/m²K both faces, plus datasheet RθJA estimate; the higher of the two is checked.</p>
</main></body></html>"""
    path = os.path.join(outdir, "review_packet.html")
    open(path, "w").write(page)
    return path
