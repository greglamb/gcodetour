// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { strict as assert } from "node:assert";
import {
  aliasHref,
  aliasSelector,
  hrefMatchesAlias,
  isSentinelHref,
  SENTINEL_PREFIX
} from "../../player/diagram/sentinel";

describe("diagram sentinel", () => {
  it("uses the ct://el/ scheme", () => {
    assert.equal(SENTINEL_PREFIX, "ct://el/");
    assert.equal(aliasHref("enrichQ"), "ct://el/enrichQ");
  });

  it("recognizes sentinel hrefs", () => {
    assert.equal(isSentinelHref("ct://el/orderApi"), true);
    assert.equal(isSentinelHref("https://example.com"), false);
    assert.equal(isSentinelHref(null), false);
    assert.equal(isSentinelHref(undefined), false);
    assert.equal(isSentinelHref(""), false);
  });

  it("matches an href against an alias", () => {
    assert.equal(hrefMatchesAlias("ct://el/queue", "queue"), true);
    assert.equal(hrefMatchesAlias("ct://el/queue", "other"), false);
    assert.equal(hrefMatchesAlias(null, "queue"), false);
    assert.equal(hrefMatchesAlias(undefined, "queue"), false);
    // Case sensitive — aliases are exact.
    assert.equal(hrefMatchesAlias("ct://el/Queue", "queue"), false);
  });

  it("builds a CSS selector for an alias", () => {
    assert.equal(aliasSelector("queue"), "a[href='ct://el/queue']");
  });

  it("escapes quotes and backslashes in the selector", () => {
    const selector = aliasSelector("a'b\"c\\d");
    assert.equal(selector, "a[href='ct://el/a\\'b\\\"c\\\\d']");
    // The escaped alias content round-trips the dangerous characters.
    assert.ok(selector.includes("\\'"));
    assert.ok(selector.includes('\\"'));
    assert.ok(selector.includes("\\\\"));
  });
});
