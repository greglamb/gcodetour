# Diagram renderer (pinned base, list-driven fonts)

This directory builds the Docker image that renders gCodeTour diagram SVGs. The
Kroki base is pinned by digest; C4-PlantUML comes from the base image's bundled
PlantUML stdlib (no vendoring); **fonts** are fetched by `fnt` at image build
time (see Fonts). **Playback of a tour requires none of it** — only
authoring/re-rendering does (see
[`../render-diagrams.sh`](../render-diagrams.sh)).

## Renderer

- **Image:** `yuzutech/kroki:0.31.0`
- **Digest (authoritative):** `sha256:c16303ecd8ae840a6e3a76efa53468836c6297eeb7b7316845c3b24e8dbd0398`

Kroki bundles PlantUML (and Graphviz), so C4 and activity/swim-lane diagrams all
render from the one pinned image. The render script pins by digest; the tag is
only for humans. To move to a newer Kroki, `docker pull` the new tag, copy its
`Digest:` into [`Dockerfile`](./Dockerfile) and this file, and re-render.

The renderer the script actually runs is built from [`Dockerfile`](./Dockerfile):
the pinned Kroki base above plus fonts installed by `fnt` (next section). Unlike
the base, that font step **fetches from the network at build time and is not
version-pinned** — a deliberate trade-off for list-driven font management.

## C4-PlantUML (bundled stdlib, not vendored)

C4-PlantUML ships inside the base image's PlantUML stdlib, so diagram sources
include it directly:

```
!include <C4/C4_Container>
!theme C4_blue_new from <C4/themes>
```

The `<C4/...>` calculated path resolves from the renderer's bundled stdlib, so it
works offline with no remote fetch and no vendored copy — pinned by the Kroki
image digest above. (Earlier revisions vendored the C4 `.puml` files and mounted
them as a PlantUML include path; that's no longer needed.) To move to a different
C4-PlantUML version, change the pinned Kroki image (whose PlantUML carries it).

## Fonts (`fonts.list`)

Diagrams render in **Roboto**. Rather than commit font binaries, the renderer
image installs fonts with [`fnt`](https://github.com/alexmyczko/fnt) ("apt for
fonts") from the names listed in [`fonts.list`](./fonts.list) — add a line to
install more. The image build then does two things, because fonts matter in two
places:

1. **Measurement:** installs each listed font (TTF) so PlantUML sizes boxes with
   Roboto. Without it, PlantUML measures with a DejaVu fallback while the SVG
   names Roboto — a layout-vs-display mismatch.
2. **Display:** subsets the primary font (Roboto) to a compact woff2 with
   `pyftsubset`; [`../render-diagrams.sh`](../render-diagrams.sh) extracts that
   woff2 from the image and embeds it into every SVG (via
   [`../embed-svg-font.mjs`](../embed-svg-font.mjs)), so diagrams display in
   Roboto in any viewer without the reader having it installed.

Diagram sources select it with `skinparam defaultFontName Roboto`.

**Trade-off (no pinning):** `fnt` always fetches the *latest* font over the
network at build time, so this renderer is intentionally **not** offline or
reproducible-by-pin (Docker layer-caches the build between runs on one machine).
To change the typeface: edit `fonts.list`, update `skinparam defaultFontName` in
the `.puml` sources, and adjust the subset target in [`Dockerfile`](./Dockerfile).
Fonts carry their own upstream licenses (Roboto is Apache-2.0, © Google).

> In this base image, `fnt`'s catalog exposes Debian `fonts-*` packages (not the
> Google Fonts catalog), so list a Debian package name (e.g. `fonts-roboto-unhinted`).
