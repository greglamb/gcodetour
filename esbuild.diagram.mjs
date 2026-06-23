// Bundles the diagram webview client (src/player/diagram/client/main.ts) into a
// single browser IIFE at media/diagram/client.js, and copies its stylesheet. The
// client imports the same pure modules the extension host uses (sanitizePolicy/
// layout/sentinel), so the policy is single-sourced. Kept separate from the
// (webpack) extension bundle since this asset is loaded as a webview resource.
import { copyFileSync, mkdirSync } from "node:fs";
import * as esbuild from "esbuild";

const outDir = "media/diagram";
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: ["src/player/diagram/client/main.ts"],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2020",
  outfile: `${outDir}/client.js`,
  sourcemap: true,
  minify: false
});

copyFileSync("src/player/diagram/client/client.css", `${outDir}/client.css`);

console.log("Diagram client build complete");
