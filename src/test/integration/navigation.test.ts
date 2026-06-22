// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import * as assert from "assert";
import * as vscode from "vscode";
import { CodeTourApi, getApi, startSampleTour } from "./helpers";

// Resolves with the step number of the next start/navigation event.
function nextStep(api: CodeTourApi): Promise<number> {
  return new Promise(resolve => {
    const sub = api.onDidStartTour(([, step]) => {
      sub.dispose();
      resolve(step);
    });
  });
}

describe("Tour step navigation", () => {
  it("advances to the next step and rewinds to the previous one", async () => {
    const api = await getApi();
    await startSampleTour(); // starts on step 0 of the 2-step Sample Tour

    const forward = nextStep(api);
    await vscode.commands.executeCommand("codetour.nextTourStep");
    assert.equal(await forward, 1, "nextTourStep should advance to step #2");

    const back = nextStep(api);
    await vscode.commands.executeCommand("codetour.previousTourStep");
    assert.equal(await back, 0, "previousTourStep should return to step #1");
  });
});
