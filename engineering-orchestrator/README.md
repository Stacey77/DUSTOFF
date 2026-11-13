# Nova Digitus Engineering Orchestrator — core

Agents coordinate the design checks. Solvers supply the numbers. The engineer approves every change.

Reads a KiCad netlist, looks up each part in a datasheet-sourced library, simulates the circuit in ngspice,
solves board temperature with a finite-element model, flags every rating it breaks, proposes fixes that clear
each flag, and writes a review packet with every decision and its evidence.

## Run it

```
# Linux / WSL. On Windows, install ngspice and put it on PATH, then use the same commands in PowerShell.
sudo apt-get install ngspice
pip install pyyaml numpy scipy matplotlib scikit-fem

python examples/run_demo.py          # both scenarios, review packets in out/
python tests/verify.py               # independent checks (7)

# your own design: engineer approves each fix at the prompt
python -m orchestrator.cli path/to/design.net path/to/requirement.yaml --out out/mydesign
# change-impact mode: start from an approved design, reopen only affected checks
python -m orchestrator.cli design.net new_req.yaml --from out/mydesign/design_state.json --out out/change1
```

## The agents

| Agent | Does | Evidence |
| --- | --- | --- |
| Planning | Queues checks; on a requirement change, reopens only the checks that depend on what changed | Impact trace in the log |
| Drafting | Reads the KiCad netlist and maps each part (by MPN field) to the library | Parts list |
| Check | Runs ngspice (switch-level synchronous buck, datasheet Rds(on), DCR, ESR); trims duty to regulate Vout; checks ratings | Measured Vout, ripple, peak and RMS current, losses |
| Thermal | 2-D finite-element board model (scikit-fem) with the simulated losses; junction = board temp + P × ψJB | Temperature map, junction estimate |
| Fix | Finds library parts or layout changes that clear each failure, ranked by margin | Datasheet numbers and source link per option |
| Review | Nothing changes without approval (`--approve ask`, the default) | Decision log, `review_log.json`, `review_packet.html` |

## Verified

`tests/verify.py`: KiCad parse; thermal FEM vs analytic (exact); thermal mesh convergence (<1%);
ngspice ripple current vs hand calculation (<1%); energy balance; both demo scenarios end with the expected parts.

## Limits (stated plainly)

- Topology: synchronous buck only. Other topologies need their own deck builders.
- Switching losses and inductor saturation curves are not modeled; saturation is checked as a rating.
  Real losses are somewhat higher than simulated.
- Duty trimming stands in for the regulator's control loop. Loop stability and transients are not checked.
- Thermal: 2-D plate model, natural convection 10 W/m²K, copper coverage 20% (no pour) or 100% (pour).
  Elmer (3-D) is the production target; OpenEMS for field/EMI is not integrated yet.
- The parts library has 6 parts. Each rating was read from the linked datasheet; capacitors are generic.
- Agents are deterministic Python. An LLM can be added for reading free-text requirements; it is not needed
  for any check and never decides a pass or fail.
