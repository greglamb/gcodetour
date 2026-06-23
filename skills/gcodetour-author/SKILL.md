---
name: gcodetour-author
description: Author CodeTour walkthrough files (.tour JSON) that explain or onboard someone to a codebase, directly inside VS Code. Use this whenever the user wants to create, generate, or update a guided code tour, a codebase walkthrough, an onboarding tour, or a CodeTour file — or when they ask to "explain this codebase as a tour," "make a walkthrough of how X works," "document the request flow as steps," or point at an unfamiliar repo and ask for a guided introduction. Also use when editing existing .tour files or fixing tour drift. Can additionally generate synchronized architecture/flow diagrams (C4-PlantUML and activity swim lanes) that highlight in sync with the tour. Produces schema-valid .tour files anchored by regex pattern for resilience.
---

# gCodeTour Author

Generate schema-valid CodeTour `.tour` files that walk a reader through a codebase step by step. The reader plays the tour back in VS Code (the CodeTour extension) and steps through annotated files with `Cmd/Ctrl + →`.

This skill targets the **`greglamb/gcodetour` fork** as the playback runtime, so fork-only step properties are available: `contents` (inline-content steps), `icon` (tree icon), and `diagram` (synchronized diagram steps — see [Authoring diagrams](#authoring-diagrams)). Never emit `markerTitle` — it is derived by the player from marker comments and stripped on save, so authoring it does nothing.

A `.tour` file is just JSON. The value of authoring it programmatically is that the whole tree can be read and call paths traced in one pass — the tedious part of building a tour by hand.

## Confirm intent when the ask is ambiguous

This skill produces a playable `.tour` file, not prose. When the request clearly wants that artifact — it names CodeTour/a tour file, says "tour"/"walkthrough as steps," or asks to edit an existing `.tour` — proceed without asking. But when the phrasing could just as easily mean a written explanation in chat (e.g. "explain how X works", "walk me through the auth flow") with no signal that a file is wanted, ask one quick question before generating: a navigable CodeTour file, or a written explanation here? Building a JSON file when someone wanted a paragraph is a surprise worth one question to avoid; don't ask when intent is already clear.

## When to reach for the reference

The full schema, every markdown extension, storage locations, and config live in [references/schema.md](references/schema.md). Read it before writing any `.tour` file — the details (`pattern` vs `line` precedence, `selection` shape, the `view` enum, escaping rules) are easy to get wrong from memory. A known-good, schema-valid example is in [assets/example.tour](assets/example.tour) — mirror its structure rather than inventing one.

## Authoring procedure

1. **Survey the tree.** Identify entry point(s), the layering (HTTP → routing → services → data), and any cross-cutting concerns (auth, config, error handling). Don't tour files at random — find the narrative.
2. **Pick one narrative arc per tour.** A good tour follows a single thread end-to-end (e.g. "a request's lifecycle") rather than cataloguing every file. Split distinct concerns into separate, linked tours (`1 - ...`, `2 - ...`) instead of one sprawling tour.
3. **Open with a content step.** Step 1 has no anchor — just a `description` that frames what the tour covers and (optionally) a `>> ` shell command to get the project running.
4. **Write the steps in reading order**, each anchored by `pattern` (see Anchoring below). Each `description` should carry the understanding a maintainer can't get by re-reading the code: the **invariant** the code upholds ("`req.user` is assumed populated past this point"), the **decision and the alternative not taken** ("access goes through a repository so the ORM stays swappable"), and the **coupling** that will bite ("change this signature and the three callers in `routes/` break"). Narrating what a line does is wasted space — the reader can see that. Lead with a `### Heading` so the tree view is readable.
   - **Flag where names and docs over-promise.** This is one of the highest-leverage things a tour gives a newcomer. Actively hunt for `NotImplementedException`/`TODO`/`FIXME`/`throw new Error("not implemented")`/empty or stub methods/dead or unwired modules, and where the README or a class name claims more than the code delivers ("Phase 2 complete" over a stubbed service; a `Client` that's half-built). Call these out at the relevant step — *"despite the name, this is a stub: it throws `NotImplementedException`; the real path is `[#n]`"* — so the reader doesn't mistake an aspirational surface for working code. The structural facts (a method throws, a module is never imported) are observable, so state them plainly rather than hedging.
5. **Pin the tour** to a tag or commit via `ref` so it doesn't silently desync, and set `isPrimary: true` on the entry tour. Caveat: a commit/tag `ref` makes the tour read-only during playback, so for a tour you're authoring on a still-moving branch, pin to the **branch name** (or omit `ref`) to keep editing as the branch advances — switch to a commit/tag once it stabilizes. See the `ref` table in [references/schema.md](references/schema.md).
6. **Self-verify** before handing it over (see Verification).

## Anchoring: use `pattern`, not `line`

This is the single most important quality lever. Line numbers are ordinals that desync the moment any code shifts above them. `pattern` re-locates a step by matching the *content* of the line, so it survives edits.

- Set `pattern` to a regex matching a distinctive line (a function signature, a class declaration, a specific `app.use(...)`), and **omit `line` entirely** — if both are present, `line` wins.
- Escape regex metacharacters in literal code, and remember JSON doubles the backslash: a literal `express()` becomes `"express\\(\\)"` in the file.
- Make the pattern specific enough to match exactly one line.
- **Grep-count each pattern before you write the step.** Run the regex against the target file (e.g. `grep -nE 'pattern' path/to/file`) and confirm it matches **exactly one** line up front — zero means a broken anchor, more than one means an ambiguous one. Doing this for every step as you go eliminates verifier round-trips at the end.

## Authoring a multi-tour set

Split distinct concerns into numbered, linked tours rather than one sprawling tour. The title/link rules are the highest-friction part of the format because the two link kinds use **opposite** forms — here they are side by side:

- **Title** each tour `N - Display Title` (e.g. `2 - The Planning Pipeline`). Don't put a second ` - ` in the title: the player derives the *display* name by stripping the `N - ` prefix and would truncate at the next hyphen.
- **`nextTour`** matches the **full, raw** title — `"nextTour": "2 - The Planning Pipeline"`.
- **In-text tour links** use the **display** title (prefix stripped) in the **bracket–bracket** form — `[the planner][The Planning Pipeline]`, or to a step `[the parser][The Planning Pipeline#3]`. A bare `[The Planning Pipeline]` works too. Step-only links within the current tour are `[#3]` / `[label][#3]`.
- **Do not** use the parenthesis form for tour navigation: `[Tour 2](2 - The Planning Pipeline)` is parsed as a **file** link to a nonexistent path and renders dead. Parentheses are for files/images only, and only with a `./` prefix (`[parser](./src/Core/ManifestCsvParser.cs)`) — without the `./` the player won't rewrite it to open the file.
- **Author the cross-links last**, once every title is final, then run the verifier against the whole `.tours/` directory so `nextTour`, `[Title#n]`, `[#n]`, and inline `[label](./file)` links are all checked together.

```jsonc
// .tours/1-intro.tour
{ "title": "1 - Intro", "isPrimary": true, "nextTour": "2 - The Planning Pipeline",
  "steps": [ { "description": "### Overview\nThen dive into [the planner][The Planning Pipeline#2]." } ] }

// .tours/2-pipeline.tour
{ "title": "2 - The Planning Pipeline",
  "steps": [ { "description": "### Parsing\nStarts in [ManifestCsvParser](./src/Core/ManifestCsvParser.cs)." } ] }
```

## Authoring diagrams

A tour can pair steps with **synchronized diagrams** so the reader sees the code *and* the system it lives in at once: a step's `diagram` opens an SVG beside the editor, highlights one element, and pins a short callout — moving in lockstep with navigation. Reach for this when a walkthrough benefits from architecture/flow context (a request lifecycle, a message/enrichment path, a cross-service user flow), not for every tour. The full field reference and the `ct://el/<alias>` convention are in [references/schema.md](references/schema.md#diagram-steps); the procedure below is the authoring loop.

### Toolchain (fixed)

PlantUML + **C4-PlantUML** only — do not reach for Mermaid, Structurizr, D2, or GUI tools. Architecture views use C4 (`C4_Context`/`C4_Container`/`C4_Component`/`C4_Deployment`/`C4_Dynamic`); cross-actor user flows use **PlantUML activity swim lanes** (the `|Lane|` form, which needs no Graphviz). Everything renders to SVG via the skill's bundled, pinned toolchain (a digest-pinned Kroki image with C4-PlantUML in its stdlib; fonts installed by `fnt`) — never add a new dependency.

### Theming

**Activity / swim-lane diagrams:** default to `!theme bluegray` (place it on the line right after `@startuml`). It's the solid-blue theme that most closely matches the `C4_blue_new` C4 default — both are solid blue boxes with white text on a white background — so a tour mixing C4 and swim-lane diagrams reads as one set. If the user asks for a different look — or names a theme — use that instead; it's their call, so honor any request. The themes below are bundled in the pinned renderer (PlantUML 1.2025.x via Kroki) and need no remote fetch:

`plain` · `amiga` · `aws-orange` · `black-knight` · `bluegray` · `blueprint` · `carbon-gray` · `cerulean` · `cerulean-outline` · `cloudscape-design` · `crt-amber` · `crt-green` · `cyborg` · `cyborg-outline` · `hacker` · `lightgray` · `mars` · `materia` · `materia-outline` · `metal` · `mimeograph` · `minty` · `mono` · `reddress-darkblue` · `reddress-darkgreen` · `reddress-darkorange` · `reddress-darkred` · `reddress-lightblue` · `reddress-lightgreen` · `reddress-lightorange` · `reddress-lightred` · `sandstone` · `silver` · `sketchy` · `sketchy-outline` · `spacelab` · `spacelab-white` · `sunlust` · `superhero` · `superhero-outline` · `toy` · `united` · `vibrant` (and `_none_` to reset to the bare default).

**C4 diagrams** ignore the PlantUML `!theme` gallery above (C4 paints its own element colors), but C4-PlantUML has its **own** theme gallery — default to `C4_blue_new`, applied with the `from` form:

```
!theme C4_blue_new from <C4/themes>
```

`C4_blue_new` is the default because it visually pairs with the `bluegray` activity default — both are solid blue boxes with white text on a white background — so a tour mixing C4 and swim-lane diagrams looks like one set. If the user asks for a different look, use any of these (verified working in the pinned renderer): `C4_blue`, `C4_brown`, `C4_green`, `C4_violet`, `C4_sandstone`, `C4_superhero`, `C4_united`, plus the redesigned `C4_blue_new` / `C4_brown_new` / `C4_green_new` / `C4_violet_new` variants (rounded, solid fills). The `<C4/themes>` calculated path resolves from the renderer's bundled C4 stdlib, so it works offline with no remote fetch (pinned by the Kroki image digest). For control beyond a theme, use C4's styling API: `UpdateElementStyle()`, element tags via `AddElementTag` + `$tags=`, `UpdateBoundaryStyle()` / `UpdateRelStyle()`. (C4 themes bake an opaque background like the default, so the self-contained-card guidance below still holds.)

**Heads-up (why `bluegray` is the default):** a theme's colors are baked into the SVG at render time and do **not** adapt to the reader's light/dark editor — only the gCodeTour highlight/callout chrome follows the VS Code theme. `bluegray` is light (white background) and matches the `C4_blue_new` C4 default, so it reads on both light and dark editors and keeps a mixed tour consistent. Pick a dark theme (e.g. `superhero-outline`) only when you know the audience uses dark editors. Re-run `scripts/render-diagrams.sh` after changing a theme.

**Give every diagram an opaque background (so it reads on any editor theme).** The diagram panel's background follows the reader's VS Code theme, which is unknown at render time — so a transparent diagram with dark text becomes unreadable on a dark editor. Make each diagram a self-contained "card" by baking a background **matched to its own theme** (not the reader's): light theme → a light background, dark theme → a dark one.

- **C4 diagrams** already bake a white background automatically — nothing to do.
- **Activity / swim-lane diagrams** are transparent by default, so add `skinparam backgroundColor <color>` right after the `!theme` line — `#FFFFFF` for the default `bluegray` (or any light theme); a dark color (e.g. `#1B1B1B`) only if you switched to a dark theme. Use `skinparam backgroundColor`, not a hand-drawn full-canvas rectangle — you don't know the canvas size ahead of time, and the skinparam is the idiomatic one-liner.

**Fonts.** Diagrams use **Roboto** — add `skinparam defaultFontName Roboto` (after the `!theme`/`!include`). The render pipeline installs Roboto into the renderer image via `fnt` (so PlantUML *measures* boxes with it) and embeds a subset into every SVG (so it *displays* in Roboto in any viewer, even if the reader doesn't have it). To use a different font, add it to `scripts/renderer/fonts.list` first (see `scripts/renderer/README.md`) — naming a font the renderer doesn't install makes measurement and display disagree. Name Roboto **only** when you render with this bundled pipeline; if you skip the renderer, drop the `skinparam` so measurement and display agree on the default font.

### Choosing a diagram type

- **System Context / Container** → "where does this fit" overview steps, usually near the start.
- **Component** → the internal structure of the one container being reviewed.
- **C4_Dynamic** → an ordered message/enrichment flow; advance the highlight hop-by-hop and link each hop to the code that implements it.
- **Activity swim lanes** → a user/actor flow that crosses service or team boundaries.
- Prefer **several focused diagrams** over one dense one. Each step should highlight **exactly one** element.

### Recipe: colour by implementation status

Touring a half-built or in-progress codebase is one of the most common reasons to write a tour, and the highest-leverage diagram move is to colour C4 elements by **maturity, not by layer** — so "what's real vs. aspirational" is legible at a glance. Define status tags and apply them per element:

```
@startuml
!include <C4/C4_Container>
!theme C4_blue_new from <C4/themes>
skinparam defaultFontName Roboto
AddElementTag("done",    $bgColor="#2E7D32", $fontColor="#FFFFFF", $legendText="implemented")
AddElementTag("partial", $bgColor="#F9A825", $fontColor="#000000", $legendText="partial / stubbed")
AddElementTag("todo",    $bgColor="#C62828", $fontColor="#FFFFFF", $legendText="not implemented")
AddElementTag("orphan",  $bgColor="#9E9E9E", $fontColor="#FFFFFF", $legendText="dead / unwired")

Container(api,    "Order API",  "C#", "Accepts orders",     $tags="done",    $link="ct://el/api")
Container(worker, "Enricher",   "C#", "Polls + enriches",   $tags="partial", $link="ct://el/worker")
Container(ml,     "Scorer",     "C#", "Risk model",         $tags="todo",    $link="ct://el/ml")
SHOW_LEGEND()
@enduml
```

Put `SHOW_LEGEND()` at the **end** of the diagram so the colour key renders *with your `$legendText`* (the older `LAYOUT_WITH_LEGEND()` only shows the default element-type legend, not your status tags). This pairs naturally with the [stub-hunting instruction](#authoring-procedure) — the diagram shows the maturity map; the steps explain each gap. Green/amber/red/grey reads on both editor themes (the diagram bakes its own background).

### Making elements addressable (the `ct://el/<alias>` sentinel)

PlantUML has no stable element IDs, so tag every element a step will target with a sentinel hyperlink — PlantUML wraps linked elements in an `<a href="ct://el/<alias>">`, which the player resolves.

- **C4 elements:** pass `$link` — `Container(api, "Order API", "C#", "Accepts orders", $link="ct://el/orderApi")`. The whole element becomes the anchor and nothing extra is drawn.
- **Activity / swim-lane nodes:** make the node label *itself* the link with the **label-only** form — `:[[ct://el/validate Validate order]];` (the alias, a space, then the visible text). **Do not** use the trailing form `:Validate order [[ct://el/validate]];` — PlantUML renders the raw `ct://el/validate` URL as visible underlined text inside the box. (PlantUML underlines the linked label in the raw SVG; the gCodeTour player strips that underline so it reads as normal node text.)
- Aliases are stable, human-meaningful, and must **exactly equal** the `diagram.element` values in the tour. Don't key them off layout or order, so re-rendering keeps them valid.

**Swim-lane skeleton.** The first `|Lane|` must appear *before* `start`, or PlantUML errors with `This swimlane must be defined at the start of the diagram`:

```
@startuml
!theme bluegray
skinparam backgroundColor #FFFFFF
skinparam defaultFontName Roboto
|Developer|
start
:[[ct://el/open Open a workspace]];
|Extension|
:[[ct://el/discover Discover .tour files]];
stop
@enduml
```

Keep `'` comments in activity sources short and free of `[[…]]`/`<…>` link samples — a long comment block containing that syntax can break PlantUML's activity parser. Put the explanation in prose, not in the `.puml`.

**Coloring activity nodes.** Use the stereotype form `:label;<<#RRGGBB>>`. The old `#RRGGBB:label;` form is **deprecated** and PlantUML bakes a literal *"This syntax is deprecated"* warning into the rendered SVG — which still ships unless caught (`verify_tour.py` now flags baked-in PlantUML messages). It composes with the sentinel link: `:[[ct://el/cache Cache hit]];<<#C8E6C9>>`.

### Render → reference loop

1. Write sources to `.tours/diagrams/*.puml`. C4 files start with `!include <C4/C4_Container>` (or `<C4/C4_Dynamic>`, etc.) — C4-PlantUML ships in the renderer's bundled PlantUML stdlib, so this resolves offline with nothing vendored. Activity/swim-lane files start with `!theme bluegray` (see [Theming](#theming)) and declare the first `|Lane|` before `start`.
2. Render with the skill's bundled `scripts/render-diagrams.sh [diagram-dir]` (default `.tours/diagrams`). It builds a digest-pinned Kroki image (installing the fonts in `scripts/renderer/fonts.list`) and writes a sibling `*.svg` per source. Requires Docker, curl, and node; **playback requires none of them**. Commit the `.svg` files so tours play without the renderer.
3. Reference each rendered SVG from steps via `diagram: { path, element, callout }`.

### Interleaving with code

Build one synchronized arc rather than a diagram appendix:
1. Open with a **Container/Context** overview (a content step, the reviewed area highlighted).
2. **Code steps** for the entry point and key lines, each optionally pairing a `diagram` that highlights the matching element.
3. Walk a **C4_Dynamic** flow element-by-element, linking each hop to the code that implements it (use `[#n]` step links / file links to cross-reference).
4. An optional **swim-lane** step for the cross-actor flow.
5. Close with a recap on the architecture diagram.

## Verification

Before presenting a tour, confirm it holds up. The bundled script does all the mechanical checks at once:

```
python3 scripts/verify_tour.py <path-to.tour> <repo-root>
python3 scripts/verify_tour.py <.tours-dir> <repo-root>   # also checks cross-tour navigation
```

It validates against the bundled fork schema (draft-04), asserts every `file`+`pattern` step resolves to **exactly one** line, checks `directory` steps exist, rejects any step that sets `markerTitle`, validates `[#n]` step links resolve, checks inline `[label](./file)` links point at real files (and flags the `[label](Tour Title)` antipattern — a file-link form aimed at a tour, which renders dead), and — for every `diagram` step — confirms the referenced SVG exists, has no PlantUML warning/error baked into the image (e.g. the deprecated-syntax notice), and contains an `<a href="ct://el/<element>">` for the step's `element`. **Point it at the whole `.tours/` directory for a multi-tour set** and it also checks that `nextTour` and `[Title#n]` links resolve across files (the rot that silently breaks navigation when a title is renamed), and reports SVG anchors no step highlights (a cheap way to catch a mistyped `element` that resolved to the wrong, similar anchor). It exits non-zero on failure, so it also drops straight into CI or a pre-commit hook. It needs no dependencies; `jsonschema`, if installed, adds full schema validation on top of the structural checks. (System Python is often PEP-668 "externally managed", so `pip install jsonschema` may be refused — install it in a virtualenv, or just rely on the dependency-free structural checks.)

- **Run the verifier** and fix anything it flags. A `pattern` matching zero or many lines is a broken step — never ship one. A `diagram.element` with no matching `ct://el/` anchor in the SVG is equally broken — re-tag the source and re-render.
- **Set `$schema`** to `https://raw.githubusercontent.com/greglamb/gcodetour/main/schema.json` so the user's editor flags problems too.
- **Mark inferred intent as inferred.** The structural facts (what calls what, what a function does) are observable. The *why* — intent, the reason a decision was made — is usually a guess, and a confident wrong guess is how an AI-written tour misleads a reader into thinking a module is understood when it isn't. When a step states rationale you couldn't verify from the code itself, hedge it visibly ("this looks intended to…", "presumably so that…") so a reviewer knows exactly which claims to confirm. This is the difference between a tour that transfers a real mental model and one that just looks authoritative.
- **Re-read the source for any relayed structural claim.** Distinct from intent-hedging: when a *survey* — a subagent, a grep summary, prior notes — reports "X throws", "Y is a stub", "Z is buggy", it reads as observed fact and lands in the tour as fact. Re-open the actual line before you write a load-bearing claim like that; a relayed wrong fact (a "bug" on a line that's actually correct) misleads the reader exactly as much as a wrong guess, but slips past the intent-hedging rule because it looks observed.
- **Markdown rendering isn't verified.** The verifier proves anchors and links resolve; it can't see that the description *renders* wrong. Wrap identifiers in backticks (`` `CoordinatorGrain` `` — otherwise `Coordinat**or**Grain` bold-renders mid-word), avoid intra-word `*`/`_`, and watch unescaped `#`, `<`, `|`, `[` that can break a heading or table. Eyeball the rendered step, not just the JSON.
- **Flag uncertainty honestly.** The verifier proves anchors resolve, not that the *explanations* are correct. On a large or unfamiliar codebase, tell the user which steps to spot-check, especially if the tour will be committed for teammates.

## Output

Write the file to the repo's `.tours/` directory (create it if absent) with an intent-named file like `.tours/onboarding.tour`. For a multi-tour sequence, number the titles and set `nextTour`. Other valid locations and the custom-directory setting are in the reference.
