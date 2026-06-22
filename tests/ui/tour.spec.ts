// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { expect, test } from "@greglamb/vscode-test-playwright";

test("starts a tour and renders the step description in a comment thread", async ({
  workbox,
  evaluateInVSCode
}, testInfo) => {
  // Wait for the workspace tour to be discovered, then start it from inside
  // the extension host. `startTourByTitle` is a no-op until the tour exists,
  // so poll until an editor opens for the step's file.
  await expect
    .poll(
      async () =>
        evaluateInVSCode(async vscode => {
          await vscode.commands.executeCommand(
            "codetour.startTourByTitle",
            "Sample Tour"
          );
          return (
            vscode.window.activeTextEditor?.document.fileName.endsWith(
              "sample.js"
            ) ?? false
          );
        }),
      { timeout: 30_000 }
    )
    .toBe(true);

  // The step description is rendered in a CodeTour comment thread, which VS
  // Code shows as a review/comment widget docked in the editor.
  await expect(
    workbox.locator(".comment-body").filter({
      hasText: "This is the first step."
    })
  ).toBeVisible({ timeout: 30_000 });

  // The thread header shows the tour title, not VS Code's default
  // "Start discussion" label (regression guard for the thread.label fix).
  const header = workbox.locator(".review-widget .review-title");
  await expect(header).toContainText("Sample Tour");
  await expect(header).not.toContainText("Start discussion");

  // Capture a screenshot for visual inspection. It's attached to the test
  // report (view with `npx playwright show-report`) and also retained on disk
  // under `test-results/`.
  const screenshot = await workbox.screenshot({
    path: testInfo.outputPath("tour-step.png")
  });
  await testInfo.attach("tour-step", {
    body: screenshot,
    contentType: "image/png"
  });
});
