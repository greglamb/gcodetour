// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { strict as assert } from "node:assert";
import { Box, clampCallout, Size } from "../../player/diagram/layout";

const VIEWPORT: Size = { width: 1000, height: 800 };
const CALLOUT: Size = { width: 100, height: 40 };
const GAP = 10;

function place(target: Box) {
  return clampCallout(target, VIEWPORT, CALLOUT, GAP);
}

function overlaps(p: { x: number; y: number }, target: Box): boolean {
  return (
    p.x < target.x + target.width &&
    p.x + CALLOUT.width > target.x &&
    p.y < target.y + target.height &&
    p.y + CALLOUT.height > target.y
  );
}

describe("clampCallout", () => {
  it("places the callout below a centered target", () => {
    const target: Box = { x: 450, y: 380, width: 100, height: 40 };
    const p = place(target);
    assert.deepEqual(p, { x: 450, y: 430 });
    assert.equal(overlaps(p, target), false);
  });

  it("flips above when there's no room below", () => {
    const target: Box = { x: 450, y: 770, width: 100, height: 40 };
    const p = place(target);
    assert.equal(p.y, 720); // above the target
    assert.equal(overlaps(p, target), false);
  });

  it("keeps the callout inside the viewport near the right edge", () => {
    const target: Box = { x: 950, y: 400, width: 100, height: 40 };
    const p = place(target);
    assert.ok(p.x + CALLOUT.width <= VIEWPORT.width);
    assert.equal(p.x, 900);
    assert.equal(overlaps(p, target), false);
  });

  it("places to the right when the target fills the viewport height", () => {
    const target: Box = { x: 400, y: 0, width: 100, height: 800 };
    const p = place(target);
    assert.equal(p.x, 510);
    assert.equal(overlaps(p, target), false);
  });

  it("places to the left when below/above/right are blocked", () => {
    const target: Box = { x: 200, y: 0, width: 780, height: 800 };
    const p = place(target);
    assert.equal(p.x, 90);
    assert.equal(overlaps(p, target), false);
  });

  it("falls back to a clamped position when the target fills the viewport", () => {
    const target: Box = { x: 0, y: 0, width: 1000, height: 800 };
    const p = place(target);
    assert.deepEqual(p, { x: 0, y: 760 });
  });

  it("pins to the origin when the callout is larger than the viewport", () => {
    const target: Box = { x: 100, y: 100, width: 50, height: 50 };
    const p = clampCallout(
      target,
      VIEWPORT,
      { width: 2000, height: 2000 },
      GAP
    );
    assert.deepEqual(p, { x: 0, y: 0 });
  });

  it("handles a zero-size target", () => {
    const target: Box = { x: 500, y: 400, width: 0, height: 0 };
    const p = place(target);
    assert.deepEqual(p, { x: 500, y: 410 });
    assert.equal(overlaps(p, target), false);
  });
});
