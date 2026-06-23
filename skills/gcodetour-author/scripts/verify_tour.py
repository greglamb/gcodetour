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
  - Directory mode also checks cross-tour navigation: `nextTour` and `[Title#n]`
    resolve to a real tour (and step). A bare `[Title]` is left alone — it is
    indistinguishable from ordinary bracketed prose, so it is never flagged.
  - Informational: SVG anchors that no step highlights (catches an intended-but-
    mistyped `element` that happens to resolve to the wrong, similar anchor)

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

    print("=> ALL PASS" if ok else "=> FAILURES PRESENT")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
