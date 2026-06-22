#!/usr/bin/env node
/**
 * Bump package.json to the next CalVer (`0.YYMM.DDBB`) version.
 *
 * Run before cutting a release:  npm run version:bump
 * Then commit the change and create a GitHub release whose tag matches the new
 * version; the Release workflow packages the .vsix and attaches it.
 *
 * Only the top-level "version" line is rewritten, so the diff stays one line.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nextCalVer } from "./calver.mjs";

const pkgPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "package.json"
);
const text = readFileSync(pkgPath, "utf8");
const current = JSON.parse(text).version;
const next = nextCalVer(current);

const updated = text.replace(/("version":\s*")[^"]+(")/, `$1${next}$2`);
if (updated === text) {
  console.error("error: could not locate the version field in package.json");
  process.exit(1);
}

writeFileSync(pkgPath, updated);
console.log(`version: ${current} -> ${next}`);
