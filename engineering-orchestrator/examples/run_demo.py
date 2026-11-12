"""Runs both scenarios from the overview on the example KiCad netlist and writes a review packet for each.

Scenario 1: new 2A design. The engineer prefers a layout fix for heat when one is offered (copper pour),
            otherwise takes the top-ranked part swap.
Scenario 2: the customer raises the load to 3A. Starts from Scenario 1's approved design; only the
            checks that depend on load current are reopened.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from orchestrator.agents import orchestrate
from orchestrator import report

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NET = os.path.join(ROOT, "examples", "buck_5v_3v3.net")
LIB = os.path.join(ROOT, "parts", "library.yaml")


def prefer_layout(failure, options):
    for o in options:
        if o["action"] == "layout":
            return o
    return options[0] if options else None


def scenario(name, req, out, prev=None, approve=None):
    state, log, history, r, fem = orchestrate(NET, os.path.join(ROOT, "examples", req), LIB, out, prev, approve)
    path = report.write(out, f"Review packet — {name}", r, log, history, fem)
    print(f"-> {path}  passed={state['passed']}\n")
    return state


if __name__ == "__main__":
    out = os.path.join(ROOT, "out")
    s1 = scenario("Scenario 1: new 2A design", "req_2A.yaml", os.path.join(out, "scenario1_2A"), approve=prefer_layout)
    s2 = scenario("Scenario 2: load raised to 3A", "req_3A.yaml", os.path.join(out, "scenario2_3A"), prev=s1,
                  approve=lambda f, o: o[0] if o else None)
    sys.exit(0 if s1["passed"] and s2["passed"] else 1)
