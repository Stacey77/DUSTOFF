"""Check-agent solver layer 1: build an ngspice deck from the design and run it."""
import os, re, subprocess, tempfile


def build_deck(design, req, duty, sim_time=1.2e-3, measure_window=1.5e-4):
    """design: dict of role -> (component, part). Topology: synchronous buck."""
    reg = design["regulator"][1]
    ind = design["inductor"][1]
    caps = design["capacitors"]
    fsw = reg["fsw"]
    period = 1.0 / fsw
    ton = duty * period
    rload = req["vout"] / req["iout"]
    c_total = sum(p["capacitance"] for _, p in caps)
    esr = 1.0 / sum(1.0 / p["esr"] for _, p in caps)
    t0 = sim_time - measure_window
    edge = 2e-9
    return f"""* auto-generated: {design['regulator'][0].ref} {design['regulator'][0].mpn}, {design['inductor'][0].ref} {design['inductor'][0].mpn}
Vin vin 0 DC {req['vin']}
Vgh gh 0 PULSE(0 10 0 {edge} {edge} {ton - edge:.6e} {period:.6e})
Vgl gl 0 PULSE(10 0 0 {edge} {edge} {ton - edge:.6e} {period:.6e})
Shs vin sw gh 0 SWH
Sls sw 0 gl 0 SWL
.model SWH SW(Ron={reg['rds_high']} Roff=1e6 Vt=5 Vh=0.1)
.model SWL SW(Ron={reg['rds_low']} Roff=1e6 Vt=5 Vh=0.1)
Dbody 0 sw DB
.model DB D(Is=1e-9 N=1.5)
L1 sw lx {ind['inductance']} IC={req['iout']}
Rdcr lx out {ind['dcr_max']}
Cout out cx {c_total} IC={req['vout']}
Resr cx 0 {esr}
Rload out 0 {rload}
.tran 20n {sim_time} {t0} UIC
.control
run
meas tran vout_avg AVG v(out) from={t0} to={sim_time}
meas tran vout_pp PP v(out) from={t0} to={sim_time}
meas tran il_max MAX i(L1) from={t0} to={sim_time}
meas tran il_min MIN i(L1) from={t0} to={sim_time}
meas tran il_rms RMS i(L1) from={t0} to={sim_time}
meas tran iin_avg AVG i(Vin) from={t0} to={sim_time}
wrdata waveform.dat v(out) i(L1)
.endc
.end
"""


def run(design, req, duty, workdir):
    os.makedirs(workdir, exist_ok=True)
    deck = build_deck(design, req, duty)
    path = os.path.join(workdir, "deck.cir")
    open(path, "w").write(deck)
    out = subprocess.run(["ngspice", "-b", "deck.cir"], cwd=workdir, capture_output=True, text=True, timeout=300)
    vals = {}
    for m in re.finditer(r"^(\w+)\s*=\s*([-+0-9.eE]+)", out.stdout, re.M):
        vals[m.group(1)] = float(m.group(2))
    need = ["vout_avg", "vout_pp", "il_max", "il_min", "il_rms", "iin_avg"]
    if not all(k in vals for k in need):
        raise RuntimeError("ngspice did not return all measurements:\n" + out.stdout[-2000:] + out.stderr[-2000:])
    return vals, deck


def regulate(design, req, workdir, tol=0.002, max_iter=6):
    """Trim duty until Vout is within tol of target, standing in for the regulator's control loop."""
    duty = req["vout"] / req["vin"]
    for i in range(max_iter):
        vals, deck = run(design, req, duty, workdir)
        err = (vals["vout_avg"] - req["vout"]) / req["vout"]
        if abs(err) < tol:
            break
        duty = min(0.95, duty * req["vout"] / vals["vout_avg"])
    pin = -vals["iin_avg"] * req["vin"]
    pout = vals["vout_avg"] ** 2 / (req["vout"] / req["iout"])
    p_ind = vals["il_rms"] ** 2 * design["inductor"][1]["dcr_max"]
    vals.update(duty=duty, pin=pin, pout=pout, p_total=pin - pout, p_inductor=p_ind,
                p_regulator=max(pin - pout - p_ind, 0.0), efficiency=pout / pin, iterations=i + 1)
    return vals, deck
