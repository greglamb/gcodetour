// Copyright (c) Microsoft Corporation.
// Copyright (c) 2026 Greg Lamb (fork modifications).
// Licensed under the MIT License.

// Pure, VS Code-independent helpers for deriving tour/step labels and step
// markers from tour data. Kept free of any `vscode` (or `store`) imports so
// they can be unit tested in plain Node — see `src/test/unit/tourLabels.test.ts`.
// `utils.ts` re-exports the public ones.

import * as os from "os";
import * as path from "path";
import type { CodeTour } from "./store";

const HEADING_PATTERN = /^#+\s*(.*)/;

export function getStepLabel(
  tour: CodeTour,
  stepNumber: number,
  includeStepNumber: boolean = true,
  defaultToFileName: boolean = true
) {
  const step = tour.steps[stepNumber];

  const prefix = includeStepNumber ? `#${stepNumber + 1} - ` : "";
  let label = "";
  if (step.title) {
    label = step.title;
  } else if (HEADING_PATTERN.test(step.description.trim())) {
    label = step.description.trim().match(HEADING_PATTERN)![1];
  } else if (step.markerTitle) {
    label = step.markerTitle;
  } else if (defaultToFileName) {
    label = step.uri
      ? step.uri!
      : decodeURIComponent(step.directory || step.file!);
  }

  return `${prefix}${label}`;
}

export function getTourTitle(tour: CodeTour) {
  if (tour.title.match(/^#?\d+\s-/)) {
    // Strip the leading "N - " prefix, keeping the rest of the title intact.
    // (Splitting on "-" would truncate a title with a second hyphen, e.g.
    // "1 - Jobs - Phase 2" -> "Jobs".)
    return tour.title.slice(tour.title.indexOf("-") + 1).trim();
  }

  return tour.title;
}

export function getRelativePath(root: string, filePath: string) {
  let relativePath = path.relative(root, filePath);

  if (os.platform() === "win32") {
    relativePath = relativePath.replace(/\\/g, "/");
  }

  return relativePath;
}

export function getTourNumber(tour: CodeTour): number | undefined {
  const match = tour.title.match(/^#?(\d+)\s+-/);
  if (match) {
    return Number(match[1]);
  }
}

export function getStepMarkerPrefix(tour: CodeTour): string | undefined {
  if (tour.stepMarker) {
    return tour.stepMarker;
  } else {
    const tourNumber = getTourNumber(tour);
    if (tourNumber) {
      return `CT${tourNumber}`;
    }
  }
}
