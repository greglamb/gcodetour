// Bundles the web (browser) integration test for @vscode/test-web: esbuild +
// node-modules polyfills so Mocha runs in the browser worker. Kept separate from
// the (webpack) extension build so test code is never shipped in the extension.
import { builtinModules } from "node:module";
import * as esbuild from "esbuild";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";

const webPolyfill = nodeModulesPolyfillPlugin({
  globals: { Buffer: true, process: true },
  modules: Object.fromEntries(
    builtinModules.map(m => [m, m === "worker_threads" ? "empty" : true])
  )
});

await esbuild.build({
  entryPoints: ["src/test/web-integration/index.ts"],
  bundle: true,
  platform: "neutral",
  format: "cjs",
  mainFields: ["browser", "module", "main"],
  conditions: ["browser", "import"],
  external: ["vscode"],
  outfile: "dist/test/web-integration/index.js",
  sourcemap: true,
  minify: false,
  plugins: [webPolyfill]
});

console.log("Web test build complete");
