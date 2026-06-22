// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { strict as assert } from "node:assert";
import { hasUpstreamConflict, UPSTREAM_EXTENSION_ID } from "../../conflict";

describe("hasUpstreamConflict", () => {
  it("targets the original vsls-contrib.codetour extension", () => {
    assert.equal(UPSTREAM_EXTENSION_ID, "vsls-contrib.codetour");
  });

  it("is true when the upstream extension is installed", () => {
    const getExtension = (id: string) =>
      id === UPSTREAM_EXTENSION_ID ? { id } : undefined;
    assert.equal(hasUpstreamConflict(getExtension), true);
  });

  it("is false when the upstream extension is absent", () => {
    assert.equal(
      hasUpstreamConflict(() => undefined),
      false
    );
  });

  it("ignores unrelated installed extensions", () => {
    const getExtension = (id: string) =>
      id === "some.other-extension" ? { id } : undefined;
    assert.equal(hasUpstreamConflict(getExtension), false);
  });
});
