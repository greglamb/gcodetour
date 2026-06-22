import { defineConfig } from "@vscode/test-cli";
import { tmpdir } from "os";

export default defineConfig([
  {
    label: "integration",
    files: "out/test/integration/**/*.test.js",
    version: "stable",
    extensionDevelopmentPath: ".",
    workspaceFolder: "./test-fixtures/workspace",
    launchArgs: [`--user-data-dir=${tmpdir()}/codetour-integration-test`],
    mocha: {
      ui: "bdd",
      timeout: 20000
    }
  }
]);
