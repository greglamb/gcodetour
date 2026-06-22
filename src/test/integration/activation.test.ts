// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import * as assert from "assert";
import * as vscode from "vscode";
import { activateExtension, EXTENSION_ID, getApi } from "./helpers";

describe("CodeTour activation", () => {
  before(async () => {
    await activateExtension();
  });

  it("is installed and discoverable by ID", () => {
    assert.ok(vscode.extensions.getExtension(EXTENSION_ID));
  });

  it("activates without error", async () => {
    const ext = await activateExtension();
    assert.ok(ext.isActive);
  });

  it("registers the public codetour.startTour command", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("codetour.startTour"),
      "codetour.startTour should be registered"
    );
  });

  it("exposes the expected API surface", async () => {
    const api = await getApi();
    for (const member of [
      "startTour",
      "startTourByUri",
      "endCurrentTour",
      "recordTour",
      "selectTour",
      "exportTour",
      "promptForTour"
    ] as const) {
      assert.equal(
        typeof api[member],
        "function",
        `api.${member} should be a function`
      );
    }
  });
});
