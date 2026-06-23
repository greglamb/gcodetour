// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { strict as assert } from "node:assert";
import {
  isAllowedDataUri,
  isForbiddenAttr,
  isForbiddenTag,
  isRemoteRef
} from "../../player/diagram/sanitizePolicy";

describe("diagram sanitize policy", () => {
  describe("isForbiddenTag", () => {
    it("forbids script and embedding tags (case-insensitive)", () => {
      for (const tag of [
        "script",
        "SCRIPT",
        "foreignObject",
        "foreignobject",
        "iframe",
        "object",
        "embed"
      ]) {
        assert.equal(isForbiddenTag(tag), true, tag);
      }
    });

    it("allows ordinary SVG tags including use/image", () => {
      for (const tag of [
        "svg",
        "g",
        "rect",
        "path",
        "a",
        "text",
        "use",
        "image"
      ]) {
        assert.equal(isForbiddenTag(tag), false, tag);
      }
    });
  });

  describe("isForbiddenAttr", () => {
    it("forbids any on* event handler", () => {
      for (const attr of ["onclick", "onload", "ONMOUSEOVER", "onfocusin"]) {
        assert.equal(isForbiddenAttr(attr), true, attr);
      }
    });

    it("allows ordinary attributes", () => {
      for (const attr of [
        "href",
        "xlink:href",
        "class",
        "style",
        "d",
        "fill"
      ]) {
        assert.equal(isForbiddenAttr(attr), false, attr);
      }
    });
  });

  describe("isAllowedDataUri", () => {
    it("allows image data URIs", () => {
      assert.equal(isAllowedDataUri("data:image/png;base64,AAAA"), true);
      assert.equal(isAllowedDataUri("data:image/svg+xml,<svg/>"), true);
      assert.equal(isAllowedDataUri("  data:image/jpeg;base64,AAAA"), true);
    });

    it("rejects non-image data URIs", () => {
      assert.equal(isAllowedDataUri("data:text/html,<h1>x"), false);
      assert.equal(isAllowedDataUri("data:application/json,{}"), false);
    });
  });

  describe("isRemoteRef", () => {
    it("flags network and dangerous references", () => {
      for (const value of [
        "http://evil.example/x.svg",
        "https://evil.example/x.svg",
        "HTTPS://EVIL.EXAMPLE",
        "//cdn.example/x.svg",
        "javascript:alert(1)",
        "data:text/html,<h1>x",
        "  https://evil.example  "
      ]) {
        assert.equal(isRemoteRef(value), true, value);
      }
    });

    it("allows safe references", () => {
      for (const value of [
        "#localId",
        "ct://el/queue",
        "relative/path.svg",
        "./diagram.svg",
        "data:image/png;base64,AAAA",
        ""
      ]) {
        assert.equal(isRemoteRef(value), false, value);
      }
    });
  });
});
