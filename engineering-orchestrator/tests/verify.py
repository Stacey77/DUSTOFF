"""Independent checks: solvers against hand calculations, mesh convergence, netlist parsing, end-to-end outcome."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from orchestrator import thermal, spice
from orchestrator.kicad import read_netlist
from orchestrator.agents import load_library, drafting_agent, Log

results = []


def check(name, ok, detail):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")


# 1. KiCad netlist parsing
net = read_netlist(os.path.join(ROOT, "examples", "buck_5v_3v3.net"))
check("KiCad import", set(net.components) == {"U1", "L1", "C1", "C2"} and net.net_of("L1", pin="1") == "SW"
      and net.components["L1"].mpn == "LPS4018-472", f"{len(net.components)} parts, {len(net.nets)} nets, L1 pin 1 on SW")

# 2. Thermal FEM vs analytic (uniform heating: rise = P / (2 h A))
fem, exact = thermal.validate()
check("Thermal FEM vs analytic", abs(fem - exact) / exact < 0.01, f"{fem:.3f} C vs {exact:.3f} C")

# 3. Thermal mesh convergence on a concentrated source
src = [{"name": "U1", "x_mm": 20, "y_mm": 25, "w_mm": 3, "h_mm": 3, "watts": 0.5}]
a = thermal.solve_board(50, 50, src, 40, True, refine=6)["sources"]["U1"]
b = thermal.solve_board(50, 50, src, 40, True, refine=7)["sources"]["U1"]
check("Thermal mesh convergence", abs(a - b) / (b - 40) < 0.05, f"{a:.2f} C (64x64) vs {b:.2f} C (128x128)")

# 4. ngspice ripple current vs hand formula dI = (Vin - Vout) D / (L f)
lib = load_library(os.path.join(ROOT, "parts", "library.yaml"))
design = drafting_agent(os.path.join(ROOT, "examples", "buck_5v_3v3.net"), lib, {"U1": "TPS564201", "L1": "XAL4030-472"}, Log())
req = dict(vin=5.0, vout=3.3, iout=3.0)
sim, _ = spice.regulate(design, req, os.path.join(ROOT, "out", "verify_spice"))
reg, ind = design["regulator"][1], design["inductor"][1]
# voltage across L during on-time = Vin - I*Rds_high - Vout - I*DCR
v_on = 5.0 - req["iout"] * reg["rds_high"] - sim["vout_avg"] - req["iout"] * ind["dcr_max"]
d_hand = v_on * sim["duty"] / (ind["inductance"] * reg["fsw"])
d_sim = sim["il_max"] - sim["il_min"]
check("ngspice ripple vs hand calc", abs(d_sim - d_hand) / d_hand < 0.03, f"{d_sim:.3f} A vs {d_hand:.3f} A")
check("ngspice energy balance", abs(sim["pin"] - sim["pout"] - sim["p_total"]) < 1e-9 and 0.8 < sim["efficiency"] < 0.99,
      f"Pin {sim['pin']:.3f} W, Pout {sim['pout']:.3f} W, efficiency {sim['efficiency']*100:.1f}%")

# 5. End-to-end outcome from the demo run
for scen, parts in [("scenario1_2A", {"U1": "TPS562201", "L1": "XAL4030-472"}),
                    ("scenario2_3A", {"U1": "TPS564201", "L1": "XAL4030-472"})]:
    st = json.load(open(os.path.join(ROOT, "out", scen, "design_state.json")))
    check(f"End to end {scen}", st["passed"] and st["final_parts"] == parts, f"final parts {st['final_parts']}")

print(f"\n{sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
