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

## Fonts (`fonts.list` + Jost)

The **default** diagram font is **Jost**; **Roboto** is also kept and available.
Rather than commit font binaries, the renderer image installs them at build time:

- **Roboto** via [`fnt`](https://github.com/alexmyczko/fnt) ("apt for fonts")
  from the names in [`fonts.list`](./fonts.list).
- **Jost** directly from Google Fonts — it isn't in fnt's catalog (nor apt). The
  [`Dockerfile`](./Dockerfile) downloads the variable `Jost[wght].ttf` and uses
  `fonttools` to instance static **Regular (400)** and **Bold (700)** weights, so
  fontconfig/PlantUML see a real "Jost" family.

Fonts matter in two places, so the build handles both for each font:

1. **Measurement:** the static TTFs are installed so PlantUML sizes boxes with
   the actual font. Without it, PlantUML measures with a DejaVu fallback while the
   SVG names Jost/Roboto — a layout-vs-display mismatch.
2. **Display:** each is subsetted to a compact woff2 with `pyftsubset`;
   [`../render-diagrams.sh`](../render-diagrams.sh) extracts them and embeds
   **both** into every SVG (via [`../embed-svg-font.mjs`](../embed-svg-font.mjs)),
   so a diagram in either font displays in any viewer without the reader having
   it installed.

Diagram sources select the default with `skinparam defaultFontName Jost` (or
`Roboto` to opt into Roboto). To add another font, install it (fnt or Dockerfile),
subset it in the Dockerfile, and pass it to `embed-svg-font.mjs` in the render
script.

**Trade-off (no pinning):** `fnt` always fetches the *latest* font over the
network at build time, so this renderer is intentionally **not** offline or
reproducible-by-pin (Docker layer-caches the build between runs on one machine).
To change the typeface: edit `fonts.list`, update `skinparam defaultFontName` in
the `.puml` sources, and adjust the subset target in [`Dockerfile`](./Dockerfile).
Fonts carry their own upstream licenses (Roboto is Apache-2.0, © Google).

> In this base image, `fnt`'s catalog exposes Debian `fonts-*` packages (not the
> Google Fonts catalog), so list a Debian package name (e.g. `fonts-roboto-unhinted`).
