// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// The "link-sentinel" addressing convention. PlantUML emits no stable per-element
// IDs, but it wraps any element given a hyperlink in an `<a href>`. Authors tag
// each addressable element with `ct://el/<alias>`; we resolve a step's
// `diagram.element` by finding the `<a>` whose href is that sentinel. These links
// are inert — the webview neutralizes clicks on them.
//
// Pure (no vscode/DOM); unit-tested in plain Node.

export const SENTINEL_PREFIX = "ct://el/";

/** Returns the sentinel href for an element alias, e.g. `ct://el/enrichQ`. */
export function aliasHref(alias: string): string {
  return `${SENTINEL_PREFIX}${alias}`;
}

/** True if a href is one of our inert element sentinels. */
export function isSentinelHref(href: string | null | undefined): boolean {
  return typeof href === "string" && href.startsWith(SENTINEL_PREFIX);
}

/**
 * True if `href` is the sentinel for `alias`. Callers pass the value of either
 * the `href` or the (namespaced) `xlink:href` attribute, since PlantUML may emit
 * either depending on version.
 */
export function hrefMatchesAlias(
  href: string | null | undefined,
  alias: string
): boolean {
  return href === aliasHref(alias);
}

/**
 * A CSS attribute selector that matches an `<a>` carrying the sentinel for
 * `alias` on its `href` attribute. The alias is escaped for use inside a
 * single-quoted CSS string. Note: `querySelector` can't match the namespaced
 * `xlink:href` form portably, so the client also walks attributes with
 * {@link hrefMatchesAlias} as a fallback — this selector is the fast path.
 */
export function aliasSelector(alias: string): string {
  return `a[href='${escapeCssString(aliasHref(alias))}']`;
}

// Escape characters that would break out of a single-quoted CSS string.
// CSS identifiers/strings escape with a backslash.
function escapeCssString(value: string): string {
  return value.replace(/["'\\]/g, ch => `\\${ch}`);
}
