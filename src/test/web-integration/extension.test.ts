// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import * as assert from "assert";
import * as vscode from "vscode";

// Smoke test: the web bundle (dist/extension-web.js) loads + activates in the
// browser extension host (vscode.dev / github.dev) and registers its commands.
const EXTENSION_ID = "greglamb.gcodetour";

describe("gCodeTour Web Extension", () => {
  it("is installed in the web host", () => {
    assert.ok(vscode.extensions.getExtension(EXTENSION_ID));
  });

  it("activates in the web host", async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext);
    await ext.activate();
    assert.ok(ext.isActive, "extension should be active");
  });

  it("registers the startTour command in the web host", async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext);
    await ext.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("codetour.startTour"),
      "codetour.startTour should be registered"
    );
  });
});
