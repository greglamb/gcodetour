// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// Doc-asset generator (NOT a normal test): captures the README screenshot of a
// synchronized diagram step. Skipped unless SCREENSHOTS=1 so a regular `test:ui`
// run never writes to images/. Regenerate with: npm run screenshot
import { expect, test } from "@greglamb/vscode-test-playwright";

// Declutter the capture: no "git repo found" prompt, no welcome tab, a clean
// dark theme for a consistent look.
test.use({
  userSettings: {
    "git.openRepositoryInParentFolders": "never",
    "workbench.startupEditor": "none",
    "workbench.colorTheme": "Default Dark Modern"
  }
});

const gen = process.env.SCREENSHOTS ? test : test.skip;

gen(
  "captures the diagram-panel screenshot for the README",
  async ({ workbox, evaluateInVSCode }) => {
    await expect
      .poll(
        () =>
          evaluateInVSCode(async vscode => {
            await vscode.commands.executeCommand(
              "codetour.startTourByTitle",
              "Diagram Showcase"
            );
            return (
              vscode.window.activeTextEditor?.document.fileName.endsWith(
                "player.js"
              ) ?? false
            );
          }),
        { timeout: 30_000 }
      )
      .toBe(true);

    const webview = workbox
      .frameLocator("iframe.webview")
      .frameLocator("iframe#active-frame");

    // Wait until the diagram has rendered, highlighted, and shown its callout.
    await expect(webview.locator("a.ct-highlight")).toHaveCount(1, {
      timeout: 30_000
    });
    await expect(webview.locator("#diagram-callout")).toBeVisible();

    // Close chrome that distracts from the feature (Copilot chat / bottom panel).
    await evaluateInVSCode(async vscode => {
      await vscode.commands.executeCommand(
        "workbench.action.closeAuxiliaryBar"
      );
      await vscode.commands.executeCommand("workbench.action.closePanel");
    });

    // Let layout settle, then capture the whole VS Code window (editor + diagram).
    await workbox.waitForTimeout(750);
    await workbox.screenshot({ path: "images/diagram-panel.png" });
  }
);
