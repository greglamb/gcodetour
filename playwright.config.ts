import type {
  VSCodeTestOptions,
  VSCodeWorkerOptions
} from "@greglamb/vscode-test-playwright";
import { defineConfig } from "@playwright/test";
import * as path from "path";

export default defineConfig<VSCodeTestOptions, VSCodeWorkerOptions>({
  testDir: path.join(__dirname, "tests", "ui"),
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  timeout: 120_000,
  use: {
    vscodeVersion: "stable",
    extensionDevelopmentPath: __dirname,
    baseDir: path.join(__dirname, "test-fixtures", "ui-workspace"),
    vscodeTrace: "retain-on-failure"
  }
});
