# Vendored diagram toolchain (pinned)

These are the dependencies used to render gCodeTour diagram SVGs — the Kroki base
and the C4 includes are pinned/vendored; **fonts** are fetched by `fnt` at image
build time (see Fonts). **Playback of a tour requires none of it** — only
authoring/re-rendering does (see
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
plus fonts installed by `fnt` (next section). Unlike the base and the C4 includes,
that font step **fetches from the network at build time and is not version-pinned**
— a deliberate trade-off for list-driven font management.

## Fonts (`../renderer/fonts.list`)

Diagrams render in **Roboto**. Rather than commit font binaries, the renderer
image installs fonts with [`fnt`](https://github.com/alexmyczko/fnt) ("apt for
fonts") from the names listed in
[`../renderer/fonts.list`](../renderer/fonts.list) — add a line to install more.
The image build then does two things, because fonts matter in two places:

1. **Measurement:** installs each listed font (TTF) so PlantUML sizes boxes with
   Roboto. Without it, PlantUML measures with a DejaVu fallback while the SVG
   names Roboto — a layout-vs-display mismatch.
2. **Display:** subsets the primary font (Roboto) to a compact woff2 with
   `pyftsubset`; `scripts/render-diagrams.sh` extracts that woff2 from the image
   and embeds it into every SVG (via `scripts/embed-svg-font.mjs`), so diagrams
   display in Roboto in any viewer without the reader having it installed.

Diagram sources select it with `skinparam defaultFontName Roboto`.

**Trade-off (no pinning):** `fnt` always fetches the *latest* font over the
network at build time, so this renderer is intentionally **not** offline or
reproducible-by-pin (Docker layer-caches the build between runs on one machine).
To change the typeface: edit `fonts.list`, update `skinparam defaultFontName` in
the `.puml` sources, and adjust the subset target in `renderer/Dockerfile`.
Fonts carry their own upstream licenses (Roboto is Apache-2.0, © Google).

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
