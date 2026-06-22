# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Repository & pull requests

This is a **fork**: `greglamb/codetour` (its upstream parent is `microsoft/codetour`).

- **All pull requests MUST target `greglamb/codetour` (base `main`). NEVER open a PR against the upstream `microsoft/codetour` repo.**
- Because `gh` defaults a fork's PR base to the parent repo, always pass the base explicitly:
  ```
  gh pr create --repo greglamb/codetour --base main --head <branch>
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
- `npx tsc --noEmit -p tsconfig.json` — type-check only (no emit)
- `npm run package` — produce a `.vsix` with `vsce` (runs the build first)

There is no test suite wired up.

## Architecture

- Entry point: `src/extension.ts` (`activate`). Bundled to `dist/extension-node.js`
  (desktop) and `dist/extension-web.js` (web) — both declared in `package.json`.
- `src/store/` — MobX-based state (the `store` is an `observable`). Tour discovery,
  actions, storage, and the `provider` that watches the workspace for `*.tour` files.
- `src/player/` — playback: comment-thread rendering, decorators, status bar, and the
  tree view. `generatePreviewContent` in `src/player/index.ts` renders step descriptions
  (markdown + basic HTML, command links, file/tour references, and `{{ENV_VAR}}` substitution).
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

## Releasing

Releases are **GitHub-only** — this fork does **not** publish to the VS Marketplace.
`.github/workflows/release.yml` runs on a GitHub Release being created: it builds the
`.vsix` and attaches it to the release. Do not add `vsce publish` / marketplace steps.
