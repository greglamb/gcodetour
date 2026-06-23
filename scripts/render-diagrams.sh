#!/usr/bin/env bash
#
# render-diagrams.sh — render PlantUML/C4 diagram sources to addressable SVGs.
#
# Converts every `*.puml` in a diagram directory to a sibling `*.svg` using a
# Kroki renderer image (built from `<diagram-dir>/renderer`) that installs fonts
# with `fnt` (apt for fonts) from `renderer/fonts.list` and subsets the primary
# font (Roboto) to a compact woff2. The vendored C4-PlantUML includes are mounted
# in, so include resolution is offline. After each render the Roboto woff2 is
# embedded into the SVG (as @font-face) so the diagram displays in Roboto in any
# viewer, whether or not the reader has it installed.
#
# NOTE: `fnt` fetches the latest fonts from the network at *image build* time and
# cannot pin a version — so the renderer is intentionally NOT offline/
# reproducible-by-pin (unlike the digest-pinned base and vendored C4). See
# `.tours/diagrams/vendor/README.md`.
#
# These SVGs are what gCodeTour's synchronized-diagram steps display: each element
# tagged in the source with a `ct://el/<alias>` hyperlink is wrapped by PlantUML
# in an `<a href="ct://el/<alias>">`, which the player resolves to highlight it.
#
# Usage:
#   scripts/render-diagrams.sh [diagram-dir]      # default .tours/diagrams
# Environment:
#   KROKI_PORT    Host port to publish the renderer on (default 8753).
#
# Requirements: Docker (builds + runs the renderer; the build needs network for
# fnt), curl, and node (embeds the font). Playback of a tour needs NONE of this.
# Written for portable Bash 3.2.

set -eu

RENDERER_TAG="gcodetour-kroki:fnt"
KROKI_PORT="${KROKI_PORT:-8753}"

DIAGRAM_DIR="${1:-.tours/diagrams}"
VENDOR_DIR="$DIAGRAM_DIR/vendor/c4"
RENDERER_DIR="$DIAGRAM_DIR/renderer"
EMBED_SCRIPT="scripts/embed-svg-font.mjs"
# The embed woff2 are produced inside the image (no font files are committed) and
# extracted to this temp dir at run time.
WEBFONT_DIR=""
CONTAINER_ID=""

# --- Preflight ----------------------------------------------------------------
for tool in docker curl node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: $tool is required." >&2
    exit 1
  fi
done
for dir in "$DIAGRAM_DIR" "$VENDOR_DIR" "$RENDERER_DIR"; do
  if [ ! -d "$dir" ]; then
    echo "error: directory not found: $dir" >&2
    exit 1
  fi
done
if [ ! -f "$EMBED_SCRIPT" ]; then
  echo "error: required file not found: $EMBED_SCRIPT" >&2
  exit 1
fi

ABS_VENDOR_DIR="$(cd "$VENDOR_DIR" && pwd)"

cleanup() {
  if [ -n "$CONTAINER_ID" ]; then
    docker stop "$CONTAINER_ID" >/dev/null 2>&1 || true
  fi
  if [ -n "$WEBFONT_DIR" ]; then
    rm -rf "$WEBFONT_DIR" || true
  fi
}
trap cleanup EXIT INT TERM

# --- Build the renderer image -------------------------------------------------
# fnt fetches the fonts in fonts.list; Docker layer-caches this when fonts.list
# (and the Dockerfile) are unchanged, so repeat renders don't re-hit the network.
echo "Building renderer image $RENDERER_TAG (fnt installs renderer/fonts.list) ..."
docker build -t "$RENDERER_TAG" "$RENDERER_DIR"

# --- Extract the embed woff2 from the built image (nothing committed) ----------
WEBFONT_DIR="$(mktemp -d)"
FONT_REGULAR="$WEBFONT_DIR/roboto-400.woff2"
FONT_BOLD="$WEBFONT_DIR/roboto-700.woff2"
docker run --rm --entrypoint cat "$RENDERER_TAG" \
  /usr/local/share/gcodetour-webfonts/roboto-400.woff2 >"$FONT_REGULAR"
docker run --rm --entrypoint cat "$RENDERER_TAG" \
  /usr/local/share/gcodetour-webfonts/roboto-700.woff2 >"$FONT_BOLD"

# --- Start the renderer -------------------------------------------------------
# unsafe mode is required so PlantUML may resolve our local (vendored) includes;
# our sources never reference remote URLs, so nothing is fetched at render time.
echo "Starting renderer on port $KROKI_PORT ..."
CONTAINER_ID="$(docker run -d --rm \
  -p "$KROKI_PORT:8000" \
  -e KROKI_SAFE_MODE=unsafe \
  -e KROKI_PLANTUML_INCLUDE_PATH=/data \
  -v "$ABS_VENDOR_DIR:/data:ro" \
  "$RENDERER_TAG")"

# --- Wait for health ----------------------------------------------------------
BASE_URL="http://localhost:$KROKI_PORT"
printf 'Waiting for the renderer to become healthy'
ready=0
i=0
while [ "$i" -lt 60 ]; do
  if curl -fsS --max-time 3 "$BASE_URL/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  printf '.'
  sleep 1
  i=$((i + 1))
done
printf '\n'
if [ "$ready" -ne 1 ]; then
  echo "error: renderer did not become healthy within 60s." >&2
  exit 1
fi

# --- Render every *.puml, then embed the webfont ------------------------------
rendered=0
failed=0
for puml in "$DIAGRAM_DIR"/*.puml; do
  # Bash 3.2 has no nullglob; skip the literal pattern when nothing matches.
  [ -e "$puml" ] || continue
  svg="${puml%.puml}.svg"
  printf 'Rendering %s -> %s ... ' "$(basename "$puml")" "$(basename "$svg")"
  if curl -fsS --max-time 60 -X POST "$BASE_URL/plantuml/svg" \
    --data-binary "@$puml" -o "$svg"; then
    node "$EMBED_SCRIPT" "$svg" "$FONT_REGULAR" "$FONT_BOLD"
    echo "ok"
    rendered=$((rendered + 1))
  else
    echo "FAILED"
    rm -f "$svg"
    failed=$((failed + 1))
  fi
done

echo "Rendered $rendered diagram(s); $failed failed."
[ "$failed" -eq 0 ]
