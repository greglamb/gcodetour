# Diagram renderer image: the pinned Kroki base + the diagram fonts.
#
# Why a custom image: the base Kroki image doesn't ship our fonts, so PlantUML
# would *measure* text (to size boxes) with a fallback (DejaVu Sans) while the
# diagrams reference Jost/Roboto — a layout-vs-display mismatch. We install the
# fonts (Roboto via `fnt` from fonts.list; Jost fetched from Google Fonts since
# fnt has no Jost), then subset each to a small woff2 the render script embeds
# into every SVG for display. The DEFAULT diagram font is Jost; Roboto is kept.
#
# C4-PlantUML ships in the base image's PlantUML stdlib, so sources use
# `!include <C4/...>` — nothing is vendored or fetched at render time.
#
# NOTE: `fnt` fetches the latest fonts from the network at build time and cannot
# pin a version, so this image is intentionally NOT offline/reproducible-by-pin
# (unlike the digest-pinned base). See README.md.
FROM yuzutech/kroki@sha256:c16303ecd8ae840a6e3a76efa53468836c6297eeb7b7316845c3b24e8dbd0398

USER root

# fnt = "apt for fonts"; fonttools + brotli give us pyftsubset (woff2 subsetting).
RUN apt-get update \
 && apt-get install -y --no-install-recommends fnt fonttools python3-brotli \
 && rm -rf /var/lib/apt/lists/*

# Install every font named in fonts.list (skipping blanks/comments).
COPY fonts.list /tmp/fonts.list
RUN fnt update \
 && while IFS= read -r font; do \
      case "$font" in ""|\#*) continue ;; esac; \
      echo "fnt install $font"; fnt install "$font"; \
    done < /tmp/fonts.list \
 && fc-cache -f

# Jost is the default diagram font but isn't in fnt's catalog (nor apt), so fetch
# it from Google Fonts as a variable font and instance static 400/700 weights
# (so fontconfig/PlantUML see a real "Jost" Regular + Bold for correct measuring).
RUN curl -fsSL -o /tmp/jost-var.ttf \
      "https://raw.githubusercontent.com/google/fonts/main/ofl/jost/Jost%5Bwght%5D.ttf" \
 && python3 -m fontTools.varLib.instancer /tmp/jost-var.ttf wght=400 \
      --update-name-table -o /usr/local/share/fonts/Jost-Regular.ttf \
 && python3 -m fontTools.varLib.instancer /tmp/jost-var.ttf wght=700 \
      --update-name-table -o /usr/local/share/fonts/Jost-Bold.ttf \
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
