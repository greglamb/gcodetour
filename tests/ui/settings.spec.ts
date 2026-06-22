// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { expect, test } from "@greglamb/vscode-test-playwright";

// Demonstrates user-settings injection: `showMarkers` defaults to true, so if the
// extension host sees `false`, the injected setting was applied before launch.
test.use({ userSettings: { "codetour.showMarkers": false } });

test("applies injected user settings", async ({ evaluateInVSCode }) => {
  const value = await evaluateInVSCode(async vscode =>
    vscode.workspace.getConfiguration("codetour").get("showMarkers")
  );
  expect(value).toBe(false);
});
