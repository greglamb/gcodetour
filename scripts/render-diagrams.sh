#!/usr/bin/env bash
#
# render-diagrams.sh — render PlantUML/C4 diagram sources to addressable SVGs.
#
# Converts every `*.puml` in a diagram directory to a sibling `*.svg` using a
# Kroki renderer image extended with the vendored Roboto fonts (built from
# `<diagram-dir>/renderer`). The vendored C4-PlantUML includes are mounted in, so
# rendering is fully offline — no `!include`, and no font, is fetched from the
# network at render time. After each render, the Roboto webfont is embedded into
# the SVG (as @font-face) so the diagram displays in Roboto in any viewer,
# whether or not the reader has Roboto installed.
#
# These SVGs are what gCodeTour's synchronized-diagram steps display: each element
# tagged in the source with a `ct://el/<alias>` hyperlink is wrapped by PlantUML
# in an `<a href="ct://el/<alias>">`, which the player resolves to highlight it.
#
# Usage:
#   scripts/render-diagrams.sh [diagram-dir]
#     diagram-dir   Holds `*.puml`, `vendor/c4`, and `renderer/`.
#                   Defaults to `.tours/diagrams`.
#
# Environment:
#   KROKI_PORT    Host port to publish the renderer on (default 8753).
#
# Requirements: Docker (builds + runs the renderer), curl, and node (embeds the
# font). Playback of a tour needs NONE of this. Written for portable Bash 3.2.

set -eu

# The renderer image is built locally from the committed Dockerfile (pinned Kroki
# base digest + vendored Roboto TTFs) — reproducible, no apt/network at build.
RENDERER_TAG="gcodetour-kroki:0.31.0-roboto"
KROKI_PORT="${KROKI_PORT:-8753}"

DIAGRAM_DIR="${1:-.tours/diagrams}"
VENDOR_DIR="$DIAGRAM_DIR/vendor/c4"
RENDERER_DIR="$DIAGRAM_DIR/renderer"
FONT_REGULAR="$RENDERER_DIR/fonts/roboto-latin-400-normal.woff2"
FONT_BOLD="$RENDERER_DIR/fonts/roboto-latin-700-normal.woff2"
EMBED_SCRIPT="scripts/embed-svg-font.mjs"

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
for file in "$FONT_REGULAR" "$FONT_BOLD" "$EMBED_SCRIPT"; do
  if [ ! -f "$file" ]; then
    echo "error: required file not found: $file" >&2
    exit 1
  fi
done

ABS_VENDOR_DIR="$(cd "$VENDOR_DIR" && pwd)"

# --- Build the renderer image (cached; only builds when missing) --------------
if ! docker image inspect "$RENDERER_TAG" >/dev/null 2>&1; then
  echo "Building renderer image $RENDERER_TAG ..."
  docker build -t "$RENDERER_TAG" "$RENDERER_DIR"
fi

# --- Start the renderer -------------------------------------------------------
# unsafe mode is required so PlantUML may resolve our local (vendored) includes;
# our sources never reference remote URLs, so nothing is fetched from the network.
echo "Starting renderer on port $KROKI_PORT ..."
CONTAINER_ID="$(docker run -d --rm \
  -p "$KROKI_PORT:8000" \
  -e KROKI_SAFE_MODE=unsafe \
  -e KROKI_PLANTUML_INCLUDE_PATH=/data \
  -v "$ABS_VENDOR_DIR:/data:ro" \
  "$RENDERER_TAG")"

cleanup() {
  docker stop "$CONTAINER_ID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

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
