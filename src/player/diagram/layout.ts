// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// Callout positioning math. Given the highlighted element's bounding box (in
// viewport coordinates), the viewport, and the callout's size, compute a
// top-left position for the callout that stays inside the viewport and, where
// possible, doesn't overlap the element. Pure (no DOM); unit-tested in Node.

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  // When the callout is larger than the viewport, max < min; pin to min (0).
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Positions a callout of `callout` size near `target`, kept within `viewport`
 * and clear of the target by `gap` where possible. Tries below → above → right →
 * left, returning the first candidate that (after clamping into the viewport)
 * doesn't overlap the target. If every side overlaps (e.g. the target fills the
 * viewport), returns the clamped below position as a best effort.
 */
export function clampCallout(
  target: Box,
  viewport: Size,
  callout: Size,
  gap: number
): Point {
  const maxX = viewport.width - callout.width;
  const maxY = viewport.height - callout.height;

  const candidates: Point[] = [
    { x: target.x, y: target.y + target.height + gap }, // below
    { x: target.x, y: target.y - callout.height - gap }, // above
    { x: target.x + target.width + gap, y: target.y }, // right
    { x: target.x - callout.width - gap, y: target.y } // left
  ];

  let fallback: Point | null = null;

  for (const candidate of candidates) {
    const placed: Point = {
      x: clamp(candidate.x, 0, maxX),
      y: clamp(candidate.y, 0, maxY)
    };

    if (fallback === null) {
      fallback = placed;
    }

    const placedBox: Box = {
      x: placed.x,
      y: placed.y,
      width: callout.width,
      height: callout.height
    };

    if (!overlaps(placedBox, target)) {
      return placed;
    }
  }

  return fallback!;
}
