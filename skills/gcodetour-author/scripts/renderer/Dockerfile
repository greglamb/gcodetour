# Diagram renderer image: the pinned Kroki base + fonts fetched by `fnt`.
#
# Why a custom image: the base Kroki image doesn't ship Roboto, so PlantUML would
# *measure* text (to size boxes) with a fallback (DejaVu Sans) while the diagrams
# reference Roboto — a layout-vs-display mismatch. We install the fonts named in
# fonts.list with `fnt`, then subset the primary font (Roboto) to a small woff2
# that the render script embeds into each SVG for display.
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

# Subset the primary font (Roboto) to a compact woff2 the render script embeds
# into each SVG, so diagrams display in Roboto in any viewer. Latin + common
# punctuation/arrows/math is plenty for diagram labels.
RUN mkdir -p /usr/local/share/gcodetour-webfonts \
 && SUBSET="U+0000-00FF,U+2000-206F,U+2190-21FF,U+2200-22FF" \
 && pyftsubset /usr/local/share/fonts/Roboto-Regular.ttf \
      --unicodes="$SUBSET" --flavor=woff2 \
      --output-file=/usr/local/share/gcodetour-webfonts/roboto-400.woff2 \
 && pyftsubset /usr/local/share/fonts/Roboto-Bold.ttf \
      --unicodes="$SUBSET" --flavor=woff2 \
      --output-file=/usr/local/share/gcodetour-webfonts/roboto-700.woff2
