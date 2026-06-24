// Embeds one or more webfonts into a rendered SVG as @font-face rules so the
// diagram displays in those fonts in any viewer (our webview included) without
// the reader having them installed. Diagrams reference a font by name (via
// `skinparam defaultFontName <name>`); this supplies the glyphs. We embed both
// the default (Jost) and Roboto, so a diagram authored in either displays right.
//
// Usage: node embed-svg-font.mjs <svg> <Family:regular.woff2:bold.woff2> [...more]
// e.g.   node embed-svg-font.mjs d.svg Jost:jost-400.woff2:jost-700.woff2 \
//                                       Roboto:roboto-400.woff2:roboto-700.woff2
// (invoked by render-diagrams.sh next to it; not run directly)
// Idempotent: re-running on an already-embedded SVG is a no-op.
import { readFileSync, writeFileSync } from "node:fs";

const [svgPath, ...fontArgs] = process.argv.slice(2);
if (!svgPath || fontArgs.length === 0) {
  console.error(
    "usage: embed-svg-font.mjs <svg> <Family:regular.woff2:bold.woff2> [...]"
  );
  process.exit(2);
}

const b64 = path => readFileSync(path).toString("base64");

const face = (family, weight, path) =>
  `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};` +
  `src:url(data:font/woff2;base64,${b64(path)}) format('woff2');}`;

const faces = fontArgs
  .map(arg => {
    const [family, regularPath, boldPath] = arg.split(":");
    if (!family || !regularPath || !boldPath) {
      console.error(
        `embed-svg-font: bad font arg "${arg}" (want Family:regular.woff2:bold.woff2)`
      );
      process.exit(2);
    }
    return face(family, 400, regularPath) + face(family, 700, boldPath);
  })
  .join("");

const style = `<style type="text/css">${faces}</style>`;

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
