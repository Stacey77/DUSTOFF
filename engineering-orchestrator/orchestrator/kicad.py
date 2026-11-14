"""Read a KiCad netlist export (.net, S-expression format, version E)."""
from dataclasses import dataclass, field


def _tokenize(text):
    tokens, i, n = [], 0, len(text)
    while i < n:
        c = text[i]
        if c in "()":
            tokens.append(c); i += 1
        elif c.isspace():
            i += 1
        elif c == '"':
            j, buf = i + 1, []
            while text[j] != '"':
                if text[j] == "\\":
                    j += 1
                buf.append(text[j]); j += 1
            tokens.append(("str", "".join(buf))); i = j + 1
        else:
            j = i
            while j < n and not text[j].isspace() and text[j] not in '()"':
                j += 1
            tokens.append(("sym", text[i:j])); i = j
    return tokens


def _parse(tokens):
    stack, cur = [], []
    for t in tokens:
        if t == "(":
            stack.append(cur); cur = []
        elif t == ")":
            done, cur = cur, stack.pop(); cur.append(done)
        else:
            cur.append(t[1])
    return cur[0]


def _find(node, key):
    return [x for x in node if isinstance(x, list) and x and x[0] == key]


def _first(node, key, default=None):
    hits = _find(node, key)
    return hits[0][1] if hits and len(hits[0]) > 1 else default


@dataclass
class Component:
    ref: str
    value: str
    footprint: str
    fields: dict = field(default_factory=dict)

    @property
    def mpn(self):
        return self.fields.get("MPN") or self.value


@dataclass
class Netlist:
    components: dict
    nets: dict  # net name -> list of (ref, pin, pinfunction)

    def net_of(self, ref, pin=None, function=None):
        for name, nodes in self.nets.items():
            for r, p, f in nodes:
                if r == ref and (pin is None or p == pin) and (function is None or f == function):
                    return name
        return None


def read_netlist(path):
    tree = _parse(_tokenize(open(path, encoding="utf-8").read()))
    comps = {}
    for comp_list in _find(tree, "components"):
        for c in _find(comp_list, "comp"):
            fields = {}
            for fl in _find(c, "fields"):
                for f in _find(fl, "field"):
                    name = _first(f, "name")
                    vals = [x for x in f[1:] if isinstance(x, str)]
                    if name:
                        fields[name] = vals[0] if vals else ""
            ref = _first(c, "ref")
            comps[ref] = Component(ref, _first(c, "value", ""), _first(c, "footprint", ""), fields)
    nets = {}
    for net_list in _find(tree, "nets"):
        for n in _find(net_list, "net"):
            nodes = [(_first(nd, "ref"), _first(nd, "pin"), _first(nd, "pinfunction")) for nd in _find(n, "node")]
            nets[_first(n, "name")] = nodes
    return Netlist(comps, nets)
