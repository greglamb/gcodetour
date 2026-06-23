// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// The policy governing which SVG tags/attributes/references the webview strips
// before injecting an SVG into the DOM. The actual DOM walk runs client-side
// (client/main.ts, using DOMParser); this module holds the pure predicates so
// they have a single source of truth and can be unit-tested in Node. The CSP is
// the primary control — this is defense-in-depth.

// Tags that can execute script or embed arbitrary external/HTML content.
const FORBIDDEN_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed"
]);
// Note: `<use>` and `<image>` are allowed as tags (PlantUML sprite/cloud-icon
// output relies on them); their references are sanitized by `isRemoteRef`.

/** True if an element with this tag name must be removed entirely. */
export function isForbiddenTag(tag: string): boolean {
  return FORBIDDEN_TAGS.has(tag.toLowerCase());
}

/**
 * True if this attribute must be stripped regardless of value. Covers all event
 * handlers (`onclick`, `onload`, …). Reference attributes (`href`/`xlink:href`)
 * are value-dependent and handled by {@link isRemoteRef} instead.
 */
export function isForbiddenAttr(name: string): boolean {
  return /^on/i.test(name);
}

/** True for a `data:` URI we permit (raster images embedded in cloud-icon SVGs). */
export function isAllowedDataUri(value: string): boolean {
  return /^data:image\//i.test(value.trim());
}

/**
 * True if a reference-attribute value points somewhere we won't allow:
 * remote/network URLs, protocol-relative URLs, `javascript:`, or non-image
 * `data:` URIs. Same-document refs (`#id`), relative paths, and our inert
 * `ct://` sentinels are allowed; `data:image/*` is allowed.
 */
export function isRemoteRef(value: string): boolean {
  const trimmed = value.trim();

  if (trimmed === "") {
    return false;
  }

  // Protocol-relative (//host/...) — treat as remote.
  if (trimmed.startsWith("//")) {
    return true;
  }

  if (/^https?:/i.test(trimmed)) {
    return true;
  }

  if (/^javascript:/i.test(trimmed)) {
    return true;
  }

  if (/^data:/i.test(trimmed)) {
    // Only image data URIs are allowed; everything else (e.g. data:text/html) is blocked.
    return !isAllowedDataUri(trimmed);
  }

  return false;
}
