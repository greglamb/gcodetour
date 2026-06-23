# Vendored diagram toolchain (pinned)

These are the pinned, in-repo dependencies used to render gCodeTour diagram SVGs.
Nothing here is fetched from a remote URL at render time, and **playback of a
tour requires none of it** — only authoring/re-rendering does (see
[`scripts/render-diagrams.sh`](../../scripts/render-diagrams.sh)).

## Renderer

- **Image:** `yuzutech/kroki:0.31.0`
- **Digest (authoritative):** `sha256:c16303ecd8ae840a6e3a76efa53468836c6297eeb7b7316845c3b24e8dbd0398`

Kroki bundles PlantUML (and Graphviz), so C4 and activity/swim-lane diagrams all
render from the one pinned image. The render script pins by digest; the tag is
only for humans. To move to a newer Kroki, `docker pull` the new tag, copy its
`Digest:` into [`renderer/Dockerfile`](../renderer/Dockerfile) and this file, and re-render.

The renderer the script actually runs is built from
[`../renderer/Dockerfile`](../renderer/Dockerfile): the pinned Kroki base above
plus the vendored Roboto fonts (next section). The build uses only the committed
files — no `apt`/network — so it's reproducible and offline.

## Fonts (`../renderer/fonts/`)

Diagrams render in **Roboto** (Apache-2.0, © Google; license in
`../renderer/fonts/LICENSE-Roboto.txt`). Fonts work in two places, so we vendor
two formats:

- **`Roboto-Regular.ttf` / `Roboto-Bold.ttf`** — copied into the renderer image
  so PlantUML *measures* text (box sizing) with Roboto. Without this it would
  measure with a fallback (DejaVu Sans) while the SVG names Roboto — a
  layout-vs-display mismatch.
- **`roboto-latin-400-normal.woff2` / `-700-normal.woff2`** (latin subset) —
  `scripts/render-diagrams.sh` embeds these into every SVG as an `@font-face`
  (via `scripts/embed-svg-font.mjs`), so the diagram *displays* in Roboto in any
  viewer without the reader having Roboto installed.

Diagram sources select it with `skinparam defaultFontName Roboto`. To change the
typeface: replace these four files, update that skinparam in the `.puml` sources,
and adjust the `font-family` in `scripts/embed-svg-font.mjs`.

## C4-PlantUML (`c4/`)

- **Version:** v2.11.0 (`plantuml-stdlib/C4-PlantUML`)
- **Files:** `C4.puml` (base) + `C4_Context`, `C4_Container`, `C4_Component`,
  `C4_Dynamic`, `C4_Deployment`, `C4_Sequence`.

The files are the authentic upstream copies. Each view file (e.g.
`C4_Container.puml`) selects between a **local** relative include and a remote
URL based on whether the `RELATIVE_INCLUDE` preprocessor variable is defined.
Our diagram sources always define it (`!$RELATIVE_INCLUDE = "."`), so the local
branch is taken and the remote `!include https://…` fallback is never executed.
The render script mounts this directory as the PlantUML include path, so
`!include C4_Container.puml` resolves here.

To update C4-PlantUML, replace these files from the desired upstream tag and
update the version above.
