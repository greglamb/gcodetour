#!/usr/bin/env bash
#
# render-diagrams.sh — render PlantUML/C4 diagram sources to addressable SVGs.
#
# Converts every `*.puml` in a diagram directory to a sibling `*.svg` using a
# digest-pinned Kroki Docker image. The vendored C4-PlantUML includes (under
# `<diagram-dir>/vendor/c4`) are mounted into the container, so rendering is
# fully offline — no `!include` is fetched from a remote URL at render time.
#
# These SVGs are what gCodeTour's synchronized-diagram steps display: each
# diagram element tagged in the source with a `ct://el/<alias>` hyperlink is
# wrapped by PlantUML in an `<a href="ct://el/<alias>">`, which the player
# resolves to highlight that element.
#
# Usage:
#   scripts/render-diagrams.sh [diagram-dir]
#
#   diagram-dir   Directory holding `*.puml` sources and `vendor/c4`.
#                 Defaults to `.tours/diagrams`.
#
# Environment:
#   KROKI_PORT    Host port to publish Kroki on (default 8753).
#
# Requirements: Docker (the renderer runs in a container) and curl. Playback of
# a tour needs NEITHER — only authoring/re-rendering does. Written for portable
# Bash 3.2 (the macOS default): no associative arrays, `mapfile`, or `${x^^}`.
#
# Diagram source convention (so vendored C4 includes resolve locally):
#   @startuml
#   !$RELATIVE_INCLUDE = "."
#   !include C4_Container.puml
#   ...
#   @enduml
# Activity/swim-lane diagrams need no include; tag nodes with `[[ct://el/<alias>]]`.

set -eu

# --- Pinned renderer (digest is authoritative; tag is for humans) -------------
KROKI_IMAGE="yuzutech/kroki@sha256:6d70ed44236102613e1155185340680644dded2191ff0be4f559fb31b92065d9"
KROKI_IMAGE_TAG="yuzutech/kroki:0.29.1"
KROKI_PORT="${KROKI_PORT:-8753}"

# --- Arguments ----------------------------------------------------------------
DIAGRAM_DIR="${1:-.tours/diagrams}"
VENDOR_DIR="$DIAGRAM_DIR/vendor/c4"

# --- Preflight ----------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required (the renderer runs in a container)." >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required." >&2
  exit 1
fi
if [ ! -d "$DIAGRAM_DIR" ]; then
  echo "error: diagram directory not found: $DIAGRAM_DIR" >&2
  exit 1
fi
if [ ! -d "$VENDOR_DIR" ]; then
  echo "error: vendored C4 includes not found: $VENDOR_DIR" >&2
  echo "       (expected the pinned C4-PlantUML files under $VENDOR_DIR)" >&2
  exit 1
fi

# Absolute path for the docker bind mount (Bash 3.2-friendly).
ABS_VENDOR_DIR="$(cd "$VENDOR_DIR" && pwd)"

# --- Start Kroki --------------------------------------------------------------
# unsafe mode is required so PlantUML may resolve our local (vendored) includes;
# our sources never reference remote URLs, so nothing is fetched from the network.
echo "Starting Kroki ($KROKI_IMAGE_TAG) on port $KROKI_PORT ..."
CONTAINER_ID="$(docker run -d --rm \
  -p "$KROKI_PORT:8000" \
  -e KROKI_SAFE_MODE=unsafe \
  -e KROKI_PLANTUML_INCLUDE_PATH=/data \
  -v "$ABS_VENDOR_DIR:/data:ro" \
  "$KROKI_IMAGE")"

cleanup() {
  docker stop "$CONTAINER_ID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# --- Wait for health ----------------------------------------------------------
BASE_URL="http://localhost:$KROKI_PORT"
printf 'Waiting for Kroki to become healthy'
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
  echo "error: Kroki did not become healthy within 60s." >&2
  exit 1
fi

# --- Render every *.puml ------------------------------------------------------
rendered=0
failed=0
for puml in "$DIAGRAM_DIR"/*.puml; do
  # Bash 3.2 has no nullglob; skip the literal pattern when nothing matches.
  [ -e "$puml" ] || continue
  svg="${puml%.puml}.svg"
  printf 'Rendering %s -> %s ... ' "$(basename "$puml")" "$(basename "$svg")"
  if curl -fsS --max-time 60 -X POST "$BASE_URL/plantuml/svg" \
    --data-binary "@$puml" -o "$svg"; then
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
