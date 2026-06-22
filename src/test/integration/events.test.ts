// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import * as assert from "assert";
import * as vscode from "vscode";
import { getApi, startSampleTour } from "./helpers";

describe("Tour lifecycle events", () => {
  it("fires onDidStartTour when a tour starts", async () => {
    const api = await getApi();

    const started = new Promise<[any, number]>(resolve => {
      const sub = api.onDidStartTour(args => {
        sub.dispose();
        resolve(args);
      });
    });

    await startSampleTour();

    const [tour, step] = await started;
    assert.equal(tour.title, "Sample Tour");
    assert.equal(step, 0);
  });

  it("fires onDidEndTour when the tour ends", async () => {
    const api = await getApi();
    await startSampleTour();

    const ended = new Promise<any>(resolve => {
      const sub = api.onDidEndTour(tour => {
        sub.dispose();
        resolve(tour);
      });
    });

    await vscode.commands.executeCommand("codetour.endTour");

    const tour = await ended;
    assert.equal(tour.title, "Sample Tour");
  });
});
