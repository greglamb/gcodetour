# Diagram renderer image: the pinned Kroki base + the vendored Roboto fonts.
#
# Why a custom image: the base Kroki image doesn't ship Roboto, so PlantUML would
# *measure* text (to size boxes) with a fallback font (DejaVu Sans) while the
# diagrams reference Roboto — a layout-vs-display mismatch. Copying the same
# Roboto we embed into the SVGs makes measurement and display agree.
#
# Pinned by base digest + the committed .ttf files; no apt / network at build.
FROM yuzutech/kroki@sha256:c16303ecd8ae840a6e3a76efa53468836c6297eeb7b7316845c3b24e8dbd0398

USER root
COPY fonts/Roboto-Regular.ttf fonts/Roboto-Bold.ttf \
  /usr/share/fonts/truetype/gcodetour-roboto/
RUN fc-cache -f
