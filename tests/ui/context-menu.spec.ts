// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { expect, test } from "@greglamb/vscode-test-playwright";

test("shows a context menu on the tour tree item", async ({
  workbox,
  evaluateInVSCode
}, testInfo) => {
  await evaluateInVSCode(async vscode => {
    await vscode.commands.executeCommand("codetour.tours.focus");
  });

  const item = workbox
    .locator('[role="treeitem"]')
    .filter({ hasText: "Sample Tour" });
  await expect(item).toBeVisible({ timeout: 30_000 });

  // The harness seeds `window.menuStyle: custom`, so menus render in the DOM.
  await item.click({ button: "right" });
  const menu = workbox.locator(".context-view .monaco-menu");
  await expect(menu).toBeVisible({ timeout: 10_000 });
  await expect(menu).toContainText(/Tour/);
  await testInfo.attach("context-menu", {
    body: await workbox.screenshot(),
    contentType: "image/png"
  });
});
