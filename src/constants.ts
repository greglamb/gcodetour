// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Uri } from "vscode";

export const EXTENSION_NAME = "codetour";

export const FS_SCHEME = EXTENSION_NAME;
export const FS_SCHEME_CONTENT = `${FS_SCHEME}-content`;
export const CONTENT_URI = Uri.parse(`${FS_SCHEME_CONTENT}://current/CodeTour`);

// Icons ship inside the extension (see the `images/` directory and the `icon`
// field in package.json) and are resolved relative to the extension's install
// location, rather than being fetched from a remote CDN at runtime.
let extensionUri: Uri | undefined;

export function initializeIcons(uri: Uri): void {
  extensionUri = uri;
}

function iconUri(fileName: string): Uri {
  if (!extensionUri) {
    throw new Error(
      "[gCodeTour] icons were used before initializeIcons() was called"
    );
  }
  return Uri.joinPath(extensionUri, "images", fileName);
}

export const getIconUri = (): Uri => iconUri("icon.png");
export const getSmallIconUri = (): Uri => iconUri("icon-small.png");

export const VSCODE_DIRECTORY = ".vscode";
