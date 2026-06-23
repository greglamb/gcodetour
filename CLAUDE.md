# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Repository & pull requests

This is a **fork**: `greglamb/gcodetour` (its upstream parent is `microsoft/codetour`).

- **All pull requests MUST target `greglamb/gcodetour` (base `main`). NEVER open a PR against the upstream `microsoft/codetour` repo.**
- Because `gh` defaults a fork's PR base to the parent repo, always pass the base explicitly:
  ```
  gh pr create --repo greglamb/gcodetour --base main --head <branch>
  ```
  After creating, verify the PR with `isCrossRepository: false`.
- Branch off `main` for changes; don't commit directly to `main`.

## What this is

CodeTour is a VS Code extension for recording and playing back guided walkthroughs
("tours") of a codebase. Tours are stored as `*.tour` JSON files (schema: `schema.json`),
typically under `.tours/`, `.vscode/tours/`, or `.github/tours/`.

## Commands

- `npm install` — install dependencies
- `npm run build` — production bundle (webpack, via `ts-loader`) → `dist/`
- `npm run watch` — development build with watch
- `npm run compile` — `tsc -p ./`, emits to `out/` (used by the tests)
- `npx tsc --noEmit -p tsconfig.json` — type-check only (no emit)
- `npm run package` — produce a `.vsix` with `vsce` (runs the build first)

## Testing

Three tiers:

- **Unit** — `npm run test:unit` (or `npm test`): Mocha + `c8` over pure logic.
  Tests live in `src/test/unit/**`, compiled to `out/test/unit/**` (`.mocharc.yml`).
  Coverage is gated in `.c8rc.json`. **This is the only tier `verify` runs.**
- **Integration** — `npm run test:integration`: `@vscode/test-cli` /
  `@vscode/test-electron` launch a real VS Code against `test-fixtures/workspace`
  (config in `.vscode-test.mjs`). Tests in `src/test/integration/**`. Local-only.
- **UI / e2e** — `npm run test:ui`: Playwright + `@greglamb/vscode-test-playwright`
  (a git dependency — not on npm) drive the VS Code UI. Specs in `tests/ui/**`
  (`playwright.config.ts`), against `test-fixtures/ui-workspace`. Local-only.

Conventions:
- **Unit-testing logic (extraction pattern):** pure, VS Code-free logic lives in
  dedicated modules (`src/player/preview.ts`, `src/tourLabels.ts`) that import no
  `vscode`/`store` at runtime — use `import type` for types so the import is erased.
  This lets Mocha import them in plain Node. When you make code testable, extract it
  into such a module (re-export from its original home so callers don't change) and add
  its **compiled** path to `.c8rc.json` `include` (e.g. `out/tourLabels.js`). Code that
  imports `vscode` belongs in the integration/UI tiers, not unit tests.
- `c8` `include` globs match the **compiled** path (`out/...js`), not the `.ts` source.
- `verify` runs the unit tier only; integration/UI need a real VS Code / browser and run
  locally. There is no push/PR CI — `verify` runs inside the manual Release workflow
  (which sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`), so run `npm run verify` yourself
  before pushing.
- `@greglamb/vscode-test-playwright` is a **git dependency** pinned to a commit SHA in
  `package-lock.json`, so `npm install` will **not** pull newer lib commits on its own.
  To pick up lib updates, run `npm update @greglamb/vscode-test-playwright` and commit
  the updated `package-lock.json`.
- The web tier (`@vscode/test-web`) needs a Playwright browser: `npx playwright install
  chromium-headless-shell` (run once locally).

## Architecture

- Entry point: `src/extension.ts` (`activate`). Bundled to `dist/extension-node.js`
  (desktop) and `dist/extension-web.js` (web) — both declared in `package.json`.
- `src/store/` — MobX-based state (the `store` is an `observable`). Tour discovery,
  actions, storage, and the `provider` that watches the workspace for `*.tour` files.
- `src/player/` — playback: comment-thread rendering, decorators, status bar, and the
  tree view. `generatePreviewContent` in `src/player/index.ts` renders step descriptions
  (markdown + basic HTML, command links, file/tour references, and `{{ENV_VAR}}` substitution).
- `src/player/diagram/` — **synchronized diagram steps** (the only webview in the extension).
  `index.ts` subscribes to `onDidStartTour`/`onDidEndTour` and drives a single reusable
  `panel.ts` webview, reading the step's SVG via `workspace.fs` (works in node + web).
  Pure, unit-tested logic lives in `model.ts`/`sentinel.ts`/`layout.ts`/`sanitizePolicy.ts`
  (in `.c8rc.json`). The webview client is authored in TS (`client/main.ts`) and bundled
  **separately** by `esbuild.diagram.mjs` → `media/diagram/client.js` (so it can `import` the
  same pure policy modules) — it is NOT part of the webpack graph. `npm run build` runs
  `build:diagram` before webpack; the bundled client ships in the `.vsix` because `media/` is
  not in `.vscodeignore`. Diagrams render only during playback (`onDidStartTour` doesn't fire
  in record/edit mode). The integration tier asserts panel state via the `codetour:diagramPanelOpen`
  context key / a webview tab.
- `src/recorder/` — recording/editing tours.
- `src/liveShare/` — VS Live Share integration.
- `src/notebook/` — experimental notebook view; uses the stable
  `workspace.registerNotebookSerializer` API and is **not** wired into `activate`.
- `src/utils.ts`, `src/constants.ts`, `src/api.ts`, `src/git.ts` — shared helpers.

## Conventions / gotchas

- State is MobX; `activate` calls `configure({ isolateGlobalState: true })` to avoid
  clashing with other extensions' MobX instances.
- `@types/vscode` is modern, so `CommentThread.range` is `Range | undefined` — guard or
  assert before use. Don't re-introduce a vendored `vscode.proposed.d.ts`; prefer stable APIs.
- The `*.tour` file format is defined in `schema.json`; keep it in sync with the
  `CodeTourStep` / `CodeTour` interfaces in `src/store/index.ts` when adding fields.
- **Copyright headers (this is a fork):** files containing Microsoft-origin code keep
  `// Copyright (c) Microsoft Corporation.` (MIT requires preserving it); extracted or
  modified files add a `// Copyright (c) <year> Greg Lamb (fork modifications).` line.
  Brand-new files authored for the fork (e.g. tests) use `// Copyright (c) <year> Greg
  Lamb.` only — never stamp Microsoft's copyright on code they didn't write.
- **Shared IDs / upstream conflict:** the user-facing name is `gCodeTour`, but the
  internal IDs stay `codetour.*` (commands, view `codetour.tours`, comment-controller
  `codetour`, FS scheme `codetour`) so existing `.tour` files and their
  `command:codetour.*` links keep working. The cost: this fork and the original
  `vsls-contrib.codetour` can't run together (duplicate command registration throws).
  `activate` guards against that via `hasUpstreamConflict` (`src/conflict.ts`) — if you
  ever rename internal IDs, remove the guard, but know it breaks tour-file compatibility.

## Versioning & releasing

Versions follow **CalVer `0.YYMM.DDBB`** (2-digit year+month / day+build, leading
zeros stripped — e.g. `0.2606.2201` = 2026-06, day 22, build 01). The algorithm is
implemented in `scripts/calver.mjs`; bump with
`npm run version:bump` (rewrites only the `version` field).

Releases are **GitHub-only** — this fork does **not** publish to the VS Marketplace.
Flow: `npm run version:bump` → commit & push → run the **Release** workflow manually
(Actions tab → Release → Run workflow). It runs `verify` (format, lint, compile, unit
tests, build) as a gate, then packages the `.vsix` and **creates** a GitHub Release
tagged `v<version>` with the `.vsix` attached (`gh release create`). `verify` only runs
there — there is no separate push/PR CI workflow — so run it locally before pushing.
Do not add `vsce publish` / marketplace steps.
