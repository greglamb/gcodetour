// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// Orchestrates synchronized diagrams: subscribes to tour start/navigation/end,
// resolves the current step's optional `diagram`, and drives the single reusable
// webview panel. Owns all cross-step state (current tour/SVG path); panel.ts is a
// dumb view. Reads SVG bytes via `workspace.fs` so it works in both the desktop
// (node) and web (webworker) extension hosts.

import {
  commands,
  ExtensionContext,
  Uri,
  ViewColumn,
  window,
  workspace
} from "vscode";
import { CodeTour, store } from "../../store";
import { onDidEndTour, onDidStartTour } from "../../store/actions";
import { parseDiagramFromStep } from "./model";
import { DiagramPanel } from "./panel";

// A diagram larger than this is almost certainly a mistake; skip it rather than
// jank the webview by posting megabytes of markup.
const MAX_SVG_BYTES = 5 * 1024 * 1024;

// Test seam: lets the integration tier assert panel open/closed without a handle
// to the WebviewPanel (webviews aren't enumerable like editors).
const PANEL_OPEN_KEY = "codetour:diagramPanelOpen";

let panel: DiagramPanel | null = null;
let currentTourId: string | null = null;
let currentPath: string | null = null;
// Monotonic token so a slow SVG read from an earlier step can't clobber a later
// step's render when the user navigates quickly (latest-wins).
let renderToken = 0;

export function registerDiagramModule(context: ExtensionContext): void {
  const extensionUri = context.extensionUri;

  const startSub = onDidStartTour(([tour, step]) => {
    void handleStep(extensionUri, tour, step);
  });
  const endSub = onDidEndTour(() => handleEndTour());

  context.subscriptions.push(startSub, endSub, {
    dispose: () => disposePanel()
  });
}

async function handleStep(
  extensionUri: Uri,
  tour: CodeTour,
  stepIndex: number
): Promise<void> {
  const token = ++renderToken;
  const config = workspace.getConfiguration("codetour");

  if (!config.get<boolean>("diagram.enabled", true)) {
    disposePanel();
    return;
  }

  // A new tour implicitly ends the previous one (covers the Live Share end path
  // that doesn't fire onDidEndTour). Reuse the panel object but force a reload.
  if (currentTourId !== null && currentTourId !== tour.id) {
    currentPath = null;
    panel?.post({ type: "clear" });
  }
  currentTourId = tour.id;

  const step = tour.steps[stepIndex];
  if (!step) {
    return;
  }

  const spec = parseDiagramFromStep(step);

  if (!spec) {
    if (
      config.get<string>("diagram.onNonDiagramStep", "keep") === "hide" &&
      panel
    ) {
      currentPath = null;
      panel.post({ type: "clear" });
    }
    return;
  }

  const beside = config.get<boolean>("diagram.openBeside", true);

  let created = false;
  if (!panel) {
    const viewColumn = await resolveColumn(beside, token);
    // A newer navigation superseded us while waiting for the editor group.
    if (token !== renderToken) {
      return;
    }
    panel = DiagramPanel.create(extensionUri, viewColumn, onPanelDisposed);
    created = true;
    setPanelOpen(true);
  }

  // Same SVG already loaded → just move the highlight, never re-reveal (which
  // would steal the editor's surface).
  if (spec.path === currentPath && !created) {
    panel.post({
      type: "highlight",
      element: spec.element,
      callout: spec.callout
    });
    return;
  }

  const svg = await readSvg(spec.path);
  // Bail if a later navigation superseded this one, or the panel/tour changed
  // while we were reading.
  if (token !== renderToken || !panel) {
    return;
  }
  if (svg === null) {
    return;
  }

  currentPath = spec.path;
  panel.post({
    type: "render",
    svg,
    element: spec.element,
    callout: spec.callout
  });
  panel.reveal();
}

function handleEndTour(): void {
  disposePanel();
  currentTourId = null;
  currentPath = null;
}

// Resolves the column to open the panel in so it lands VISIBLE in its own group
// and is never moved afterwards (moving a webview between columns reloads its
// iframe and drops the rendered SVG; a webview that is never shown never loads
// its client at all).
//
// The trap: on an *empty* workbench `ViewColumn.Beside` (and even an explicit
// `ViewColumn.Two`) collapse to the only column — so the panel lands in the same
// group as the step's editor, hidden behind it. Every step opens an editor (a
// real file, or the virtual document a content step renders) in column One, so we
// wait for that editor to exist first; then `Beside` correctly resolves to a
// second, visible column.
async function resolveColumn(
  beside: boolean,
  token: number
): Promise<ViewColumn> {
  if (!beside) {
    return ViewColumn.Active;
  }
  if (!hasOpenTab()) {
    await waitForEditorGroup(token);
  }
  return ViewColumn.Beside;
}

function hasOpenTab(): boolean {
  return window.tabGroups.all.some(group => group.tabs.length > 0);
}

// Resolves once an editor group exists (so "Beside" has something to sit beside),
// or this step is superseded, or a defensive timeout elapses — never hangs.
function waitForEditorGroup(token: number): Promise<void> {
  return new Promise(resolve => {
    if (hasOpenTab()) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      sub.dispose();
      clearTimeout(timer);
      resolve();
    };
    const sub = window.tabGroups.onDidChangeTabs(() => {
      if (hasOpenTab() || token !== renderToken) {
        finish();
      }
    });
    const timer = setTimeout(finish, 3000);
  });
}

async function readSvg(path: string): Promise<string | null> {
  const workspaceRoot = store.activeTour?.workspaceRoot;
  if (!workspaceRoot) {
    console.warn(
      `[gCodeTour] cannot resolve diagram path without a workspace: ${path}`
    );
    return null;
  }

  const uri = Uri.joinPath(workspaceRoot, ...path.split("/"));
  try {
    const bytes = await workspace.fs.readFile(uri);
    if (bytes.byteLength > MAX_SVG_BYTES) {
      console.warn(`[gCodeTour] diagram is too large, skipping: ${path}`);
      return null;
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.warn(`[gCodeTour] could not read diagram ${path}: ${e}`);
    return null;
  }
}

function onPanelDisposed(): void {
  panel = null;
  currentPath = null;
  setPanelOpen(false);
}

function disposePanel(): void {
  // panel.dispose() triggers onPanelDisposed via the panel's onDidDispose.
  panel?.dispose();
}

function setPanelOpen(open: boolean): void {
  commands.executeCommand("setContext", PANEL_OPEN_KEY, open);
}
