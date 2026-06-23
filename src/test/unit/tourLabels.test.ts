// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { strict as assert } from "node:assert";
import {
  getRelativePath,
  getStepLabel,
  getStepMarkerPrefix,
  getTourNumber,
  getTourTitle
} from "../../tourLabels";

// Minimal tour/step factory — only the fields these pure helpers read.
function tour(overrides: any = {}): any {
  return { title: "Tour", steps: [], ...overrides };
}

describe("getStepLabel", () => {
  it("prefers an explicit step title", () => {
    const t = tour({ steps: [{ title: "My Step", description: "ignored" }] });
    assert.equal(getStepLabel(t, 0), "#1 - My Step");
  });

  it("falls back to a leading markdown heading in the description", () => {
    const t = tour({ steps: [{ description: "### The bootstrap\n\nbody" }] });
    assert.equal(getStepLabel(t, 0), "#1 - The bootstrap");
  });

  it("falls back to markerTitle when there is no title or heading", () => {
    const t = tour({
      steps: [{ description: "plain", markerTitle: "Marked" }]
    });
    assert.equal(getStepLabel(t, 0), "#1 - Marked");
  });

  it("falls back to the (decoded) file path", () => {
    const t = tour({ steps: [{ description: "plain", file: "src/a%20b.ts" }] });
    assert.equal(getStepLabel(t, 0), "#1 - src/a b.ts");
  });

  it("falls back to the step uri", () => {
    const t = tour({
      steps: [{ description: "plain", uri: "https://example.com/a.ts" }]
    });
    assert.equal(getStepLabel(t, 0), "#1 - https://example.com/a.ts");
  });

  it("falls back to the (decoded) directory path", () => {
    const t = tour({
      steps: [{ description: "plain", directory: "src/sub%20dir" }]
    });
    assert.equal(getStepLabel(t, 0), "#1 - src/sub dir");
  });

  it("omits the step-number prefix when requested", () => {
    const t = tour({ steps: [{ title: "My Step", description: "x" }] });
    assert.equal(getStepLabel(t, 0, false), "My Step");
  });

  it("returns just the prefix when defaultToFileName is false and nothing else matches", () => {
    const t = tour({ steps: [{ description: "plain text" }] });
    assert.equal(getStepLabel(t, 0, true, false), "#1 - ");
  });
});

describe("getTourTitle", () => {
  it("strips a numeric prefix", () => {
    assert.equal(
      getTourTitle(tour({ title: "1 - Getting Started" })),
      "Getting Started"
    );
    assert.equal(getTourTitle(tour({ title: "#2 - Advanced" })), "Advanced");
  });

  it("keeps later hyphens in the title (only strips the prefix)", () => {
    assert.equal(
      getTourTitle(tour({ title: "1 - Jobs - Phase 2" })),
      "Jobs - Phase 2"
    );
  });

  it("returns the title unchanged when there is no numeric prefix", () => {
    assert.equal(getTourTitle(tour({ title: "Onboarding" })), "Onboarding");
  });
});

describe("getTourNumber", () => {
  it("extracts the leading number", () => {
    assert.equal(getTourNumber(tour({ title: "3 - Data layer" })), 3);
    assert.equal(getTourNumber(tour({ title: "#4 - Jobs" })), 4);
  });

  it("returns undefined when there is no number", () => {
    assert.equal(getTourNumber(tour({ title: "Intro" })), undefined);
  });
});

describe("getStepMarkerPrefix", () => {
  it("uses an explicit stepMarker", () => {
    assert.equal(getStepMarkerPrefix(tour({ stepMarker: "MARK" })), "MARK");
  });

  it("derives a CT<number> prefix from a numbered tour", () => {
    assert.equal(getStepMarkerPrefix(tour({ title: "2 - Foo" })), "CT2");
  });

  it("returns undefined for an unnumbered tour with no stepMarker", () => {
    assert.equal(getStepMarkerPrefix(tour({ title: "Foo" })), undefined);
  });
});

describe("getRelativePath", () => {
  it("computes a path relative to the root", () => {
    assert.equal(getRelativePath("/a/b", "/a/b/c/d.ts"), "c/d.ts");
  });
});
