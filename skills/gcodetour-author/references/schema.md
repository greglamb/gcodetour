# CodeTour `.tour` File Reference

Verified against the `greglamb/gcodetour` fork's `schema.json` (JSON Schema draft-04), which is a superset of upstream `microsoft/codetour`. A `.tour` file is JSON. This skill targets the fork as the playback runtime, so fork-only step properties (`contents`, `icon`) are in scope. For external editor validation, set `$schema` to the fork's published schema: `https://raw.githubusercontent.com/greglamb/gcodetour/main/schema.json`. (With the fork extension installed, its bundled schema is applied automatically; the `$schema` field only matters to outside validators.)

## Contents
- [Tour object](#tour-object)
- [Step object](#step-object)
- [Step anchoring rules](#step-anchoring-rules)
- [CodeTour-flavored markdown](#codetour-flavored-markdown)
- [Storage locations](#storage-locations)
- [Versioning (`ref`)](#versioning-ref)
- [Linking & primary tours](#linking--primary-tours)
- [Config settings](#config-settings)
- [Drift detection](#drift-detection)

## Tour object

| Property | Type | Required | Notes |
|---|---|---|---|
| `title` | string | **yes** | Display name in the CodeTour tree / quick pick. |
| `steps` | array | **yes** | Ordered list of step objects. |
| `description` | string | no | Tooltip text in the tree. |
| `ref` | string | no | Git ref (branch/commit/tag) the tour is pinned to. See [Versioning](#versioning-ref). |
| `isPrimary` | boolean | no | Marks the entry-point tour offered first to new developers. |
| `nextTour` | string | no | Title of the tour that follows this one (enables the `Next Tour` link). |
| `when` | string | no | JavaScript expression gating visibility. Vars available: `isLinux`, `isMac`, `isWindows`, `isWeb`. |
| `stepMarker` | string | no | Custom marker string indicating a line participates in this tour. (In `schema.json`; not documented in README.) |

## Step object

At least `description` is required. Everything else is optional, but a step almost always sets one anchor (`file`+`line`/`pattern`, `directory`, `uri`, or none for a content step).

| Property | Type | Notes |
|---|---|---|
| `description` | string | **Required.** Plain text + markdown. A leading markdown heading (`### Foo`) becomes the step's tree title. |
| `file` | string | Path relative to workspace root. |
| `directory` | string | Path relative to workspace root. **Takes precedence over `file`** if both are present. |
| `uri` | string | Absolute URI. Mutually exclusive with `file` — set only one. |
| `line` | number | 1-based line number. |
| `pattern` | string | Regex matched against line content. **Only used when `line` is absent.** Preferred anchor — see below. |
| `title` | string | Explicit tree title (alternative to a heading in `description`). |
| `selection` | object | `{ start: {line, character}, end: {line, character} }`, all 1-based. Highlights a span. |
| `view` | string | VS Code view to focus on entry. Known IDs: `comments`, `console`, `debug`, `debug:breakpoints`, `debug:callstack`, `debug:variables`, `debug:watch`, `explorer`, `extensions`, `extensions:disabled`, `extensions:enabled`, `output`, `problems`, `scm`, `search`, `terminal`. Any other view ID string is also accepted. |
| `commands` | array of string | VS Code command URIs run when the step is navigated to, e.g. `codetour.endTour?[2]`. |
| `contents` | string | **Fork-only.** Inline content shown for the step instead of pointing at a `file`/`uri` on disk. Use for conceptual/reference steps that aren't tied to a real source line (embedded snippets, diagrams, invariants). Mutually exclusive in spirit with `file`/`uri`/`directory` — set only one anchor. |
| `icon` | string | **Fork-only.** Icon for the step in the CodeTour tree: a workspace-relative path, URL, or data URI. Cosmetic; safe to omit. |
| `markerTitle` | string | **Derived / read-only — never author this.** The player computes it from a step's marker comment in the source, and the recorder strips it on save (`delete step.markerTitle`). Present in the schema for completeness only; setting it by hand has no effect. The skill must not emit it. |

### Step types
- **File/line step** — `file` + (`line` or `pattern`). The common case.
- **Directory step** — `directory` + `description`. Focuses the folder in Explorer; good for "here's where X lives" without a specific line.
- **Content step** — `description` only, no anchor. An intro/interstitial rendered in a virtual document. Use one as step 1 to frame the tour.
- **Inline-contents step (fork-only)** — `contents` + `description`. Renders the `contents` string as the step's document body. Unlike a plain content step (which only shows the `description`), this displays an arbitrary embedded snippet/diagram with no file on disk. Use for reference material you want visible in the editor pane, not just the comment.

## Step anchoring rules

Prefer `pattern` over `line`. `line` is an ordinal that silently desyncs the moment code shifts; `pattern` re-locates the step by matching line *content*, so it survives insertions/deletions above it.

- `pattern` is a regex. Escape regex metacharacters in literal code: `express\\(\\)`, `router\\.post\\(`, `\\[`, `\\.`, `\\$`. In JSON, backslashes are themselves escaped, so a literal `(` becomes `\\(` in the file.
- Make patterns specific enough to match one intended line (e.g. a function signature or class declaration), not a common token.
- `line` is only honored when `pattern` is absent; if both appear, `line` wins. To use pattern-anchoring, omit `line` entirely.
- The `codetour.recordMode` setting (`lineNumber` | `pattern`, default `lineNumber`) only affects the interactive recorder, not hand-authored files.

## CodeTour-flavored markdown

Step `description` supports full markdown plus these CodeTour extensions:

| Feature | Syntax | Effect |
|---|---|---|
| File reference | `[label](./relative/path)` | Hyperlink that opens the workspace file. |
| Image | `![alt](./relative/img.png)` | Renders the image inline in the step. |
| Step reference | `[#2]` or `[label][#2]` | Jumps to step 2 (1-based) in the current tour. |
| Tour reference | `[Tour Title]`, `[Tour Title#3]`, `[label][Tour Title]` | Starts another tour (optionally at a step). |
| Code block | ```` ```lang ... ``` ```` | Renders an **Insert Code** link that inserts the snippet at the step's line (auto-formatted). |
| Shell command | `>> npm run build` | Renders a link that runs the command in a `CodeTour` integrated terminal. |
| Command link | `[label](command:commandId?["arg"])` | Runs any VS Code command. Args are a JSON array in the query string. |
| Env var | `{{VAR_NAME}}` | Replaced with the user's environment variable at playback (published-extension feature). |

Well-known command-link targets the player suggests: `Navigate to tour step`, `Open URL`, `Run build task`, `Run task`, `Run test task`, `Run terminal command...`, `Start tour...`.

## Storage locations

The player discovers tours in any of:
- `.tours/` (recommended; supports arbitrarily nested subdirectories)
- `.vscode/tours/`
- `.github/tours/`
- A custom directory set via `codetour.customTourDirectory` (e.g. `docs/tours`)
- Well-known single files: `.tour`, `main.tour`, `.vscode/main.tour`

File extension is `.tour`. Name files by tour intent (e.g. `onboarding.tour`).

## Versioning (`ref`)

`ref` controls drift resilience and whether files are editable during playback:
- **omitted / None** — follows whatever branch/commit is checked out; files stay editable (good for interactive tutorials).
- **branch name** — pinned to a branch; editable only when that branch is checked out, else read-only.
- **commit SHA** — never desyncs; editable only when `HEAD` matches.
- **tag** — never desyncs; tied to a release tag.

For onboarding docs that must stay correct, pin to a tag or commit. For living tutorials people edit as they go, omit `ref`.

## Linking & primary tours

- Number tour titles (`1 - Foo`, `2: Bar`) to get automatic `Next Tour` / `Previous Tour` links, or set `nextTour` explicitly by title.
- Mark the entry point with `isPrimary: true`. A title starting with `#1 - ` or `1 - ` is auto-treated as primary.

## Config settings

| Setting | Default | Purpose |
|---|---|---|
| `codetour.promptForWorkspaceTours` | true | Toast prompt on first open of a workspace with tours. |
| `codetour.recordMode` | `lineNumber` | Recorder anchor mode (`lineNumber` \| `pattern`). |
| `codetour.showMarkers` | true | Gutter markers on lines that participate in a tour. |
| `codetour.customTourDirectory` | — | Extra directory to discover tours in. |

## Drift detection

To catch tours that desync as code changes, wire one of these into CI:
- **CodeTour Watch** — GitHub Actions (`marketplace/actions/codetour-watch`).
- **CodeTour Watcher** — Azure Pipelines (`Sharma.CodeTourWatcher`).
