#!/usr/bin/env python3
"""Verify CodeTour .tour file(s): structure, anchors, references, forbidden fields.

Usage:
    verify_tour.py <tour-file | tours-dir> [repo-root]

Pass a single .tour file, or a directory (e.g. .tours/) to also validate
cross-tour navigation. repo-root defaults to the current directory. Exits
non-zero if any check fails, so it can be wired into CI or a git pre-commit hook.

Checks (standard library only):
  - Required fields: tour.title, tour.steps; each step.description
  - Each file+pattern step (without `line`) resolves to EXACTLY one line
  - Each directory step points at a real directory
  - No step sets `markerTitle` (derived/read-only; the player strips it on save)
  - file+line (ordinal) steps are allowed but flagged as fragile
  - Each `diagram` step: the SVG exists, carries no PlantUML warning/error baked
    into the image (e.g. a deprecation notice), and (if `element` is set) contains
    a matching `ct://el/<element>` hyperlink anchor
  - `[#n]` step links resolve to a real step in the same tour
  - Inline `[label](./file)` links point at a real file; the `[label](Tour Title)`
    antipattern (a file-link form aimed at a tour) is flagged with the fix
  - Directory mode also checks cross-tour navigation: `nextTour` and `[Title#n]`
    resolve to a real tour (and step). A bare `[Title]` is left alone — it is
    indistinguishable from ordinary bracketed prose, so it is never flagged.
  - Informational: SVG anchors that no step highlights (catches an intended-but-
    mistyped `element` that happens to resolve to the wrong, similar anchor);
    inline links missing a `./` prefix; unbalanced `**` (bold) in a step; and
    step order/placement (an intro/welcome step that isn't first; consecutive
    same-file steps that jump backwards) — these order checks never fail the run,
    they prompt the final read-through

If the `jsonschema` package and the bundled references/schema.json are both
available, full JSON Schema (draft-04) validation runs too; otherwise it is
skipped with a notice and the structural checks above still run.
"""
import html
import json
import re
import sys
from pathlib import Path

FORBIDDEN_FIELD = "markerTitle"


def load_schema():
    path = Path(__file__).resolve().parent.parent / "references" / "schema.json"
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text())
    except (ValueError, OSError):
        return None


def schema_validate(tour, schema):
    """Return a list of errors, or None if jsonschema is unavailable."""
    try:
        from jsonschema import Draft4Validator
    except ImportError:
        return None
    return sorted(Draft4Validator(schema).iter_errors(tour), key=lambda e: list(e.path))


def check_step(index, step, repo_root):
    """Return (ok: bool, message: str) for a single step."""
    if FORBIDDEN_FIELD in step:
        return False, f"step {index}: sets `{FORBIDDEN_FIELD}` (derived/read-only — never author)"
    if not isinstance(step.get("description"), str) or not step["description"]:
        return False, f"step {index}: missing required `description`"

    if "directory" in step:
        target = Path(repo_root) / step["directory"]
        ok = target.is_dir()
        return ok, f"step {index}: directory {step['directory']} -> {'ok' if ok else 'MISSING'}"

    if "file" in step and "pattern" in step and "line" not in step:
        file_path = Path(repo_root) / step["file"]
        if not file_path.is_file():
            return False, f"step {index}: file {step['file']} not found"
        try:
            rx = re.compile(step["pattern"])
        except re.error as exc:
            return False, f"step {index}: invalid pattern /{step['pattern']}/ ({exc})"
        lines = file_path.read_text(errors="replace").splitlines()
        hits = [n for n, line in enumerate(lines, 1) if rx.search(line)]
        if len(hits) == 1:
            return True, f"step {index}: /{step['pattern']}/ -> line {hits[0]}"
        return False, f"step {index}: /{step['pattern']}/ matched {len(hits)} lines {hits} (need exactly 1)"

    if "file" in step and "line" in step:
        return True, f"step {index}: {step['file']}:{step['line']} (ordinal — fragile, prefer pattern)"

    if "contents" in step:
        return True, f"step {index}: inline-contents step"

    return True, f"step {index}: content step (no anchor)"


# PlantUML draws warnings/errors as visible <text> in the SVG (spaces encoded as
# &#160;), so a diagram can render "successfully" yet ship a defect baked into the
# image. These are PlantUML's baked phrases — extend as you find more.
SVG_ERROR_MARKERS = (
    "this syntax is deprecated",
    "an error has occurred",
)


def svg_baked_message(svg_text):
    """Return a PlantUML error/warning marker baked into the SVG text, else None.

    Checks each <text> element on its own (after decoding entities and the &#160;
    word spacing PlantUML uses) so it won't false-positive by joining unrelated
    labels into a phrase.
    """
    for raw in re.findall(r"<text[^>]*>(.*?)</text>", svg_text, re.S):
        # re's \s (Unicode) already collapses the &#160; word spacing PlantUML emits.
        norm = re.sub(r"\s+", " ", html.unescape(raw)).strip().lower()
        for marker in SVG_ERROR_MARKERS:
            if marker in norm:
                return marker
    return None


def check_diagram(index, step, repo_root):
    """Return (ok, message) for a step's `diagram`, or None if it has none."""
    diagram = step.get("diagram")
    if diagram is None:
        return None
    if not isinstance(diagram, dict):
        return False, f"step {index}: diagram must be an object"

    path = diagram.get("path")
    if not isinstance(path, str) or not path:
        return False, f"step {index}: diagram.path missing or not a string"

    svg_path = Path(repo_root) / path
    if not svg_path.is_file():
        return False, f"step {index}: diagram svg {path} -> MISSING"

    text = svg_path.read_text(errors="replace")
    baked = svg_baked_message(text)
    if baked:
        return False, (
            f"step {index}: diagram {path} -> PlantUML baked a message into the SVG "
            f"(\"{baked}…\") — fix the source and re-render"
        )

    element = diagram.get("element")
    if element is None:
        return True, f"step {index}: diagram {path} (no element highlighted) -> ok"

    anchor = re.compile(r'(?:xlink:)?href="ct://el/' + re.escape(element) + r'"')
    if anchor.search(text):
        return True, f"step {index}: diagram element '{element}' -> resolved in {path}"
    return False, f"step {index}: diagram element '{element}' -> NO ct://el/ anchor in {path}"


def get_tour_title(title):
    """Mirror src/tourLabels.ts getTourTitle: the DISPLAY title used to resolve
    `[Title]` references (the title with a leading 'N - ' prefix stripped).

    Must agree with the player byte-for-byte — it strips only the prefix and
    keeps any later hyphens, so change both this and src/tourLabels.ts together.
    """
    if re.match(r"^#?\d+\s-", title):
        return title[title.index("-") + 1:].strip()
    return title


def strip_number_prefix(title):
    """Return `title` with a leading 'N - ' / '#N - ' prefix removed, else None."""
    m = re.match(r"^#?\d+\s*-\s*(.+)$", title)
    return m.group(1).strip() if m else None


# Mirrors TOUR_REFERENCE_PATTERN in src/player/index.ts. Matches step refs
# ([#n], [label][#n]) and tour refs ([Title], [Title#n], [label][Title]); a
# trailing "(" disqualifies the match (that is an ordinary markdown link).
TOUR_REF = re.compile(
    r"(?:\[(?P<linkTitle>[^\]]+)\])?"
    r"\[(?=\s*[^\]\s])"
    r"(?P<tourTitle>[^\]#]+)?"
    r"(?:#(?P<stepNumber>\d+))?"
    r"\](?!\()"
)


def check_references(label, tour, step_count, raw_titles, display_steps, cross_tour):
    """Return [(ok, message), ...] for nextTour and in-description step/tour refs.

    raw_titles: every tour's exact title (nextTour matches these).
    display_steps: {getTourTitle(t): step_count} (tour refs match these).
    cross_tour: only validate links that may point at *other* tours when True
    (a whole .tours dir was given); a single file can't see its siblings.
    """
    out = []
    if cross_tour:
        nxt = tour.get("nextTour")
        if isinstance(nxt, str) and nxt:
            ok = nxt in raw_titles
            out.append((ok, f"{label}: nextTour '{nxt}' -> "
                            + ("resolved" if ok else "NO tour has this title")))
    for i, step in enumerate(tour.get("steps") or [], 1):
        desc = step.get("description")
        if not isinstance(desc, str):
            continue
        for m in TOUR_REF.finditer(desc):
            tt = m.group("tourTitle")
            sn = m.group("stepNumber")
            if not tt:  # step reference into the current tour
                if sn:
                    n = int(sn)
                    ok = 1 <= n <= step_count
                    out.append((ok, f"{label} step {i}: [#{n}] -> "
                                    + ("in range" if ok else f"OUT OF RANGE (1..{step_count})")))
            else:  # tour reference
                tt = tt.strip()
                if tt in display_steps:
                    if sn:
                        n = int(sn)
                        ok = 1 <= n <= display_steps[tt]
                        out.append((ok, f"{label} step {i}: [{tt}#{n}] -> "
                                        + ("resolved" if ok else f"step OUT OF RANGE (1..{display_steps[tt]})")))
                    # bare [Title] that resolves: fine, nothing to report
                else:
                    stripped = strip_number_prefix(tt)
                    suffix = f"#{sn}" if sn else ""
                    if stripped and stripped in display_steps:
                        # The common trap: author referenced the raw numbered title,
                        # but the player resolves tour refs by the DISPLAY title.
                        out.append((False, f"{label} step {i}: [{tt}{suffix}] -> tour "
                                           f"references use the displayed title (no 'N - ' "
                                           f"prefix); write [{stripped}{suffix}]"))
                    elif sn and cross_tour:
                        # [Title#n] is unambiguously a tour ref; a bare [Title] that
                        # doesn't resolve is left alone (it may be ordinary prose).
                        out.append((False, f"{label} step {i}: [{tt}#{sn}] -> NO tour has this title"))
    return out


# Inline markdown links: [label](target) and image ![alt](target).
INLINE_LINK = re.compile(r"(!?)\[[^\]]*\]\(([^)]+)\)")
# Unescaped bold markers, for the unbalanced-** hazard check.
BOLD = re.compile(r"(?<!\\)\*\*")


def strip_code(text):
    """Drop fenced blocks and inline code so example links/markup aren't scanned."""
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    return re.sub(r"`[^`]*`", "", text)


def check_links(label, tour, repo_root, raw_titles, display_steps):
    """Validate inline [label](target) / ![alt](target) links in descriptions.

    Mirrors the player (src/player/index.ts FILE_REFERENCE_PATTERN): only a target
    starting with '.' is rewritten to open a workspace file; anything else renders
    as raw markdown. Returns (failures, notes).
    """
    root = Path(repo_root).resolve()
    failures = []
    notes = []
    for i, step in enumerate(tour.get("steps") or [], 1):
        desc = step.get("description")
        if not isinstance(desc, str):
            continue
        body = strip_code(desc)
        for m in INLINE_LINK.finditer(body):
            is_img = m.group(1) == "!"
            target = m.group(2).strip()
            low = target.lower()
            if low.startswith(("http://", "https://", "mailto:", "command:", "#")):
                continue  # external / command / in-page anchor — not a workspace ref
            if not is_img and (target in raw_titles or target in display_steps):
                # The antipattern: the (Title) paren form used for tour navigation.
                # The player parses it as a (dead) file link, not a tour link.
                failures.append(f"{label} step {i}: [...]({target}) is a file link to a tour "
                                f"title; for tour navigation use [label][{get_tour_title(target)}]")
            elif target.startswith("."):
                # Player rewrites only '.'-prefixed paths (resolved at the workspace root).
                if not (root / target).resolve().exists():
                    failures.append(f"{label} step {i}: [...]({target}) -> file not found")
            elif "/" in target or re.search(r"\.\w{1,8}$", target):
                # Looks like a workspace path but won't be rewritten as written.
                notes.append(f"  {label} step {i}: ({target}) — inline file links must "
                             f"start with './' to open a workspace file")
        if len(BOLD.findall(body)) % 2 == 1:
            notes.append(f"  {label} step {i}: odd number of '**' — check for unbalanced bold")
    return failures, notes


# Headings that read like a tour's OPENING — an intro/welcome step usually belongs
# at position 1, not stranded mid-tour. Deliberately conservative (no bare
# "overview", which is legitimately common mid-tour) to keep this high-signal.
INTRO_HEADING = re.compile(
    r"\b(welcome|introduction|getting started|before you (begin|start)|"
    r"read me first|prerequisites|what (this tour|we'?ll|you'?ll) (cover|learn))\b",
    re.I,
)


def first_heading(desc):
    """The step's first markdown heading text, else its first non-empty line."""
    for line in desc.splitlines():
        s = line.strip()
        if not s:
            continue
        m = re.match(r"#{1,6}\s+(.*)", s)
        return (m.group(1) if m else s).strip()
    return ""


def resolve_line(step, repo_root):
    """Best-effort 1-based line for a step: an explicit `line`, or a `pattern`
    that resolves to exactly one line. None when it can't be pinned down."""
    if isinstance(step.get("line"), int):
        return step["line"]
    if isinstance(step.get("file"), str) and isinstance(step.get("pattern"), str):
        fp = Path(repo_root) / step["file"]
        if not fp.is_file():
            return None
        try:
            rx = re.compile(step["pattern"])
        except re.error:
            return None
        hits = [n for n, ln in enumerate(fp.read_text(errors="replace").splitlines(), 1)
                if rx.search(ln)]
        if len(hits) == 1:
            return hits[0]
    return None


def check_structure(tour, repo_root):
    """Informational, NON-failing heuristics on step ORDER and placement — the
    mechanical proxies for "read it as a reader" that a script can manage. They
    flag candidates for the agent's final read-through; they never fail the run
    (order can be deliberate, and prose quality is the agent's call, not a regex).

    Returns a list of note strings:
      - an intro/welcome heading at a position other than step 1
      - consecutive same-file steps whose line numbers go backwards
    """
    notes = []
    steps = tour.get("steps") or []

    for i, step in enumerate(steps, 1):
        desc = step.get("description")
        if i > 1 and isinstance(desc, str):
            head = first_heading(desc)
            if INTRO_HEADING.search(head):
                notes.append(f"step {i} (\"{head[:50]}\") reads like an introduction "
                             f"— welcome/intro steps usually belong at step 1")

    prev_file = prev_line = None
    for i, step in enumerate(steps, 1):
        f = step.get("file") if isinstance(step.get("file"), str) else None
        ln = resolve_line(step, repo_root) if f else None
        if (f and f == prev_file and ln is not None and prev_line is not None
                and ln < prev_line):
            notes.append(f"steps {i - 1}->{i} jump backwards in {f} "
                         f"(line {prev_line} -> {ln}) — confirm the order is intentional")
        prev_file, prev_line = f, ln  # reset on content steps so only adjacent same-file pairs compare

    return notes


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2

    target = Path(argv[1])
    repo_root = Path(argv[2]) if len(argv) > 2 else Path.cwd()
    cross_tour = target.is_dir()

    tour_files = sorted(target.rglob("*.tour")) if cross_tour else [target]
    if not tour_files:
        print(f"FAIL: no .tour files found under {target}")
        return 1

    # Load everything first so cross-tour references can resolve.
    loaded = []  # (path, data)
    ok = True
    for tf in tour_files:
        try:
            loaded.append((tf, json.loads(tf.read_text())))
        except (ValueError, OSError) as exc:
            print(f"FAIL: cannot read/parse {tf}: {exc}")
            ok = False
    if not loaded:
        return 1

    raw_titles = set()
    display_steps = {}  # getTourTitle(title) -> step count
    for _, data in loaded:
        title = data.get("title")
        steps = data.get("steps")
        n = len(steps) if isinstance(steps, list) else 0
        if isinstance(title, str) and title:
            raw_titles.add(title)
            display_steps.setdefault(get_tour_title(title), n)

    schema = load_schema()
    schema_note_shown = False
    referenced = {}  # svg abs path -> set of elements referenced by any step
    link_note_acc = []  # informational inline-link / markdown hazards
    struct_note_acc = []  # informational step-order / placement signals

    for path, tour in loaded:
        label = str(path.relative_to(target)) if cross_tour else path.name
        if cross_tour:
            print(f"== {label} ==")

        if not isinstance(tour.get("title"), str) or not tour["title"]:
            print("  FAIL tour.title missing or empty")
            ok = False
        steps = tour.get("steps")
        if not isinstance(steps, list) or not steps:
            print("  FAIL tour.steps missing or empty")
            ok = False
            continue

        if schema is None:
            if not schema_note_shown:
                print("  note: bundled references/schema.json not found — skipping schema validation")
                schema_note_shown = True
        else:
            errors = schema_validate(tour, schema)
            if errors is None:
                if not schema_note_shown:
                    print("  note: jsonschema not installed — skipping schema validation (structural checks still run)")
                    print("        enable: python3 -m venv .venv && .venv/bin/pip install jsonschema; re-run with .venv/bin/python")
                    schema_note_shown = True
            elif errors:
                ok = False
                for err in errors:
                    print(f"  FAIL schema: {list(err.path)} {err.message}")
            else:
                print("  schema: PASS (draft-04)")

        for index, step in enumerate(steps, 1):
            good, message = check_step(index, step, repo_root)
            print(("  " if good else "  FAIL ") + message)
            ok = ok and good

            diagram_result = check_diagram(index, step, repo_root)
            if diagram_result is not None:
                dgood, dmessage = diagram_result
                print(("  " if dgood else "  FAIL ") + dmessage)
                ok = ok and dgood

            diagram = step.get("diagram")
            if isinstance(diagram, dict) and isinstance(diagram.get("path"), str):
                svg = (Path(repo_root) / diagram["path"]).resolve()
                used = referenced.setdefault(svg, set())
                el = diagram.get("element")
                if isinstance(el, str) and el:
                    used.add(el)

        ref_results = check_references(
            label if cross_tour else "tour", tour, len(steps),
            raw_titles, display_steps, cross_tour)
        broken = [m for good, m in ref_results if not good]
        for m in broken:
            print("  FAIL " + m)
        ok = ok and not broken
        print(f"  references: {len(ref_results) - len(broken)} ok, {len(broken)} broken")

        link_fail, link_notes = check_links(
            label if cross_tour else "tour", tour, repo_root, raw_titles, display_steps)
        for m in link_fail:
            print("  FAIL " + m)
        ok = ok and not link_fail
        link_note_acc.extend(link_notes)

        lbl = label if cross_tour else "tour"
        struct_note_acc.extend(f"  {lbl} {n}" for n in check_structure(tour, repo_root))

    # Informational (#non-failing): SVG anchors no step highlights.
    notes = []
    for svg, used in sorted(referenced.items()):
        try:
            text = svg.read_text(errors="replace")
        except OSError:
            continue
        present = set(re.findall(r'(?:xlink:)?href="ct://el/([^"]+)"', text))
        unused = sorted(present - used)
        if unused:
            try:
                shown = svg.relative_to(Path(repo_root).resolve())
            except ValueError:
                shown = svg
            notes.append(f"  {shown}: {', '.join(unused)}")
    if notes:
        print("--- informational: anchors no step highlights ---")
        print("(expected for a shared overview map; only a concern if you meant to")
        print(" highlight one and a typo'd `element` resolved to a similar anchor)")
        for n in notes:
            print(n)
    if link_note_acc:
        print("--- informational: inline links / markdown ---")
        for n in link_note_acc:
            print(n)
    if struct_note_acc:
        print("--- informational: step order & placement (do the final read-through) ---")
        print("(never fails the run — order can be deliberate; these are candidates")
        print(" for the agent's read-through, not verdicts)")
        for n in struct_note_acc:
            print(n)

    print("=> ALL PASS" if ok else "=> FAILURES PRESENT")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
