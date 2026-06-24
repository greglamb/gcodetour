#!/usr/bin/env bash
#
# render-diagrams.sh — render PlantUML/C4 diagram sources to addressable SVGs.
#
# Converts every `*.puml` in a diagram directory to a sibling `*.svg` using a
# Kroki renderer image (built from the `renderer/` dir next to this script). That
# image fetches the diagram fonts (Jost default + Roboto) from a pinned
# google/fonts commit, instances static weights, and subsets each to a compact
# woff2. C4-PlantUML is the stdlib bundled inside the Kroki/PlantUML image
# (`!include <C4/...>`), so no C4 files are vendored and nothing is fetched at
# render time. After each render BOTH fonts' woff2 are embedded into the SVG (as
# @font-face) so it displays correctly in any viewer, whichever font it uses.
#
# This script is self-contained: it finds `renderer/` and `embed-svg-font.mjs`
# relative to its own location, so it works whether it lives in this repo or is
# installed into another project via the gcodetour-author skill. It only needs a
# target diagram directory (default `.tours/diagrams`, resolved from the CWD).
#
# The build fetches the fonts from the pinned google/fonts commit in
# renderer/Dockerfile, so it's reproducible-by-pin (like the digest-pinned base).
#
# These SVGs are what gCodeTour's synchronized-diagram steps display: each element
# tagged in the source with a `ct://el/<alias>` hyperlink is wrapped by PlantUML
# in an `<a href="ct://el/<alias>">`, which the player resolves to highlight it.
#
# Usage:
#   skills/gcodetour-author/scripts/render-diagrams.sh [diagram-dir]
#                                                 # diagram-dir default .tours/diagrams
# Environment:
#   KROKI_PORT    Host port to publish the renderer on (default 8753).
#
# Requirements: Docker (builds + runs the renderer; the build needs network to
# fetch the fonts), curl, and node (embeds the fonts). Playback needs NONE of it.
# Written for portable Bash 3.2.

set -eu

RENDERER_TAG="gcodetour-kroki:render"
KROKI_PORT="${KROKI_PORT:-8753}"

# Resolve paths relative to this script so it runs from any CWD / install location.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RENDERER_DIR="$SCRIPT_DIR/renderer"
EMBED_SCRIPT="$SCRIPT_DIR/embed-svg-font.mjs"

DIAGRAM_DIR="${1:-.tours/diagrams}"
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
if [ ! -d "$DIAGRAM_DIR" ]; then
  echo "error: diagram directory not found: $DIAGRAM_DIR" >&2
  exit 1
fi
if [ ! -d "$RENDERER_DIR" ]; then
  echo "error: renderer directory not found: $RENDERER_DIR" >&2
  exit 1
fi
if [ ! -f "$EMBED_SCRIPT" ]; then
  echo "error: required file not found: $EMBED_SCRIPT" >&2
  exit 1
fi

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
# The build fetches the fonts from the pinned google/fonts commit in the
# Dockerfile; Docker layer-caches this when the Dockerfile is unchanged, so
# repeat renders don't re-hit the network.
echo "Building renderer image $RENDERER_TAG (fonts from pinned google/fonts) ..."
docker build -t "$RENDERER_TAG" "$RENDERER_DIR"

# --- Extract the embed woff2 from the built image (nothing committed) ----------
# Both the default font (Jost) and Roboto are embedded into every SVG, so a
# diagram authored in either displays correctly.
WEBFONT_DIR="$(mktemp -d)"
extract_font() {
  docker run --rm --entrypoint cat "$RENDERER_TAG" \
    "/usr/local/share/gcodetour-webfonts/$1" >"$WEBFONT_DIR/$1"
}
for woff2 in jost-400.woff2 jost-700.woff2 roboto-400.woff2 roboto-700.woff2; do
  extract_font "$woff2"
done

# --- Start the renderer -------------------------------------------------------
# unsafe mode lets PlantUML resolve the bundled C4 stdlib includes/themes; our
# sources never reference remote URLs, so nothing is fetched at render time.
echo "Starting renderer on port $KROKI_PORT ..."
CONTAINER_ID="$(docker run -d --rm \
  -p "$KROKI_PORT:8000" \
  -e KROKI_SAFE_MODE=unsafe \
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
  # Content-Type: text/plain is REQUIRED. Without it curl sends
  # application/x-www-form-urlencoded, which Kroki form-decodes — and any
  # non-trivial diagram then trips Netty's field-length limit (HTTP 400,
  # TooLongFormFieldException). We also drop curl's -f so the response body is
  # written to $svg and the HTTP status is captured, making failures diagnosable.
  code="$(curl -sS --max-time 60 -X POST "$BASE_URL/plantuml/svg" \
    -H 'Content-Type: text/plain' --data-binary "@$puml" \
    -o "$svg" -w '%{http_code}')" || code="000"
  if [ "$code" = "200" ]; then
    node "$EMBED_SCRIPT" "$svg" \
      "Jost:$WEBFONT_DIR/jost-400.woff2:$WEBFONT_DIR/jost-700.woff2" \
      "Roboto:$WEBFONT_DIR/roboto-400.woff2:$WEBFONT_DIR/roboto-700.woff2"
    echo "ok"
    rendered=$((rendered + 1))
  else
    echo "FAILED (HTTP $code)"
    echo "  response: $(head -c 300 "$svg" 2>/dev/null | tr '\n' ' ')"
    echo "  renderer logs (last 15 lines — the real cause is usually here):"
    docker logs --tail 15 "$CONTAINER_ID" 2>&1 | sed 's/^/    /'
    rm -f "$svg"
    failed=$((failed + 1))
  fi
done

echo "Rendered $rendered diagram(s); $failed failed."
[ "$failed" -eq 0 ]
