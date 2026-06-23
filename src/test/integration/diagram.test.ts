// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import * as assert from "assert";
import * as vscode from "vscode";
import {
  activateExtension,
  CodeTourApi,
  getApi,
  startSampleTour,
  waitFor
} from "./helpers";

// The diagram webview surfaces as a tab whose input is a webview for our view
// type. (Webviews aren't enumerable like text editors, but tabs are.)
function diagramTabs(): vscode.Tab[] {
  return vscode.window.tabGroups.all
    .flatMap(group => group.tabs)
    .filter(
      tab =>
        tab.input instanceof vscode.TabInputWebview &&
        tab.input.viewType.includes("codetour.diagram")
    );
}

// Resolves with the step index of the next navigation event.
function nextStep(api: CodeTourApi): Promise<number> {
  return new Promise(resolve => {
    const sub = api.onDidStartTour(([, step]) => {
      sub.dispose();
      resolve(step);
    });
  });
}

async function advance(api: CodeTourApi): Promise<number> {
  const pending = nextStep(api);
  await vscode.commands.executeCommand("codetour.nextTourStep");
  return pending;
}

describe("Synchronized diagrams", () => {
  let api: CodeTourApi;

  beforeEach(async () => {
    api = await getApi();
  });

  afterEach(async () => {
    try {
      await api.endCurrentTour();
    } catch {
      // No active tour — nothing to end.
    }
    await waitFor(() => diagramTabs().length === 0).catch(() => undefined);
  });

  it("opens one diagram panel on a diagram step, keeping editor focus", async () => {
    await startSampleTour("Diagram Tour"); // step 0 has a diagram

    await waitFor(() => diagramTabs().length === 1);
    assert.equal(diagramTabs().length, 1, "exactly one diagram panel");

    assert.ok(
      vscode.window.activeTextEditor?.document.fileName.endsWith("sample.js"),
      "the editor should keep focus, not the webview"
    );
  });

  it("reuses the single panel across navigation", async () => {
    await startSampleTour("Diagram Tour");
    await waitFor(() => diagramTabs().length === 1);

    assert.equal(await advance(api), 1, "step 2 (no diagram)");
    assert.equal(await advance(api), 2, "step 3 (same diagram, new element)");

    // Still exactly one panel — never spawn a second.
    assert.equal(diagramTabs().length, 1);
  });

  it("still navigates past a malformed diagram step", async () => {
    await startSampleTour("Diagram Tour");
    await waitFor(() => diagramTabs().length === 1);

    await advance(api); // -> 1
    await advance(api); // -> 2
    assert.equal(
      await advance(api),
      3,
      "reaches the malformed step without error"
    );

    // A malformed diagram is treated as a no-diagram step; the panel is kept.
    assert.equal(diagramTabs().length, 1);
  });

  it("disposes the panel when the tour ends", async () => {
    await startSampleTour("Diagram Tour");
    await waitFor(() => diagramTabs().length === 1);

    await api.endCurrentTour();
    await waitFor(() => diagramTabs().length === 0);
    assert.equal(diagramTabs().length, 0, "panel disposed on tour end");
  });

  it("opens the diagram when the first step is a content step (no file anchor)", async () => {
    // Regression: starting a tour whose first step is a content step (renders no
    // editor) must still open the diagram panel — not only after navigating.
    // Reproduce the real scenario: a window with NO editors open, so there is no
    // group for the panel to anchor "beside".
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await waitFor(() =>
      vscode.window.tabGroups.all.every(g => g.tabs.length === 0)
    );
    await activateExtension();
    await waitFor(async () => {
      const started = nextStep(api);
      await vscode.commands.executeCommand(
        "codetour.startTourByTitle",
        "Content First Diagram Tour"
      );
      return Promise.race([
        started.then(() => true),
        new Promise<boolean>(r => setTimeout(() => r(false), 500))
      ]);
    });

    await waitFor(() => diagramTabs().length === 1);
    assert.equal(
      diagramTabs().length,
      1,
      "diagram panel should open on a content first step"
    );
  });
});
