// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// gCodeTour deliberately keeps upstream CodeTour's command / view / comment-
// controller / filesystem-scheme IDs (so existing `.tour` files and their
// `command:codetour.*` links keep working). The cost is that the two extensions
// cannot run together: VS Code throws on duplicate command registration, so
// whichever activates second fails. `activate` uses this to detect the original
// extension and bail out with a warning instead.
//
// Kept vscode-free (getExtension is injected) so it can be unit tested.

export const UPSTREAM_EXTENSION_ID = "vsls-contrib.codetour";

export function hasUpstreamConflict(
  getExtension: (id: string) => unknown
): boolean {
  return getExtension(UPSTREAM_EXTENSION_ID) != null;
}
