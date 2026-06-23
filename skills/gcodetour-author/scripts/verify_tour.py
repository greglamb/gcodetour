#!/usr/bin/env python3
"""Verify a CodeTour .tour file: structure, anchor resolution, and forbidden fields.

Usage:
    verify_tour.py <tour-file> [repo-root]

repo-root defaults to the current directory. Exits non-zero if any check fails,
so it can be wired into CI or a git pre-commit hook.

Checks (standard library only):
  - Required fields: tour.title, tour.steps; each step.description
  - Each file+pattern step (without `line`) resolves to EXACTLY one line
  - Each directory step points at a real directory
  - No step sets `markerTitle` (derived/read-only; the player strips it on save)
  - file+line (ordinal) steps are allowed but flagged as fragile
  - Each `diagram` step: the SVG exists and (if `element` is set) contains a
    matching `ct://el/<element>` hyperlink anchor

If the `jsonschema` package and the bundled references/schema.json are both
available, full JSON Schema (draft-04) validation runs too; otherwise it is
skipped with a notice and the structural checks above still run.
"""
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

    element = diagram.get("element")
    if element is None:
        return True, f"step {index}: diagram {path} (no element highlighted) -> ok"

    text = svg_path.read_text(errors="replace")
    anchor = re.compile(r'(?:xlink:)?href="ct://el/' + re.escape(element) + r'"')
    if anchor.search(text):
        return True, f"step {index}: diagram element '{element}' -> resolved in {path}"
    return False, f"step {index}: diagram element '{element}' -> NO ct://el/ anchor in {path}"


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2

    tour_path = Path(argv[1])
    repo_root = Path(argv[2]) if len(argv) > 2 else Path.cwd()

    try:
        tour = json.loads(tour_path.read_text())
    except (ValueError, OSError) as exc:
        print(f"FAIL: cannot read/parse {tour_path}: {exc}")
        return 1

    ok = True

    if not isinstance(tour.get("title"), str) or not tour["title"]:
        print("FAIL: tour.title missing or empty")
        ok = False
    steps = tour.get("steps")
    if not isinstance(steps, list) or not steps:
        print("FAIL: tour.steps missing or empty")
        return 1

    schema = load_schema()
    if schema is None:
        print("note: bundled references/schema.json not found — skipping schema validation")
    else:
        errors = schema_validate(tour, schema)
        if errors is None:
            print("note: jsonschema not installed — skipping schema validation (structural checks still run)")
        elif errors:
            ok = False
            for err in errors:
                print(f"FAIL schema: {list(err.path)} {err.message}")
        else:
            print("schema: PASS (draft-04)")

    for index, step in enumerate(steps, 1):
        good, message = check_step(index, step, repo_root)
        print(("  " if good else "  FAIL ") + message)
        ok = ok and good

        diagram_result = check_diagram(index, step, repo_root)
        if diagram_result is not None:
            dgood, dmessage = diagram_result
            print(("  " if dgood else "  FAIL ") + dmessage)
            ok = ok and dgood

    print("=> ALL PASS" if ok else "=> FAILURES PRESENT")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
