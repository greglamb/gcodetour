// Embeds the Roboto webfont into a rendered SVG as an @font-face so the diagram
// displays in Roboto in any viewer (our webview included) without depending on
// the reader having Roboto installed. The diagrams reference `font-family:Roboto`
// (via `skinparam defaultFontName Roboto`); this supplies the glyphs.
//
// Usage: node embed-svg-font.mjs <svg> <regular.woff2> <bold.woff2>
// (invoked by render-diagrams.sh next to it; not run directly)
// Idempotent: re-running on an already-embedded SVG is a no-op.
import { readFileSync, writeFileSync } from "node:fs";

const [svgPath, regularPath, boldPath] = process.argv.slice(2);
if (!svgPath || !regularPath || !boldPath) {
  console.error("usage: embed-svg-font.mjs <svg> <regular.woff2> <bold.woff2>");
  process.exit(2);
}

const b64 = path => readFileSync(path).toString("base64");

const face = (weight, path) =>
  `@font-face{font-family:'Roboto';font-style:normal;font-weight:${weight};` +
  `src:url(data:font/woff2;base64,${b64(path)}) format('woff2');}`;

const style =
  `<style type="text/css">` +
  face(400, regularPath) +
  face(700, boldPath) +
  `</style>`;

let svg = readFileSync(svgPath, "utf8");
if (svg.includes("data:font/woff2")) {
  process.exit(0); // already embedded
}

// Insert the <style> immediately after the opening <svg ...> tag.
const replaced = svg.replace(/(<svg\b[^>]*>)/, match => match + style);
if (replaced === svg) {
  console.error(`embed-svg-font: no <svg> tag found in ${svgPath}`);
  process.exit(1);
}

writeFileSync(svgPath, replaced);
