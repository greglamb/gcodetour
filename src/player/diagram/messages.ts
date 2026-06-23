// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// The message protocol exchanged between the extension host (panel.ts) and the
// webview client (client/main.ts). Kept in one `import type`-only module so both
// sides share a single source of truth without pulling in any runtime code.

export interface RenderMessage {
  type: "render";
  // The raw SVG markup to display. The client sanitizes it before injecting.
  svg: string;
  // The element alias to highlight once rendered (optional).
  element?: string;
  // A short label to pin near the highlighted element (optional).
  callout?: string;
}

export interface HighlightMessage {
  type: "highlight";
  element?: string;
  callout?: string;
}

export interface ClearMessage {
  type: "clear";
}

export type HostToClient = RenderMessage | HighlightMessage | ClearMessage;

export interface ReadyMessage {
  type: "ready";
}

export interface SentinelClickMessage {
  type: "sentinelClick";
  href: string;
}

export type ClientToHost = ReadyMessage | SentinelClickMessage;
