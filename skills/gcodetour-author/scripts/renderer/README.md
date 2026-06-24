# Diagram renderer (pinned base, pinned fonts)

This directory builds the Docker image that renders gCodeTour diagram SVGs. The
Kroki base is pinned by digest; C4-PlantUML comes from the base image's bundled
PlantUML stdlib (no vendoring); **fonts** are fetched from a pinned `google/fonts`
commit at image build time (see Fonts). **Playback of a tour requires none of
it** — only authoring/re-rendering does (see
[`../render-diagrams.sh`](../render-diagrams.sh)).

## Renderer

- **Image:** `yuzutech/kroki:0.31.0`
- **Digest (authoritative):** `sha256:c16303ecd8ae840a6e3a76efa53468836c6297eeb7b7316845c3b24e8dbd0398`

Kroki bundles PlantUML (and Graphviz), so C4 and activity/swim-lane diagrams all
render from the one pinned image. The render script pins by digest; the tag is
only for humans. To move to a newer Kroki, `docker pull` the new tag, copy its
`Digest:` into [`Dockerfile`](./Dockerfile) and this file, and re-render.

The renderer the script actually runs is built from [`Dockerfile`](./Dockerfile):
the pinned Kroki base above plus the fonts (next section). Both the base digest
and the font commit are pinned, so the image is reproducible by pin.

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

## Fonts (Jost default + Roboto)

The **default** diagram font is **Jost**; **Roboto** is also kept and available.
Rather than commit font binaries (or use `fnt`, which only had an old Debian
Roboto and no Jost), the [`Dockerfile`](./Dockerfile) fetches both from a
**pinned `google/fonts` commit** (`GOOGLE_FONTS_REF`). Both ship as variable
fonts, so it instances static **Regular (400)** and **Bold (700)** weights with
`fonttools` (Roboto also has a width axis, pinned to 100), giving real
"Jost"/"Roboto" families. Fonts matter in two places, handled for each:

1. **Measurement:** the static TTFs are installed so PlantUML sizes boxes with
   the actual font. Without it, PlantUML measures with a DejaVu fallback while the
   SVG names Jost/Roboto — a layout-vs-display mismatch.
2. **Display:** each is subsetted to a compact woff2 with `pyftsubset`;
   [`../render-diagrams.sh`](../render-diagrams.sh) extracts them and embeds
   **both** into every SVG (via [`../embed-svg-font.mjs`](../embed-svg-font.mjs)),
   so a diagram in either font displays in any viewer without the reader having
   it installed.

Diagram sources select the default with `skinparam defaultFontName Jost` (or
`Roboto` to opt into Roboto).

**Reproducible.** Both fonts come from the pinned `GOOGLE_FONTS_REF` commit in the
Dockerfile, so rebuilds get the same fonts (no more "latest, unpinned" fetch).
To update fonts, bump `GOOGLE_FONTS_REF`. To add a font: download + instance it
in the Dockerfile, subset it there, and pass it to `embed-svg-font.mjs` in the
render script — then point `skinparam defaultFontName` at it in the `.puml`
sources. Fonts carry their own upstream licenses (Jost and Roboto are both under
the SIL Open Font License, © their authors).
