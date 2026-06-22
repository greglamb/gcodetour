// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { expect, test } from "@greglamb/vscode-test-playwright";

test("lists the tour in the gCodeTour tree view", async ({
  workbox,
  evaluateInVSCode
}, testInfo) => {
  // Reveal the gCodeTour view (VS Code auto-generates `<viewId>.focus`).
  await evaluateInVSCode(async vscode => {
    await vscode.commands.executeCommand("codetour.tours.focus");
  });

  // The tree item's visible label is the tour title (its accessible name is the
  // tour description, so match on text rather than role-name).
  const item = workbox
    .locator('[role="treeitem"]')
    .filter({ hasText: "Sample Tour" });
  await expect(item).toBeVisible({ timeout: 30_000 });

  await testInfo.attach("tree", {
    body: await workbox.screenshot(),
    contentType: "image/png"
  });
});
