// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

// Pure parsing/validation for a step's optional `diagram` object. Imports no
// `vscode`/`store` at runtime (only the type, which is erased) so it can be
// unit-tested in plain Node.

import type { CodeTourStepDiagram } from "../../store";

export type DiagramSpec = CodeTourStepDiagram;

// A step shape that only exposes the field this module cares about, so the
// parser can be exercised without constructing a full `CodeTourStep`.
export interface StepWithDiagram {
  diagram?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

/**
 * Validates a step's `diagram` field and returns a normalized {@link DiagramSpec},
 * or `null` if the step has no diagram (silently) or a malformed one (with a
 * warning). Never throws — malformed diagrams must degrade gracefully so they
 * can't break tour playback.
 */
export function parseDiagramFromStep(
  step: StepWithDiagram
): DiagramSpec | null {
  try {
    const { diagram } = step;

    // No diagram on this step — the common case, not an error.
    if (diagram === undefined || diagram === null) {
      return null;
    }

    if (typeof diagram !== "object" || Array.isArray(diagram)) {
      warn("expected an object");
      return null;
    }

    const candidate = diagram as Record<string, unknown>;

    if (!isNonEmptyString(candidate.path)) {
      warn("`path` is required and must be a non-empty string");
      return null;
    }

    if (!isOptionalString(candidate.element)) {
      warn("`element` must be a string when present");
      return null;
    }

    if (!isOptionalString(candidate.callout)) {
      warn("`callout` must be a string when present");
      return null;
    }

    const spec: DiagramSpec = { path: candidate.path };
    if (candidate.element !== undefined) {
      spec.element = candidate.element;
    }
    if (candidate.callout !== undefined) {
      spec.callout = candidate.callout;
    }
    return spec;
  } catch {
    warn("could not be read");
    return null;
  }
}

function warn(reason: string): void {
  console.warn(`[gCodeTour] ignoring malformed diagram: ${reason}`);
}
