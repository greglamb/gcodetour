// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import * as assert from "assert";
import * as vscode from "vscode";
import { startSampleTour } from "./helpers";

describe("Tour discovery and playback", () => {
  it("discovers the workspace tour and navigates to its first step", async () => {
    await startSampleTour();

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, "an editor should be open after starting the tour");
    assert.ok(
      editor!.document.fileName.endsWith("sample.js"),
      "the first step's file should be opened"
    );
  });
});
