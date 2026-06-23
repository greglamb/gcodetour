// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// Owns the single reusable webview panel that displays diagrams. This module is
// the only diagram code that touches the `vscode` webview API, so it is exercised
// by the integration/UI tiers rather than unit tests. All orchestration state
// (which tour, which SVG path is loaded) lives in index.ts; this class is a dumb
// view: create, post messages, reveal, dispose, plus the ready handshake.

import { Disposable, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import type { ClientToHost, HostToClient } from "./messages";

const VIEW_TYPE = "codetour.diagram";
const TITLE = "gCodeTour Diagram";

export class DiagramPanel {
  private readonly panel: WebviewPanel;
  private readonly disposables: Disposable[] = [];
  private clientReady = false;
  // Only the latest desired state matters — collapse rapid navigation.
  private pending: HostToClient | null = null;

  private constructor(
    private readonly extensionUri: Uri,
    beside: boolean,
    private readonly onDispose: () => void
  ) {
    const mediaRoot = Uri.joinPath(this.extensionUri, "media", "diagram");
    this.panel = window.createWebviewPanel(
      VIEW_TYPE,
      TITLE,
      {
        viewColumn: beside ? ViewColumn.Beside : ViewColumn.Active,
        preserveFocus: true
      },
      {
        enableScripts: true,
        // The panel persists across steps and is usually not the active group
        // (editor keeps focus), so retain its DOM/highlight when hidden.
        retainContextWhenHidden: true,
        localResourceRoots: [mediaRoot]
      }
    );

    this.panel.webview.html = this.buildHtml();

    this.panel.webview.onDidReceiveMessage(
      (message: ClientToHost) => this.handleMessage(message),
      null,
      this.disposables
    );

    this.panel.onDidDispose(() => this.handleDispose(), null, this.disposables);
  }

  static create(
    extensionUri: Uri,
    beside: boolean,
    onDispose: () => void
  ): DiagramPanel {
    return new DiagramPanel(extensionUri, beside, onDispose);
  }

  /** Posts a message, buffering it (latest-wins) until the client signals ready. */
  post(message: HostToClient): void {
    if (!this.clientReady) {
      this.pending = message;
      return;
    }
    this.panel.webview.postMessage(message);
  }

  /** Surfaces the panel without stealing focus from the editor. */
  reveal(beside: boolean): void {
    this.panel.reveal(beside ? ViewColumn.Beside : ViewColumn.Active, true);
  }

  dispose(): void {
    // Triggers onDidDispose → handleDispose (idempotent).
    this.panel.dispose();
  }

  private handleMessage(message: ClientToHost): void {
    if (message.type === "ready") {
      this.clientReady = true;
      if (this.pending) {
        const flush = this.pending;
        this.pending = null;
        this.panel.webview.postMessage(flush);
      }
    }
    // `sentinelClick` is intentionally ignored — sentinel links are inert.
  }

  private handleDispose(): void {
    while (this.disposables.length) {
      this.disposables.pop()!.dispose();
    }
    this.onDispose();
  }

  private buildHtml(): string {
    const { webview } = this.panel;
    const nonce = makeNonce();
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(this.extensionUri, "media", "diagram", "client.js")
    );
    const styleUri = webview.asWebviewUri(
      Uri.joinPath(this.extensionUri, "media", "diagram", "client.css")
    );

    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource}`
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>${TITLE}</title>
</head>
<body>
  <div id="diagram-root">
    <div id="diagram-surface"></div>
    <div id="diagram-callout" hidden></div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

const NONCE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function makeNonce(): string {
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += NONCE_CHARS.charAt(Math.floor(Math.random() * NONCE_CHARS.length));
  }
  return text;
}
