// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import * as assert from "assert";
import * as vscode from "vscode";

export const EXTENSION_ID = "greglamb.gcodetour";

/**
 * The public API surface returned from the extension's `activate` function
 * (see `src/api.ts`).
 */
export interface CodeTourApi {
  endCurrentTour: (...args: any[]) => any;
  exportTour: (...args: any[]) => any;
  onDidStartTour: (listener: (args: [any, number]) => any) => {
    dispose(): void;
  };
  onDidEndTour: (listener: (tour: any) => any) => { dispose(): void };
  promptForTour: (...args: any[]) => any;
  recordTour: (...args: any[]) => any;
  startTour: (...args: any[]) => any;
  startTourByUri: (...args: any[]) => any;
  selectTour: (...args: any[]) => any;
}

export async function activateExtension(): Promise<
  vscode.Extension<CodeTourApi>
> {
  const ext = vscode.extensions.getExtension<CodeTourApi>(EXTENSION_ID);
  assert.ok(ext, `Extension ${EXTENSION_ID} should be installed`);
  if (!ext.isActive) {
    await ext.activate();
  }
  return ext;
}

export async function getApi(): Promise<CodeTourApi> {
  const ext = await activateExtension();
  return ext.exports;
}

export async function waitFor(
  condition: () => Promise<boolean> | boolean,
  timeout = 10000,
  interval = 200
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

// Starts the workspace's "Sample Tour", retrying until the tour has been
// discovered (the file-system scan is async) and its first step's file opens.
export async function startSampleTour(title = "Sample Tour"): Promise<void> {
  await activateExtension();
  await waitFor(async () => {
    await vscode.commands.executeCommand("codetour.startTourByTitle", title);
    return (
      vscode.window.activeTextEditor?.document.fileName.endsWith("sample.js") ??
      false
    );
  });
}
