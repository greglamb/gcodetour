# Diagram renderer image: the pinned Kroki base + the diagram fonts.
#
# Why a custom image: the base Kroki image doesn't ship our fonts, so PlantUML
# would *measure* text (to size boxes) with a fallback (DejaVu Sans) while the
# diagrams reference Jost/Roboto — a layout-vs-display mismatch. We fetch both
# fonts from google/fonts, instance static weights, then subset each to a small
# woff2 the render script embeds into every SVG for display. The DEFAULT diagram
# font is Jost; Roboto is kept (and also embedded).
#
# C4-PlantUML ships in the base image's PlantUML stdlib, so sources use
# `!include <C4/...>` — nothing is vendored or fetched at render time.
#
# Reproducible by pin: the base is pinned by digest and the fonts by a google/fonts
# commit (GOOGLE_FONTS_REF below) — bump that SHA to update fonts. See README.md.
FROM yuzutech/kroki@sha256:c16303ecd8ae840a6e3a76efa53468836c6297eeb7b7316845c3b24e8dbd0398

USER root

# fonttools (varLib.instancer + pyftsubset) + brotli (woff2); curl for the fetch.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates fonttools python3-brotli \
 && rm -rf /var/lib/apt/lists/*

# Fetch both fonts from a PINNED google/fonts commit and instance static
# Regular(400)/Bold(700) so fontconfig/PlantUML see real "Jost"/"Roboto" families
# (both ship as variable fonts; Roboto also has a width axis, pinned to 100).
ARG GOOGLE_FONTS_REF=e2ff3c28d1ce433a95ee071a0861b2a75235ef9b
RUN base="https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS_REF}" \
 && curl -fsSL -o /tmp/jost.ttf   "${base}/ofl/jost/Jost%5Bwght%5D.ttf" \
 && curl -fsSL -o /tmp/roboto.ttf "${base}/ofl/roboto/Roboto%5Bwdth,wght%5D.ttf" \
 && python3 -m fontTools.varLib.instancer /tmp/jost.ttf wght=400 \
      --update-name-table -o /usr/local/share/fonts/Jost-Regular.ttf \
 && python3 -m fontTools.varLib.instancer /tmp/jost.ttf wght=700 \
      --update-name-table -o /usr/local/share/fonts/Jost-Bold.ttf \
 && python3 -m fontTools.varLib.instancer /tmp/roboto.ttf wght=400 wdth=100 \
      --update-name-table -o /usr/local/share/fonts/Roboto-Regular.ttf \
 && python3 -m fontTools.varLib.instancer /tmp/roboto.ttf wght=700 wdth=100 \
      --update-name-table -o /usr/local/share/fonts/Roboto-Bold.ttf \
 && fc-cache -f

# Subset each font (Jost default + Roboto) to a compact woff2 the render script
# embeds into every SVG, so diagrams display in either in any viewer. Latin +
# common punctuation/arrows/math is plenty for diagram labels.
RUN mkdir -p /usr/local/share/gcodetour-webfonts \
 && SUBSET="U+0000-00FF,U+2000-206F,U+2190-21FF,U+2200-22FF" \
 && pyftsubset /usr/local/share/fonts/Jost-Regular.ttf \
      --unicodes="$SUBSET" --flavor=woff2 \
      --output-file=/usr/local/share/gcodetour-webfonts/jost-400.woff2 \
 && pyftsubset /usr/local/share/fonts/Jost-Bold.ttf \
      --unicodes="$SUBSET" --flavor=woff2 \
      --output-file=/usr/local/share/gcodetour-webfonts/jost-700.woff2 \
 && pyftsubset /usr/local/share/fonts/Roboto-Regular.ttf \
      --unicodes="$SUBSET" --flavor=woff2 \
      --output-file=/usr/local/share/gcodetour-webfonts/roboto-400.woff2 \
 && pyftsubset /usr/local/share/fonts/Roboto-Bold.ttf \
      --unicodes="$SUBSET" --flavor=woff2 \
      --output-file=/usr/local/share/gcodetour-webfonts/roboto-700.woff2
