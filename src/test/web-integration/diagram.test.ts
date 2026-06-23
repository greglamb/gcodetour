// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// Web-host parity smoke test: proves the diagram path reads SVGs via
// `workspace.fs` (not node `fs`) and opens its webview panel in the browser
// extension host without leaking a node-only API.

import * as assert from "assert";
import * as vscode from "vscode";

const EXTENSION_ID = "greglamb.gcodetour";

function diagramTabs(): vscode.Tab[] {
  return vscode.window.tabGroups.all
    .flatMap(group => group.tabs)
    .filter(
      tab =>
        tab.input instanceof vscode.TabInputWebview &&
        tab.input.viewType.includes("codetour.diagram")
    );
}

async function waitFor(
  condition: () => Promise<boolean> | boolean,
  timeout = 20000,
  interval = 250
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error("Timed out waiting for condition");
}

describe("gCodeTour diagrams (web host)", () => {
  it("reads a workspace SVG via workspace.fs", async () => {
    const folder = vscode.workspace.workspaceFolders![0].uri;
    const uri = vscode.Uri.joinPath(folder, ".tours", "diagrams", "sample.svg");
    const bytes = await vscode.workspace.fs.readFile(uri);
    assert.ok(bytes.byteLength > 0, "SVG should be readable in the web host");
  });

  it("opens the diagram panel on a diagram step", async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext);
    await ext.activate();

    await waitFor(async () => {
      await vscode.commands.executeCommand(
        "codetour.startTourByTitle",
        "Diagram Tour"
      );
      return diagramTabs().length === 1;
    });

    assert.equal(diagramTabs().length, 1, "diagram panel should open in web");
  });
});
