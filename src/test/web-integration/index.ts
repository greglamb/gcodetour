// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// Web integration test runner — entry point for @vscode/test-web. Exports run(),
// which sets up Mocha in the browser worker and executes the web test files.

import Mocha from "mocha";

// --- Browser-compat patches for Mocha 11 in a web worker ---
// 1. Runner.immediately (setImmediate / process.nextTick) doesn't fire reliably.
// 2. Runner._addEventListener calls process.listenerCount, missing on the polyfill.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Mocha as any).Runner.immediately = (fn: () => void) => {
  setTimeout(fn, 0);
};
if (typeof process.listenerCount !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process as any).listenerCount = () => 0;
}

export async function run(): Promise<void> {
  // The default reporters use process.stdout.write(), which doesn't flush in the
  // polyfilled worker — log pass/fail via console instead.
  class ConsoleReporter extends Mocha.reporters.Base {
    constructor(runner: Mocha.Runner) {
      super(runner);
      runner.on("pass", (test: Mocha.Test) => {
        console.log(`  PASS: ${test.fullTitle()}`);
      });
      runner.on("fail", (test: Mocha.Test, err: Error) => {
        console.log(`  FAIL: ${test.fullTitle()} — ${err.message}`);
      });
      runner.on("end", () => {
        console.log(
          `  Done: ${String(runner.stats?.passes ?? 0)} passing, ${String(
            runner.stats?.failures ?? 0
          )} failing`
        );
      });
    }
  }

  const mocha = new Mocha({ ui: "bdd", timeout: 30000 });
  mocha.reporter(ConsoleReporter);

  return new Promise<void>((resolve, reject) => {
    // Expose BDD globals (describe/it/before) when bypassing Mocha's file loader.
    mocha.suite.emit("pre-require", globalThis, "", mocha);

    // esbuild resolves this at bundle time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./extension.test");

    const timeout = setTimeout(() => {
      reject(new Error("Mocha run timed out after 120s"));
    }, 120000);

    mocha.run(failures => {
      clearTimeout(timeout);
      if (failures > 0) {
        reject(new Error(`${String(failures)} web integration test(s) failed`));
      } else {
        resolve();
      }
    });
  });
}
