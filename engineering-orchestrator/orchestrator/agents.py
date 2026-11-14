"""The agent roles. Each one is a plain, inspectable step; every number it acts on comes from a solver or a datasheet."""
import copy, datetime, json, os
import yaml
from . import spice, thermal
from .kicad import read_netlist

ROLE_OF_KIND = {"buck_regulator": "regulator"}

# Which checks depend on which requirement fields (used by the planning agent's impact trace).
DEPENDS = {
    "vin": ["regulator_vin", "duty", "inductor_peak", "inductor_rms", "regulator_current", "ripple", "thermal"],
    "vout": ["duty", "vout_accuracy", "inductor_peak", "ripple", "thermal"],
    "iout": ["inductor_peak", "inductor_rms", "regulator_current", "thermal", "vout_accuracy"],
    "t_ambient": ["thermal"],
    "max_rise": ["thermal"],
    "ripple_max": ["ripple"],
    "vout_tolerance": ["vout_accuracy"],
    "derating": ["inductor_peak", "regulator_current"],
    "board": ["thermal"],
}
CHECK_PARTS = {
    "regulator_vin": "regulator", "regulator_current": "regulator", "duty": "regulator",
    "inductor_peak": "inductor", "inductor_rms": "inductor", "ripple": "capacitors",
    "vout_accuracy": "regulator", "thermal": "regulator, inductor, board",
}


def load_library(path):
    lib = yaml.safe_load(open(path))
    flat = {}
    for cat, parts in lib.items():
        for mpn, p in parts.items():
            clean = {}
            for k, v in p.items():
                if isinstance(v, str):
                    try:
                        v = float(v)  # YAML 1.1 reads 580e3 or 4.7e-6 as text
                    except ValueError:
                        pass
                clean[k] = v
            flat[mpn] = dict(clean, mpn=mpn, category=cat)
    return flat


class Log:
    def __init__(self):
        self.events = []

    def add(self, agent, kind, text, **data):
        e = {"time": datetime.datetime.now().isoformat(timespec="seconds"), "agent": agent, "kind": kind, "text": text}
        e.update(data)
        self.events.append(e)
        print(f"[{agent:<10}] {text}")
        return e


# ---------------------------------------------------------------- planning
def planning_agent(req, prev_req, log):
    if prev_req is None:
        checks = sorted({c for v in DEPENDS.values() for c in v})
        log.add("planning", "plan", f"New design: {len(checks)} checks queued.", checks=checks)
        return checks
    changed = {k: (prev_req.get(k), req.get(k)) for k in set(req) | set(prev_req) if prev_req.get(k) != req.get(k) and k != "name"}
    checks = sorted({c for k in changed for c in DEPENDS.get(k, [])})
    for k, (a, b) in changed.items():
        log.add("planning", "change", f"Requirement changed: {k} {a} -> {b}")
    untouched = sorted({c for v in DEPENDS.values() for c in v} - set(checks))
    log.add("planning", "plan", f"Impact trace: {len(checks)} checks reopened ({', '.join(checks)}); "
            f"{len(untouched)} stay approved.", checks=checks, untouched=untouched)
    return checks


# ---------------------------------------------------------------- design intake
def drafting_agent(netlist_path, library, overrides, log):
    net = read_netlist(netlist_path)
    design = {"capacitors": []}
    for ref, comp in net.components.items():
        mpn = overrides.get(ref, comp.mpn)
        part = library.get(mpn)
        if part is None:
            log.add("drafting", "warning", f"{ref} {mpn} is not in the parts library; it will not be checked.")
            continue
        role = ROLE_OF_KIND.get(part.get("kind"), part["category"][:-1])
        c = copy.copy(comp)
        c.fields = dict(comp.fields, MPN=mpn)
        if role == "capacitor":
            design["capacitors"].append((c, part))
        else:
            design[role] = (c, part)
    if net.net_of("U1", function="SW") is None:
        raise ValueError("Netlist has no SW net on U1; only synchronous buck topologies are supported so far.")
    parts = ", ".join(f"{c.ref}={p['mpn']}" for c, p in [design['regulator'], design['inductor']] + design['capacitors'])
    log.add("drafting", "design", f"Read KiCad netlist {os.path.basename(netlist_path)}: {parts}", overrides=overrides)
    return design


# ---------------------------------------------------------------- check (solver layer 1 + datasheet rules)
def check_agent(design, req, workdir, log):
    sim, deck = spice.regulate(design, req, workdir)
    log.add("check", "sim", f"ngspice: Vout {sim['vout_avg']:.3f} V, ripple {sim['vout_pp']*1000:.1f} mV, "
            f"IL peak {sim['il_max']:.2f} A, IL rms {sim['il_rms']:.2f} A, efficiency {sim['efficiency']*100:.1f}%, "
            f"duty {sim['duty']:.3f} ({sim['iterations']} runs)", sim=sim)
    reg, ind = design["regulator"][1], design["inductor"][1]
    d = req.get("derating", 1.0)
    r = []

    def rule(check, ok, measured, limit, text, part=None, warn=False):
        r.append(dict(check=check, status="pass" if ok else ("warn" if warn else "fail"), measured=measured,
                      limit=limit, text=text, part=part))

    rule("regulator_vin", reg["vin_min"] <= req["vin"] <= reg["vin_max"], req["vin"],
         f"{reg['vin_min']}-{reg['vin_max']} V", f"Input voltage within {reg['mpn']} range", reg["mpn"])
    rule("regulator_current", req["iout"] <= reg["iout_rated"], req["iout"], f"{reg['iout_rated']} A rated",
         f"Load current vs {reg['mpn']} output rating", reg["mpn"])
    rule("regulator_current", req["iout"] <= d * reg["current_limit_min"], req["iout"],
         f"{d*reg['current_limit_min']:.2f} A ({d:.0%} of {reg['current_limit_min']} A current limit, min)",
         f"Load current vs {reg['mpn']} current limit (worst case)", reg["mpn"])
    rule("inductor_peak", sim["il_max"] <= ind["isat"], round(sim["il_max"], 3), f"{ind['isat']} A Isat",
         f"Inductor peak current vs {ind['mpn']} saturation", ind["mpn"])
    if sim["il_max"] <= ind["isat"]:
        rule("inductor_peak", sim["il_max"] <= d * ind["isat"], round(sim["il_max"], 3),
             f"{d*ind['isat']:.2f} A ({d:.0%} of Isat)", f"Inductor saturation margin", ind["mpn"], warn=True)
    rule("inductor_rms", sim["il_rms"] <= ind["irms_40c"], round(sim["il_rms"], 3), f"{ind['irms_40c']} A (40 C rise)",
         f"Inductor RMS current vs {ind['mpn']} heating rating", ind["mpn"])
    tol = req["vout_tolerance"] * req["vout"]
    rule("vout_accuracy", abs(sim["vout_avg"] - req["vout"]) <= tol, round(sim["vout_avg"], 4),
         f"{req['vout']-tol:.3f}-{req['vout']+tol:.3f} V", "Output voltage in tolerance")
    rule("ripple", sim["vout_pp"] <= req["ripple_max"], round(sim["vout_pp"] * 1000, 2), f"{req['ripple_max']*1000:.0f} mV",
         "Output ripple, mV peak to peak")
    for x in r:
        if x["status"] != "pass":
            log.add("check", x["status"], f"{x['status'].upper()}: {x['text']}: {x['measured']} vs {x['limit']}", rule=x)
    return sim, r, deck


# ---------------------------------------------------------------- thermal (solver layer 2)
def thermal_agent(design, req, sim, log):
    reg, ind = design["regulator"][1], design["inductor"][1]
    tj_datasheet = req["t_ambient"] + sim["p_regulator"] * reg["theta_ja"]
    ind_rise = 20.0 * (sim["il_rms"] / ind["irms_20c"]) ** 2  # Irms rating is defined at 20 C rise; rise scales with I^2
    b = req["board"]
    fem = thermal.solve_board(b["width_mm"], b["height_mm"], [
        {"name": "U1", "x_mm": b["width_mm"] * 0.4, "y_mm": b["height_mm"] / 2, "w_mm": 3, "h_mm": 3, "watts": sim["p_regulator"]},
        {"name": "L1", "x_mm": b["width_mm"] * 0.4 + 6, "y_mm": b["height_mm"] / 2, "w_mm": 4, "h_mm": 4, "watts": sim["p_inductor"]},
    ], req["t_ambient"], b.get("copper_pour", False))
    limit = min(req["t_ambient"] + req["max_rise"], reg["tj_max"])
    r = []
    t_board = fem["sources"]["U1"]
    tj = t_board + sim["p_regulator"] * reg["psi_jb"]  # junction = board under the part + P x psi_JB (datasheet)
    r.append(dict(check="thermal", status="pass" if tj <= limit else "fail", measured=round(tj, 1),
                  limit=f"{limit} C ({req['max_rise']} C rise)", part=reg["mpn"], board_temp=t_board,
                  text=f"{reg['mpn']} junction temperature: board {t_board:.1f} C (FEM) + "
                       f"{sim['p_regulator']:.2f} W x {reg['psi_jb']} C/W psi_JB"))
    r.append(dict(check="thermal", status="pass" if ind_rise <= req["max_rise"] else "fail", measured=round(ind_rise, 1),
                  limit=f"{req['max_rise']} C rise", part=ind["mpn"],
                  text=f"{ind['mpn']} self-heating at {sim['il_rms']:.2f} A rms"))
    log.add("thermal", "sim", f"Board FEM (copper pour {'on' if b.get('copper_pour') else 'off'}): U1 board {t_board:.1f} C, "
            f"L1 {fem['sources']['L1']:.1f} C; {reg['mpn']} junction {tj:.1f} C "
            f"(reference: JEDEC-board RθJA estimate {tj_datasheet:.1f} C); "
            f"losses U1 {sim['p_regulator']:.2f} W, L1 {sim['p_inductor']:.2f} W", fem_kt=fem["kt"])
    for x in r:
        if x["status"] != "pass":
            log.add("thermal", "fail", f"FAIL: {x['text']} vs limit {x['limit']}", rule=x)
    return r, fem


# ---------------------------------------------------------------- fix options
def fix_agent(failure, design, req, sim, library):
    """Return options that clear this failure, each with the evidence that it does."""
    opts = []
    reg, ind = design["regulator"][1], design["inductor"][1]
    d = req.get("derating", 1.0)
    if failure["check"] in ("inductor_peak", "inductor_rms") or (failure["check"] == "thermal" and failure["part"] == ind["mpn"]):
        for p in library.values():
            if p["category"] != "inductors" or p["mpn"] == ind["mpn"]:
                continue
            if abs(p["inductance"] - ind["inductance"]) / ind["inductance"] > 0.01:
                continue  # different inductance changes the waveform; needs a new draft, not a swap
            peak_ok = sim["il_max"] <= d * p["isat"]
            rms_ok = sim["il_rms"] <= p["irms_20c"] * (req["max_rise"] / 20) ** 0.5
            if peak_ok and rms_ok:
                opts.append(dict(action="swap", role="inductor", ref=design["inductor"][0].ref, mpn=p["mpn"],
                                 reason=f"{p['mpn']}: Isat {p['isat']} A vs {sim['il_max']:.2f} A peak, "
                                        f"Irms {p['irms_20c']} A (20 C rise), same {p['inductance']*1e6:.1f} uH, {p['footprint']}",
                                 margin=p["isat"] / sim["il_max"], source=p["source"]))
    if failure["check"] in ("regulator_current", "regulator_vin") or (failure["check"] == "thermal" and failure["part"] == reg["mpn"]):
        for p in library.values():
            if p.get("kind") != "buck_regulator" or p["mpn"] == reg["mpn"]:
                continue
            if not (p["vin_min"] <= req["vin"] <= p["vin_max"]):
                continue
            if req["iout"] > p["iout_rated"] or req["iout"] > d * p["current_limit_min"]:
                continue
            est_loss = sim["p_regulator"] * (p["rds_high"] + p["rds_low"]) / (reg["rds_high"] + reg["rds_low"])
            if "board_temp" in failure:  # board rise scales with total dissipated power
                ratio = (est_loss + sim["p_inductor"]) / max(sim["p_regulator"] + sim["p_inductor"], 1e-9)
                est_tj = req["t_ambient"] + (failure["board_temp"] - req["t_ambient"]) * ratio + est_loss * p["psi_jb"]
            else:
                est_tj = req["t_ambient"] + est_loss * p["theta_ja"]
            opts.append(dict(action="swap", role="regulator", ref=design["regulator"][0].ref, mpn=p["mpn"],
                             reason=f"{p['mpn']}: {p['iout_rated']} A rated, {p['current_limit_min']} A current limit (min), "
                                    f"lower Rds(on) {p['rds_high']*1000:.0f}/{p['rds_low']*1000:.0f} mOhm, est. {est_tj:.0f} C; same {p['footprint']}",
                             margin=p["current_limit_min"] / req["iout"], source=p["source"]))
    if failure["check"] == "thermal" and not req["board"].get("copper_pour"):
        opts.append(dict(action="layout", role="board", ref="PCB", mpn=None, margin=1.0,
                         reason="Add copper pour on both layers around U1 and L1 (spreads heat; checked by board FEM)"))
    return sorted(opts, key=lambda o: -o["margin"])


# ---------------------------------------------------------------- orchestration
def orchestrate(netlist, req_path, library_path, outdir, prev_state=None, approve=None):
    """approve(failure, options) -> chosen option or None. Default: engineer approval is required (stop)."""
    os.makedirs(outdir, exist_ok=True)
    library = load_library(library_path)
    req = yaml.safe_load(open(req_path))
    log = Log()
    prev_req = prev_state["requirement"] if prev_state else None
    overrides = dict(prev_state["overrides"]) if prev_state else {}
    planning_agent(req, prev_req, log)  # compares the engineer's requirement files only
    if prev_state:  # then carry forward layout changes already approved
        req["board"] = dict(req.get("board", {}), **prev_state.get("board_changes", {}))
    board_changes = dict(prev_state.get("board_changes", {})) if prev_state else {}
    history = []
    for round_ in range(1, 8):
        design = drafting_agent(netlist, library, overrides, log)
        sim, rules, deck = check_agent(design, req, os.path.join(outdir, f"round{round_}"), log)
        trules, fem = thermal_agent(design, req, sim, log)
        allr = rules + trules
        history.append(dict(round=round_, parts={c.ref: p["mpn"] for c, p in [design["regulator"], design["inductor"]]},
                            board=dict(req["board"]), sim=sim, rules=allr))
        fails = [x for x in allr if x["status"] == "fail"]
        if not fails:
            log.add("check", "pass", f"All {len(allr)} checks pass.")
            break
        f = fails[0]
        opts = fix_agent(f, design, req, sim, library)
        log.add("fix", "options", f"{len(opts)} option(s) for: {f['text']}", options=opts, failure=f)
        choice = approve(f, opts) if approve else None
        if choice is None:
            log.add("review", "stop", "Waiting for engineer approval; nothing changed.")
            break
        log.add("review", "approved", f"Approved: {choice['reason']}", choice=choice)
        if choice["action"] == "swap":
            overrides[choice["ref"]] = choice["mpn"]
        elif choice["action"] == "layout":
            board_changes["copper_pour"] = True
            req["board"]["copper_pour"] = True
    state = dict(requirement=yaml.safe_load(open(req_path)), overrides=overrides, board_changes=board_changes,
                 final_parts=history[-1]["parts"], passed=not fails)
    json.dump(state, open(os.path.join(outdir, "design_state.json"), "w"), indent=2)
    json.dump(dict(events=log.events, history=history), open(os.path.join(outdir, "review_log.json"), "w"), indent=2, default=str)
    return state, log, history, req, fem
