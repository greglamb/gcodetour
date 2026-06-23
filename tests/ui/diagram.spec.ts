// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { expect, test } from "@greglamb/vscode-test-playwright";

async function startDiagramTour(
  evaluateInVSCode: (fn: (vscode: any) => any) => Promise<any>
) {
  await expect
    .poll(
      () =>
        evaluateInVSCode(async vscode => {
          await vscode.commands.executeCommand(
            "codetour.startTourByTitle",
            "Diagram Tour"
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
}

// The diagram webview content lives in VS Code's nested webview iframes.
function diagramWebview(workbox: any) {
  return workbox
    .frameLocator("iframe.webview")
    .frameLocator("iframe#active-frame");
}

test("highlights the diagram element in sync with the tour", async ({
  workbox,
  evaluateInVSCode
}, testInfo) => {
  await startDiagramTour(evaluateInVSCode);

  const webview = diagramWebview(workbox);

  // Step 1 highlights enrichQ (the anchor containing "Enrich Queue").
  const highlight = webview.locator("a.ct-highlight");
  await expect(highlight).toHaveCount(1, { timeout: 30_000 });
  await expect(highlight).toContainText("Enrich Queue");

  const callout = webview.locator("#diagram-callout");
  await expect(callout).toBeVisible();
  await expect(callout).toHaveText("Polls OrderCreated");

  await testInfo.attach("diagram-step-1", {
    body: await workbox.screenshot(),
    contentType: "image/png"
  });

  // The sanitizer stripped the hostile content from the fixture SVG. Scope to
  // the SVG surface so we don't match the webview's own (legitimate, nonce'd)
  // bootstrap scripts.
  const surface = webview.locator("#diagram-surface");
  await expect(surface.locator("script")).toHaveCount(0);
  await expect(surface.locator("[onclick]")).toHaveCount(0);
  await expect(surface.locator('image[href*="evil.example"]')).toHaveCount(0);

  // Advance: step 2 has no diagram (panel kept), step 3 highlights orderApi.
  await evaluateInVSCode(async vscode =>
    vscode.commands.executeCommand("codetour.nextTourStep")
  );
  await evaluateInVSCode(async vscode =>
    vscode.commands.executeCommand("codetour.nextTourStep")
  );

  const moved = webview.locator("a.ct-highlight");
  await expect(moved).toContainText("Order API", { timeout: 30_000 });
  await expect(webview.locator("#diagram-callout")).toHaveText(
    "Accepts orders"
  );
});

test("sentinel links are inert (clicking does not navigate)", async ({
  workbox,
  evaluateInVSCode
}) => {
  await startDiagramTour(evaluateInVSCode);

  const webview = diagramWebview(workbox);
  const highlight = webview.locator("a.ct-highlight");
  await expect(highlight).toHaveCount(1, { timeout: 30_000 });

  await highlight.click();

  // The SVG and its highlight remain — the ct:// link did not navigate away.
  await expect(webview.locator("svg")).toBeVisible();
  await expect(webview.locator("a.ct-highlight")).toHaveCount(1);
});
