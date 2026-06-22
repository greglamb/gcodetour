---
name: gcodetour-author
description: Author CodeTour walkthrough files (.tour JSON) that explain or onboard someone to a codebase, directly inside VS Code. Use this whenever the user wants to create, generate, or update a guided code tour, a codebase walkthrough, an onboarding tour, or a CodeTour file — or when they ask to "explain this codebase as a tour," "make a walkthrough of how X works," "document the request flow as steps," or point at an unfamiliar repo and ask for a guided introduction. Also use when editing existing .tour files or fixing tour drift. Produces schema-valid .tour files anchored by regex pattern for resilience.
---

# gCodeTour Author

Generate schema-valid CodeTour `.tour` files that walk a reader through a codebase step by step. The reader plays the tour back in VS Code (the CodeTour extension) and steps through annotated files with `Cmd/Ctrl + →`.

This skill targets the **`greglamb/gcodetour` fork** as the playback runtime, so fork-only step properties are available: `contents` (inline-content steps) and `icon` (tree icon). Never emit `markerTitle` — it is derived by the player from marker comments and stripped on save, so authoring it does nothing.

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

## Verification

Before presenting a tour, confirm it holds up. The bundled script does all three mechanical checks at once:

```
python3 scripts/verify_tour.py <path-to.tour> <repo-root>
```

It validates against the bundled fork schema (draft-04), asserts every `file`+`pattern` step resolves to **exactly one** line, checks `directory` steps exist, and rejects any step that sets `markerTitle`. It exits non-zero on failure, so it also drops straight into CI or a pre-commit hook. It needs no dependencies; `jsonschema`, if installed, adds full schema validation on top of the structural checks.

- **Run the verifier** and fix anything it flags. A `pattern` matching zero or many lines is a broken step — never ship one.
- **Set `$schema`** to `https://raw.githubusercontent.com/greglamb/gcodetour/main/schema.json` so the user's editor flags problems too.
- **Mark inferred intent as inferred.** The structural facts (what calls what, what a function does) are observable. The *why* — intent, the reason a decision was made — is usually a guess, and a confident wrong guess is how an AI-written tour misleads a reader into thinking a module is understood when it isn't. When a step states rationale you couldn't verify from the code itself, hedge it visibly ("this looks intended to…", "presumably so that…") so a reviewer knows exactly which claims to confirm. This is the difference between a tour that transfers a real mental model and one that just looks authoritative.
- **Flag uncertainty honestly.** The verifier proves anchors resolve, not that the *explanations* are correct. On a large or unfamiliar codebase, tell the user which steps to spot-check, especially if the tour will be committed for teammates.

## Output

Write the file to the repo's `.tours/` directory (create it if absent) with an intent-named file like `.tours/onboarding.tour`. For a multi-tour sequence, number the titles and set `nextTour`. Other valid locations and the custom-directory setting are in the reference.
