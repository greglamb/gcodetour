// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// The webview client. Runs in the browser context of the diagram panel. Bundled
// by esbuild.diagram.mjs to media/diagram/client.js. It imports the same pure
// modules the host unit-tests (sanitizePolicy/layout/sentinel) so the policy is
// single-sourced; only the DOM glue here is untested-by-unit (covered by the UI
// tier).

import { Box, clampCallout } from "../layout";
import type { HostToClient } from "../messages";
import {
  isForbiddenAttr,
  isForbiddenTag,
  isRemoteRef
} from "../sanitizePolicy";
import { aliasSelector, hrefMatchesAlias, isSentinelHref } from "../sentinel";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const CALLOUT_GAP = 8;
const REF_ATTRS = ["href", "src"];

const vscode = acquireVsCodeApi();

const root = document.getElementById("diagram-root")!;
const surface = document.getElementById("diagram-surface")!;
const calloutEl = document.getElementById("diagram-callout")!;

let highlightedAlias: string | undefined;
let calloutText: string | undefined;

window.addEventListener("message", event => {
  const message = event.data as HostToClient;
  switch (message.type) {
    case "render":
      render(message.svg);
      applyHighlight(message.element, message.callout);
      break;
    case "highlight":
      applyHighlight(message.element, message.callout);
      break;
    case "clear":
      clearAll();
      break;
  }
});

window.addEventListener("resize", positionCallout);
root.addEventListener("scroll", positionCallout);
new ResizeObserver(positionCallout).observe(root);

// Diagram links never navigate; sentinel clicks are reported for completeness.
surface.addEventListener("click", event => {
  const anchor = (event.target as Element | null)?.closest("a");
  if (!anchor) {
    return;
  }
  event.preventDefault();
  const href = anchor.getAttribute("href") ?? anchor.getAttribute("xlink:href");
  if (isSentinelHref(href)) {
    vscode.postMessage({ type: "sentinelClick", href });
  }
});

vscode.postMessage({ type: "ready" });

function render(svgText: string): void {
  clearHighlightState();
  root.scrollTo(0, 0);
  const svg = sanitize(svgText);
  surface.replaceChildren();
  if (svg) {
    // PlantUML emits preserveAspectRatio="none", which lets the webview stretch
    // the SVG to its box and distort it. Force uniform scaling.
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    surface.appendChild(svg);
  }
}

function sanitize(svgText: string): Element | null {
  const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (parsed.getElementsByTagName("parsererror").length > 0) {
    console.warn("[gCodeTour] diagram SVG failed to parse");
    return null;
  }
  const source = parsed.documentElement;
  if (!source || isForbiddenTag(source.tagName)) {
    return null;
  }
  scrub(source);
  return document.importNode(source, true);
}

function scrub(element: Element): void {
  scrubAttributes(element);
  for (const child of Array.from(element.children)) {
    if (isForbiddenTag(child.tagName)) {
      child.remove();
      continue;
    }
    scrub(child);
  }
}

function scrubAttributes(element: Element): void {
  for (const attr of Array.from(element.attributes)) {
    const name = attr.name;
    if (isForbiddenAttr(name)) {
      element.removeAttribute(name);
      continue;
    }
    const local = name.includes(":") ? name.slice(name.indexOf(":") + 1) : name;
    if (REF_ATTRS.includes(local) && isRemoteRef(attr.value)) {
      element.removeAttribute(name);
    }
  }
}

function applyHighlight(
  element: string | undefined,
  callout: string | undefined
): void {
  clearHighlightState();
  highlightedAlias = element;
  calloutText = callout;

  if (element) {
    const target = findTarget(element);
    if (target) {
      addClass(target, "ct-highlight");
      // The diagram renders at natural size and scrolls, so bring the focused
      // element into view (only scrolls when it isn't already visible).
      target.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth"
      });
    } else {
      console.warn(`[gCodeTour] diagram element not found: ${element}`);
    }
  }

  positionCallout();
}

// An addressable node is the sentinel `<a>` plus its box shape. C4 wraps the box
// inside the `<a>`; activity/swim-lane diagrams emit the box `<rect>` as the
// sibling immediately before the `<a>` (the `<a>` then holds only the label). We
// mark BOTH so the gold highlight border lands on the node's box, not just the
// label. Inactive nodes are left untouched — emphasis comes from the highlight
// alone, never from dimming (which washed out solid-fill boxes).
const NODE_SHAPES = /^(rect|ellipse|polygon|circle|path)$/i;

function nodeParts(anchor: Element): Element[] {
  const parts: Element[] = [anchor];
  const wrapsOwnShape = anchor.querySelector(
    "rect, ellipse, polygon, circle, path"
  );
  if (!wrapsOwnShape) {
    const prev = anchor.previousElementSibling;
    if (prev && NODE_SHAPES.test(prev.tagName)) {
      parts.push(prev);
    }
  }
  return parts;
}

function addClass(anchor: Element, className: string): void {
  for (const part of nodeParts(anchor)) {
    part.classList.add(className);
  }
}

function findTarget(alias: string): Element | null {
  // Fast path: a CSS selector against the plain `href` attribute.
  const bySelector = surface.querySelector(aliasSelector(alias));
  if (bySelector) {
    return bySelector;
  }
  // Fallback: walk anchors and check the namespaced xlink:href too.
  for (const anchor of Array.from(surface.querySelectorAll("a"))) {
    const href =
      anchor.getAttribute("href") ?? anchor.getAttribute("xlink:href");
    if (hrefMatchesAlias(href, alias)) {
      return anchor;
    }
  }
  return null;
}

function positionCallout(): void {
  const target =
    highlightedAlias !== undefined ? findTarget(highlightedAlias) : null;

  if (!calloutText || !target) {
    calloutEl.hidden = true;
    return;
  }

  // Make it measurable before computing a position.
  calloutEl.textContent = calloutText;
  calloutEl.hidden = false;

  const rootRect = root.getBoundingClientRect();
  const targetRect = (target as Element).getBoundingClientRect();
  const box: Box = {
    x: targetRect.left - rootRect.left,
    y: targetRect.top - rootRect.top,
    width: targetRect.width,
    height: targetRect.height
  };
  const viewport = { width: rootRect.width, height: rootRect.height };
  const calloutSize = {
    width: calloutEl.offsetWidth,
    height: calloutEl.offsetHeight
  };

  const pos = clampCallout(box, viewport, calloutSize, CALLOUT_GAP);
  // The callout is absolutely positioned inside the scrolling #diagram-root, so
  // offset by the scroll to keep it pinned to the (visible) target.
  calloutEl.style.left = `${pos.x + root.scrollLeft}px`;
  calloutEl.style.top = `${pos.y + root.scrollTop}px`;
}

function clearHighlightState(): void {
  for (const el of Array.from(surface.querySelectorAll(".ct-highlight"))) {
    el.classList.remove("ct-highlight");
  }
  highlightedAlias = undefined;
  calloutText = undefined;
  calloutEl.hidden = true;
}

function clearAll(): void {
  clearHighlightState();
  surface.replaceChildren();
}
