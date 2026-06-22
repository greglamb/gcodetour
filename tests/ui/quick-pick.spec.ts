// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { expect, test } from "@greglamb/vscode-test-playwright";

test("offers the tour in the Start Tour quick pick", async ({
  workbox,
  evaluateInVSCode
}, testInfo) => {
  // `codetour.startTour` (no args) opens a blocking quick pick — fire and forget.
  await evaluateInVSCode(async vscode => {
    void vscode.commands.executeCommand("codetour.startTour");
  });

  const quickPick = workbox.locator(".quick-input-widget");
  await expect(quickPick).toBeVisible({ timeout: 30_000 });
  await expect(
    quickPick.locator(".monaco-list-row", { hasText: "Sample Tour" })
  ).toBeVisible({ timeout: 10_000 });
  await testInfo.attach("quick-pick", {
    body: await workbox.screenshot(),
    contentType: "image/png"
  });

  // Selecting it starts the tour.
  await quickPick
    .locator(".monaco-list-row", { hasText: "Sample Tour" })
    .click();
  await expect(workbox.locator(".comment-body")).toContainText(
    "This is the first step.",
    { timeout: 30_000 }
  );
});
