// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { expect, test } from "@greglamb/vscode-test-playwright";

test("navigates between steps via the comment-thread links", async ({
  workbox,
  evaluateInVSCode
}, testInfo) => {
  await expect
    .poll(
      () =>
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

  const body = workbox.locator(".comment-body");
  await expect(body).toContainText("This is the first step.", {
    timeout: 30_000
  });

  // Advance via the rendered "Next" command link.
  await body.getByRole("link", { name: /^Next/ }).click();
  await expect(workbox.locator(".comment-body")).toContainText(
    "This is the second step.",
    { timeout: 30_000 }
  );
  await testInfo.attach("step-2", {
    body: await workbox.screenshot(),
    contentType: "image/png"
  });

  // Go back via the rendered "Previous" command link.
  await workbox
    .locator(".comment-body")
    .getByRole("link", { name: /^Previous/ })
    .click();
  await expect(workbox.locator(".comment-body")).toContainText(
    "This is the first step.",
    { timeout: 30_000 }
  );
});
