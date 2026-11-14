"""Command line: nova-orch check <netlist> <requirement> [--from state.json] [--approve auto|ask|none]"""
import argparse, json, os, sys
from .agents import orchestrate
from . import report

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ask(failure, options):
    print(f"\nFAILED: {failure['text']}  ({failure['measured']} vs {failure['limit']})")
    if not options:
        print("No option in the library fixes this. Stopping for a redesign.")
        return None
    for i, o in enumerate(options, 1):
        print(f"  {i}. {o['reason']}")
    pick = input("Approve which option? (number, or Enter to stop): ").strip()
    return options[int(pick) - 1] if pick.isdigit() and 0 < int(pick) <= len(options) else None


def main(argv=None):
    p = argparse.ArgumentParser(prog="nova-orch")
    p.add_argument("netlist"); p.add_argument("requirement")
    p.add_argument("--library", default=os.path.join(HERE, "parts", "library.yaml"))
    p.add_argument("--from", dest="prev", help="design_state.json from an earlier run (change-impact mode)")
    p.add_argument("--out", default="out/run")
    p.add_argument("--approve", choices=["ask", "auto", "none"], default="ask",
                   help="ask = engineer approves each fix; auto = take the top option (for demos); none = report only")
    a = p.parse_args(argv)
    prev = json.load(open(a.prev)) if a.prev else None
    approver = {"ask": ask, "auto": lambda f, o: o[0] if o else None, "none": None}[a.approve]
    state, log, history, req, fem = orchestrate(a.netlist, a.requirement, a.library, a.out, prev, approver)
    path = report.write(a.out, f"Review packet — {req.get('name', 'design')}", req, log, history, fem)
    print(f"\nReview packet: {path}")
    return 0 if state["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
