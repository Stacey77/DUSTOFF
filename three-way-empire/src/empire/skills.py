"""Phase 11 — skills library: SKILL.md folders the brain loads and follows.

A *skill* is a folder with a ``SKILL.md`` file in the Agent Skills layout:

    ---
    name: platform-health-check
    description: Check platform status and free capacity. Use for health questions.
    tools: [platform_snapshot, factory_list_pools]
    tags: [health, status, capacity]
    inputs:
      repo: nova/app
    ---
    # Platform health check
    ## Steps
    1. platform status
    2. show pool capacity

How it fits the earlier phases:

* **Steps run through the Phase 10 swarm.** Each step becomes one A2A task on a
  specialist sub-agent, so a skill can only do what MCP tools can do.
* **A skill never exceeds its declared tools.** The run is scoped to
  ``tools ∩ the tenant's MCP grant``. A tenant only sees (and can only run)
  skills whose declared tools it was granted.
* **Two scopes.** *Global* skills ship in ``src/empire/skill_library/``, load from
  ``EMPIRE_SKILLS_DIR``, or are installed by the operator. *Tenant* skills are
  installed by a client with its own key and are visible only to that client.
  API-installed skills persist in ``state.json``.
* **Inputs are plain values.** ``{placeholders}`` in steps are filled from the
  skill's default ``inputs`` merged with the caller's. Values may not contain
  ``=``, double quotes, braces or newlines, so an input can never smuggle extra tool
  arguments into a step.
* **Picking a skill.** Name it, or give a goal: the self-hosted LLM picks when one
  is configured, otherwise keyword scoring on name, tags and description. If
  nothing matches, the goal runs on the plain swarm.
* Every install, removal and run is on the audit chain; runs meter ``skill_run``.

No PyYAML needed: the frontmatter parser handles the subset above, which keeps
the standalone service's dependencies unchanged.
"""

from __future__ import annotations

import json
import os
import re
import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from src.empire.mcp_server import TOOL_NAMES

if TYPE_CHECKING:
    from src.empire.platform import EmpirePlatform

BUILTIN_DIR = Path(__file__).parent / "skill_library"
MAX_SKILL_BYTES = 20_000
MAX_STEPS = 20
NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
INPUT_KEY_RE = re.compile(r"^[a-z_][a-z0-9_]{0,39}$")
INPUT_VALUE_RE = re.compile(r"^[^=\"{}\n\r]{0,300}$")
PLACEHOLDER_RE = re.compile(r"\{([a-z_][a-z0-9_]*)\}")
_STOP = frozenset({
    "a", "an", "and", "are", "as", "at", "be", "by", "check", "do", "for", "from",
    "get", "give", "how", "i", "in", "is", "it", "me", "my", "of", "on", "or",
    "show", "the", "then", "this", "to", "use", "us", "what", "when", "with",
    "you", "your"})


class SkillError(ValueError):
    """Invalid SKILL.md, bad inputs, or a name clash."""


# --------------------------------------------------------------------------
# SKILL.md parsing
# --------------------------------------------------------------------------
def _scalar(v: str) -> Any:
    v = v.strip()
    if v.startswith("[") and v.endswith("]"):
        return [x.strip().strip("\"'") for x in v[1:-1].split(",") if x.strip()]
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    return v


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    """Split ``---`` frontmatter from the body. Supports scalars, ``[a, b]``
    lists, ``- item`` lists and one level of ``key:`` / ``  sub: value`` maps."""
    if not text.startswith("---"):
        raise SkillError("SKILL.md must start with '---' frontmatter")
    end = text.find("\n---", 3)
    if end < 0:
        raise SkillError("frontmatter is not closed with '---'")
    head, body = text[3:end], text[end + 4:]
    meta: dict[str, Any] = {}
    key: str | None = None
    for raw in head.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indented = raw[:1] in (" ", "\t")
        line = raw.strip()
        if indented and key is not None:
            if line.startswith("- "):
                if not isinstance(meta.get(key), list):
                    meta[key] = []
                meta[key].append(_scalar(line[2:]))
            elif ":" in line:
                k, v = line.split(":", 1)
                if not isinstance(meta.get(key), dict):
                    meta[key] = {}
                meta[key][k.strip()] = _scalar(v)
            else:
                raise SkillError(f"cannot parse frontmatter line {raw!r}")
            continue
        if ":" not in line:
            raise SkillError(f"cannot parse frontmatter line {raw!r}")
        k, v = line.split(":", 1)
        key = k.strip()
        meta[key] = _scalar(v) if v.strip() else None
    return meta, body.lstrip("\n")


def parse_steps(body: str) -> list[str]:
    """Numbered or bulleted lines under a ``## Steps`` heading."""
    steps: list[str] = []
    in_steps = False
    for line in body.splitlines():
        s = line.strip()
        if s.startswith("#"):
            in_steps = s.lstrip("#").strip().lower() == "steps"
            continue
        if not in_steps or not s:
            continue
        m = re.match(r"^(?:\d+[.)]|[-*])\s+(.+)$", s)
        if m:
            steps.append(m.group(1).strip().strip("`"))
    return steps


@dataclass
class SkillDef:
    name: str
    description: str
    tools: list[str]
    steps: list[str]
    tags: list[str] = field(default_factory=list)
    inputs: dict[str, str] = field(default_factory=dict)
    source: str = ""  # the SKILL.md text
    scope: str = "global"  # "global" | "tenant"
    owner: str | None = None  # tenant id for tenant skills
    origin: str = "api"  # "builtin" | "dir" | "api"
    installed_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    @property
    def placeholders(self) -> list[str]:
        return sorted({p for st in self.steps for p in PLACEHOLDER_RE.findall(st)})

    def to_dict(self, include_source: bool = False) -> dict[str, Any]:
        d: dict[str, Any] = {
            "name": self.name, "description": self.description, "tools": self.tools,
            "tags": self.tags, "inputs": self.inputs, "placeholders": self.placeholders,
            "steps": self.steps, "scope": self.scope, "owner": self.owner,
            "origin": self.origin, "installed_at": self.installed_at,
        }
        if include_source:
            d["source"] = self.source
        return d


def _check_input(k: str, v: Any) -> str:
    if not INPUT_KEY_RE.match(k):
        raise SkillError(f"bad input name {k!r}")
    v = str(v)
    if not INPUT_VALUE_RE.match(v):
        raise SkillError(f"input {k!r} may not contain = double-quotes braces or newlines")
    return v


def parse_skill(text: str, *, scope: str = "global", owner: str | None = None,
                origin: str = "api") -> SkillDef:
    if len(text.encode()) > MAX_SKILL_BYTES:
        raise SkillError(f"SKILL.md is larger than {MAX_SKILL_BYTES} bytes")
    meta, body = parse_frontmatter(text.replace("\r\n", "\n"))
    name = str(meta.get("name") or "")
    if not NAME_RE.match(name):
        raise SkillError("name must be 1-64 chars: lowercase letters, digits, hyphens")
    desc = str(meta.get("description") or "").strip()
    if not desc or len(desc) > 1024:
        raise SkillError("description is required (max 1024 chars)")
    tools = meta.get("tools") or []
    if isinstance(tools, str):
        tools = [tools]
    unknown = sorted(set(tools) - set(TOOL_NAMES))
    if not tools or unknown:
        raise SkillError(f"tools must list MCP tools from {list(TOOL_NAMES)}"
                         + (f"; unknown: {unknown}" if unknown else ""))
    tags = meta.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]
    inputs = meta.get("inputs") or {}
    if not isinstance(inputs, dict):
        raise SkillError("inputs must be a map of name: default")
    inputs = {k: _check_input(k, "" if v is None else v) for k, v in inputs.items()}
    steps = parse_steps(body)
    if not steps:
        raise SkillError("SKILL.md needs a '## Steps' section with numbered steps")
    if len(steps) > MAX_STEPS:
        raise SkillError(f"at most {MAX_STEPS} steps")
    return SkillDef(name=name, description=desc, tools=list(dict.fromkeys(tools)),
                    steps=steps, tags=[str(t).lower() for t in tags], inputs=inputs,
                    source=text, scope=scope, owner=owner, origin=origin)


def render_steps(skill: SkillDef, inputs: dict[str, Any] | None) -> list[str]:
    values = {**skill.inputs, **{k: _check_input(k, v) for k, v in (inputs or {}).items()}}
    missing = [p for p in skill.placeholders if not values.get(p)]
    if missing:
        raise SkillError(f"skill {skill.name} needs inputs: {missing}")
    return [PLACEHOLDER_RE.sub(lambda m: values[m.group(1)], st) for st in skill.steps]


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in _STOP}


def score(skill: SkillDef, goal: str) -> int:
    g = _words(goal)
    name_words = set(skill.name.split("-")) - _STOP
    tag_words = {w for t in skill.tags for w in _words(t)}
    desc_words = _words(skill.description)
    return (3 * len(g & name_words) + 2 * len(g & tag_words)
            + len(g & (desc_words - name_words - tag_words)))


# --------------------------------------------------------------------------
# Library
# --------------------------------------------------------------------------
class SkillLibrary:
    MIN_SCORE = 3

    def __init__(self, platform: EmpirePlatform, skills_dir: str | Path | None = None,
                 load_builtins: bool = True) -> None:
        self.p = platform
        self.global_skills: dict[str, SkillDef] = {}
        self.tenant_skills: dict[str, dict[str, SkillDef]] = {}
        self.load_errors: list[dict[str, str]] = []
        self._lock = threading.RLock()
        if load_builtins:
            self.load_dir(BUILTIN_DIR, origin="builtin")
        d = skills_dir if skills_dir is not None else os.environ.get("EMPIRE_SKILLS_DIR")
        if d:
            self.load_dir(Path(d), origin="dir")

    # -- loading ---------------------------------------------------------
    def load_dir(self, root: Path, origin: str = "dir") -> int:
        if not root.is_dir():
            return 0
        n = 0
        for md in sorted(root.glob("*/SKILL.md")):
            try:
                sk = parse_skill(md.read_text(encoding="utf-8"), origin=origin)
                if sk.name != md.parent.name:
                    raise SkillError(f"folder {md.parent.name!r} != name {sk.name!r}")
            except (SkillError, OSError) as exc:
                self.load_errors.append({"path": str(md), "error": str(exc)})
                continue
            self.global_skills[sk.name] = sk
            n += 1
        return n

    # -- visibility --------------------------------------------------------
    def _granted(self, tenant_id: str | None) -> set[str] | None:
        return None if tenant_id is None else set(self.p.swarm.granted_tools(tenant_id))

    def visible(self, tenant_id: str | None = None) -> list[SkillDef]:
        """Operator: every skill. Tenant: runnable globals plus its own."""
        if tenant_id is None:
            own = [s for d in self.tenant_skills.values() for s in d.values()]
            return [*self.global_skills.values(), *own]
        granted = self._granted(tenant_id) or set()
        out = [s for s in self.global_skills.values() if set(s.tools) <= granted]
        out += list(self.tenant_skills.get(tenant_id, {}).values())
        return out

    def get(self, name: str, tenant_id: str | None = None,
            owner: str | None = None) -> SkillDef:
        if tenant_id is not None:
            own = self.tenant_skills.get(tenant_id, {}).get(name)
            if own:
                return own
            sk = self.global_skills.get(name)
            if sk and set(sk.tools) <= (self._granted(tenant_id) or set()):
                return sk
            raise KeyError(f"unknown skill {name!r}")  # never reveal hidden ones
        if owner is not None:
            sk = self.tenant_skills.get(owner, {}).get(name)
            if sk:
                return sk
            raise KeyError(f"unknown skill {name!r}")
        if name in self.global_skills:
            return self.global_skills[name]
        raise KeyError(f"unknown skill {name!r}")

    # -- install / remove ------------------------------------------------
    def install(self, text: str, tenant_id: str | None = None) -> SkillDef:
        if tenant_id is not None:
            self.p.onboarding.get(tenant_id)  # KeyError if unknown
            sk = parse_skill(text, scope="tenant", owner=tenant_id)
            granted = self._granted(tenant_id) or set()
            if not set(sk.tools) <= granted:
                raise SkillError("skill uses MCP tools this tenant was not granted: "
                                 f"{sorted(set(sk.tools) - granted)}")
            if sk.name in self.global_skills:
                raise SkillError(f"{sk.name!r} is a platform skill name; pick another")
            with self._lock:
                self.tenant_skills.setdefault(tenant_id, {})[sk.name] = sk
        else:
            sk = parse_skill(text)
            existing = self.global_skills.get(sk.name)
            if existing and existing.origin == "builtin":
                raise SkillError(f"{sk.name!r} is a built-in skill and can't be replaced")
            with self._lock:
                self.global_skills[sk.name] = sk
        self.p.audit.record("skill.installed", tenant_id,
                            {"skill": sk.name, "scope": sk.scope, "tools": sk.tools})
        return sk

    def remove(self, name: str, tenant_id: str | None = None,
               owner: str | None = None) -> SkillDef:
        who = tenant_id or owner
        with self._lock:
            if who is not None:
                sk = self.tenant_skills.get(who, {}).pop(name, None)
            else:
                sk = self.global_skills.get(name)
                if sk and sk.origin == "builtin":
                    raise SkillError(f"{name!r} is a built-in skill and can't be removed")
                sk = self.global_skills.pop(name, None)
        if sk is None:
            raise KeyError(f"unknown skill {name!r}")
        self.p.audit.record("skill.removed", who, {"skill": name, "scope": sk.scope})
        return sk

    # -- choose + run ----------------------------------------------------
    def match(self, goal: str, tenant_id: str | None = None) -> tuple[SkillDef | None, str]:
        """Pick a skill for a goal: (skill or None, how it was chosen)."""
        cands = self.visible(tenant_id)
        if not cands:
            return None, "none"
        llm = self.p.llm
        if llm is not None:
            menu = [{"name": s.name, "description": s.description} for s in cands]
            prompt = ("SKILL_PICK: Choose the one skill that best fits the goal, or "
                      "\"none\". Reply with ONLY the skill name.\nGoal: " + goal
                      + "\nSkills: " + json.dumps(menu))
            try:
                ans = llm.complete(prompt).strip().strip("\"'` .").lower()
            except Exception:  # noqa: BLE001 - model down: keyword scoring
                ans = ""
            by_name = {s.name: s for s in cands}
            if ans in by_name:
                return by_name[ans], "llm"
            if ans == "none":
                return None, "llm"
        best = max(cands, key=lambda s: (score(s, goal), s.scope == "tenant", s.name))
        if score(best, goal) >= self.MIN_SCORE:
            return best, "keywords"
        return None, "keywords"

    def run(self, *, skill: str | None = None, goal: str | None = None,
            inputs: dict[str, Any] | None = None,
            tenant_id: str | None = None) -> dict[str, Any]:
        if not skill and not (goal and goal.strip()):
            raise SkillError("give a skill name or a goal")
        self.p.swarm._require_live(tenant_id)
        chosen_by = "named"
        if skill:
            sk: SkillDef | None = self.get(skill, tenant_id)
        else:
            sk, chosen_by = self.match(goal or "", tenant_id)
        if sk is None:  # nothing fits: plain swarm on the goal
            out = self.p.swarm.run(goal or "", tenant_id)
            return {**out, "skill": None, "chosen_by": chosen_by}
        steps = render_steps(sk, inputs)
        granted = self._granted(tenant_id)
        if granted is not None and not set(sk.tools) <= granted:
            raise PermissionError(f"skill {sk.name} needs MCP tools this tenant lacks")
        out = self.p.swarm.run(goal or sk.description, tenant_id,
                               steps=steps, tool_scope=sk.tools)
        if tenant_id:
            self.p.metering.record(tenant_id, "skill_run", 1)
        self.p.audit.record("skill.run", tenant_id, {
            "skill": sk.name, "scope": sk.scope, "chosen_by": chosen_by,
            "done": out["done"], "context_id": out["context_id"]})
        return {**out, "skill": sk.name, "chosen_by": chosen_by, "steps": steps}

    # -- persistence (API-installed skills only) ---------------------------
    def dump(self) -> list[dict[str, Any]]:
        rows = [{"scope": "global", "owner": None, "source": s.source,
                 "installed_at": s.installed_at}
                for s in self.global_skills.values() if s.origin == "api"]
        rows += [{"scope": "tenant", "owner": tid, "source": s.source,
                  "installed_at": s.installed_at}
                 for tid, d in self.tenant_skills.items() for s in d.values()]
        return rows

    def restore(self, rows: list[dict[str, Any]]) -> None:
        for r in rows:
            try:
                sk = parse_skill(r["source"], scope=r["scope"], owner=r.get("owner"))
            except SkillError as exc:
                self.load_errors.append({"path": "state.json", "error": str(exc)})
                continue
            sk.installed_at = r.get("installed_at", sk.installed_at)
            if sk.scope == "tenant" and sk.owner:
                self.tenant_skills.setdefault(sk.owner, {})[sk.name] = sk
            elif sk.name not in self.global_skills:  # built-ins/dir win
                self.global_skills[sk.name] = sk

    def snapshot(self) -> dict[str, Any]:
        return {"global": len(self.global_skills),
                "tenant": sum(len(d) for d in self.tenant_skills.values()),
                "load_errors": len(self.load_errors)}
