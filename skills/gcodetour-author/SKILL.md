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
5. **Pin the tour** to a tag or commit via `ref` so it doesn't silently desync. Set `isPrimary: true` on the entry tour.
6. **Self-verify** before handing it over (see Verification).

## Anchoring: use `pattern`, not `line`

This is the single most important quality lever. Line numbers are ordinals that desync the moment any code shifts above them. `pattern` re-locates a step by matching the *content* of the line, so it survives edits.

- Set `pattern` to a regex matching a distinctive line (a function signature, a class declaration, a specific `app.use(...)`), and **omit `line` entirely** — if both are present, `line` wins.
- Escape regex metacharacters in literal code, and remember JSON doubles the backslash: a literal `express()` becomes `"express\\(\\)"` in the file.
- Make the pattern specific enough to match exactly one line.

## Authoring diagrams

A tour can pair steps with **synchronized diagrams** so the reader sees the code *and* the system it lives in at once: a step's `diagram` opens an SVG beside the editor, highlights one element, and pins a short callout — moving in lockstep with navigation. Reach for this when a walkthrough benefits from architecture/flow context (a request lifecycle, a message/enrichment path, a cross-service user flow), not for every tour. The full field reference and the `ct://el/<alias>` convention are in [references/schema.md](references/schema.md#diagram-steps); the procedure below is the authoring loop.

### Toolchain (fixed)

PlantUML + **C4-PlantUML** only — do not reach for Mermaid, Structurizr, D2, or GUI tools. Architecture views use C4 (`C4_Context`/`C4_Container`/`C4_Component`/`C4_Deployment`/`C4_Dynamic`); cross-actor user flows use **PlantUML activity swim lanes** (the `|Lane|` form, which needs no Graphviz). Everything renders to SVG via the vendored, pinned toolchain — never add a new dependency.

### Theming

**Activity / swim-lane diagrams:** default to `!theme materia-outline` (place it on the line right after `@startuml`). If the user asks for a different look — or names a theme — use that instead; it's their call, so honor any request. The themes below are bundled in the pinned renderer (PlantUML 1.2025.x via Kroki) and need no remote fetch:

`plain` · `amiga` · `aws-orange` · `black-knight` · `bluegray` · `blueprint` · `carbon-gray` · `cerulean` · `cerulean-outline` · `cloudscape-design` · `crt-amber` · `crt-green` · `cyborg` · `cyborg-outline` · `hacker` · `lightgray` · `mars` · `materia` · `materia-outline` · `metal` · `mimeograph` · `minty` · `mono` · `reddress-darkblue` · `reddress-darkgreen` · `reddress-darkorange` · `reddress-darkred` · `reddress-lightblue` · `reddress-lightgreen` · `reddress-lightorange` · `reddress-lightred` · `sandstone` · `silver` · `sketchy` · `sketchy-outline` · `spacelab` · `spacelab-white` · `sunlust` · `superhero` · `superhero-outline` · `toy` · `united` · `vibrant` (and `_none_` to reset to the bare default).

**C4 diagrams:** `!theme` only sets a base — C4 paints its own element colors, so the theme gallery barely shows. To restyle C4, use C4's own API (`UpdateElementStyle()`, element tags via `AddElementTag` + `$tags=`, `UpdateBoundaryStyle()`), not `!theme`.

**Heads-up (why `materia-outline` is the default):** a theme's colors are baked into the SVG at render time and do **not** adapt to the reader's light/dark editor — only the gCodeTour highlight/callout chrome follows the VS Code theme. `materia-outline` is light with clean outlines, so it reads on both light and dark editors. Pick a dark theme (e.g. `superhero-outline`) only when you know the audience uses dark editors. Re-run `scripts/render-diagrams.sh` after changing a theme.

### Choosing a diagram type

- **System Context / Container** → "where does this fit" overview steps, usually near the start.
- **Component** → the internal structure of the one container being reviewed.
- **C4_Dynamic** → an ordered message/enrichment flow; advance the highlight hop-by-hop and link each hop to the code that implements it.
- **Activity swim lanes** → a user/actor flow that crosses service or team boundaries.
- Prefer **several focused diagrams** over one dense one. Each step should highlight **exactly one** element.

### Making elements addressable (the `ct://el/<alias>` sentinel)

PlantUML has no stable element IDs, so tag every element a step will target with a sentinel hyperlink — PlantUML wraps linked elements in an `<a href="ct://el/<alias>">`, which the player resolves.

- C4 elements: pass `$link` — `Container(api, "Order API", "C#", "Accepts orders", $link="ct://el/orderApi")`.
- Activity nodes: append the link — `:Validate order [[ct://el/validate]];`.
- Aliases are stable, human-meaningful, and must **exactly equal** the `diagram.element` values in the tour. Don't key them off layout or order, so re-rendering keeps them valid.

### Render → reference loop

1. Write sources to `.tours/diagrams/*.puml`. C4 files start with `!$RELATIVE_INCLUDE = "."` then `!include C4_Container.puml` (etc.) so the vendored includes under `.tours/diagrams/vendor/c4` resolve offline; activity/swim-lane files start with `!theme materia-outline` (see [Theming](#theming)).
2. Render with `scripts/render-diagrams.sh` (digest-pinned Kroki Docker image → sibling `*.svg`). Requires Docker; **playback does not**. Commit the `.svg` files so tours play without the renderer.
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
```

It validates against the bundled fork schema (draft-04), asserts every `file`+`pattern` step resolves to **exactly one** line, checks `directory` steps exist, rejects any step that sets `markerTitle`, and — for every `diagram` step — confirms the referenced SVG exists and contains an `<a href="ct://el/<element>">` for the step's `element`. It exits non-zero on failure, so it also drops straight into CI or a pre-commit hook. It needs no dependencies; `jsonschema`, if installed, adds full schema validation on top of the structural checks.

- **Run the verifier** and fix anything it flags. A `pattern` matching zero or many lines is a broken step — never ship one. A `diagram.element` with no matching `ct://el/` anchor in the SVG is equally broken — re-tag the source and re-render.
- **Set `$schema`** to `https://raw.githubusercontent.com/greglamb/gcodetour/main/schema.json` so the user's editor flags problems too.
- **Mark inferred intent as inferred.** The structural facts (what calls what, what a function does) are observable. The *why* — intent, the reason a decision was made — is usually a guess, and a confident wrong guess is how an AI-written tour misleads a reader into thinking a module is understood when it isn't. When a step states rationale you couldn't verify from the code itself, hedge it visibly ("this looks intended to…", "presumably so that…") so a reviewer knows exactly which claims to confirm. This is the difference between a tour that transfers a real mental model and one that just looks authoritative.
- **Flag uncertainty honestly.** The verifier proves anchors resolve, not that the *explanations* are correct. On a large or unfamiliar codebase, tell the user which steps to spot-check, especially if the tour will be committed for teammates.

## Output

Write the file to the repo's `.tours/` directory (create it if absent) with an intent-named file like `.tours/onboarding.tour`. For a multi-tour sequence, number the titles and set `nextTour`. Other valid locations and the custom-directory setting are in the reference.
