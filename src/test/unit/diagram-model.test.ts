// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { strict as assert } from "node:assert";
import { parseDiagramFromStep } from "../../player/diagram/model";

describe("parseDiagramFromStep", () => {
  let warnings: string[];
  const originalWarn = console.warn;

  beforeEach(() => {
    warnings = [];
    console.warn = (msg?: any) => warnings.push(String(msg));
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  it("parses a full diagram object", () => {
    const spec = parseDiagramFromStep({
      diagram: { path: "a.svg", element: "queue", callout: "polls here" }
    });
    assert.deepEqual(spec, {
      path: "a.svg",
      element: "queue",
      callout: "polls here"
    });
    assert.equal(warnings.length, 0);
  });

  it("parses a diagram with only a path", () => {
    const spec = parseDiagramFromStep({ diagram: { path: "a.svg" } });
    assert.deepEqual(spec, { path: "a.svg" });
    assert.equal(spec!.element, undefined);
    assert.equal(spec!.callout, undefined);
  });

  it("returns null (silently) when the step has no diagram", () => {
    assert.equal(parseDiagramFromStep({}), null);
    assert.equal(parseDiagramFromStep({ diagram: undefined }), null);
    assert.equal(parseDiagramFromStep({ diagram: null }), null);
    assert.equal(warnings.length, 0, "absent diagram should not warn");
  });

  it("returns null and warns when path is missing", () => {
    assert.equal(parseDiagramFromStep({ diagram: { element: "x" } }), null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /path/);
  });

  it("returns null when path is empty or not a string", () => {
    assert.equal(parseDiagramFromStep({ diagram: { path: "" } }), null);
    assert.equal(parseDiagramFromStep({ diagram: { path: 42 } }), null);
    assert.equal(parseDiagramFromStep({ diagram: { path: ["a.svg"] } }), null);
  });

  it("returns null when element is the wrong type", () => {
    assert.equal(
      parseDiagramFromStep({ diagram: { path: "a.svg", element: 7 } }),
      null
    );
    assert.match(warnings[0], /element/);
  });

  it("returns null when callout is the wrong type", () => {
    assert.equal(
      parseDiagramFromStep({ diagram: { path: "a.svg", callout: {} } }),
      null
    );
    assert.match(warnings[0], /callout/);
  });

  it("returns null when diagram is an array or primitive", () => {
    assert.equal(parseDiagramFromStep({ diagram: [] }), null);
    assert.equal(parseDiagramFromStep({ diagram: "a.svg" }), null);
    assert.equal(parseDiagramFromStep({ diagram: 1 }), null);
  });

  it("never throws on hostile input", () => {
    const hostile: unknown[] = [
      { diagram: { path: "a.svg", element: null } },
      {
        diagram: {
          get path() {
            throw new Error("boom");
          }
        } as any
      },
      { diagram: Object.create(null) }
    ];
    for (const step of hostile) {
      assert.doesNotThrow(() => parseDiagramFromStep(step as any));
    }
  });
});
