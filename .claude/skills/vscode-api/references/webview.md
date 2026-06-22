# VS Code Webview API Guide

Create custom views with HTML, CSS, and JavaScript.

---

## Overview

Webviews are like iframes controlled by your extension. They can display any HTML content and communicate with the extension.

**Use cases:**
- Complex UI that can't be built with tree views
- Preview panels (Markdown, images)
- Custom editors
- Interactive dashboards

---

## Creating a Webview Panel

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const cmd = vscode.commands.registerCommand('myext.showPanel', () => {
        const panel = vscode.window.createWebviewPanel(
            'myWebview',                // View type (internal ID)
            'My Webview',               // Title shown in tab
            vscode.ViewColumn.One,      // Editor column
            {
                enableScripts: true,    // Enable JavaScript
                retainContextWhenHidden: true  // Keep state when hidden
            }
        );

        panel.webview.html = getWebviewContent();
    });

    context.subscriptions.push(cmd);
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Webview</title>
</head>
<body>
    <h1>Hello from Webview!</h1>
    <button id="btn">Click Me</button>
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('btn').onclick = () => {
            vscode.postMessage({ command: 'buttonClicked' });
        };
    </script>
</body>
</html>`;
}
```

---

## Message Passing

### Extension to Webview

```typescript
// In extension
panel.webview.postMessage({ command: 'update', data: { count: 42 } });
```

```javascript
// In webview script
window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'update') {
        console.log('Count:', message.data.count);
    }
});
```

### Webview to Extension

```javascript
// In webview script
const vscode = acquireVsCodeApi();
vscode.postMessage({ command: 'save', text: 'Hello' });
```

```typescript
// In extension
panel.webview.onDidReceiveMessage(
    message => {
        switch (message.command) {
            case 'save':
                vscode.window.showInformationMessage(`Saving: ${message.text}`);
                break;
        }
    },
    undefined,
    context.subscriptions
);
```

---

## State Persistence

### getState / setState

Persists across visibility changes:

```javascript
// In webview script
const vscode = acquireVsCodeApi();

// Save state
vscode.setState({ count: 42 });

// Restore state
const previousState = vscode.getState();
const count = previousState?.count || 0;
```

### Serialization (Persist Across Restarts)

```typescript
// Register serializer
vscode.window.registerWebviewPanelSerializer('myWebview', {
    async deserializeWebviewPanel(panel: vscode.WebviewPanel, state: any) {
        panel.webview.html = getWebviewContent();
        // Restore state from `state` parameter
    }
});
```

---

## Loading Local Resources

Use `asWebviewUri` to create safe URIs for local files:

```typescript
function getWebviewContent(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
): string {
    // Get URI for resources
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'media', 'style.css')
    );
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'media', 'main.js')
    );

    return `<!DOCTYPE html>
<html>
<head>
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <script src="${scriptUri}"></script>
</body>
</html>`;
}

// Create panel with restricted resource access
const panel = vscode.window.createWebviewPanel('myWebview', 'Title',
    vscode.ViewColumn.One,
    {
        enableScripts: true,
        localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'media')
        ]
    }
);
```

---

## Security Best Practices

### Content Security Policy

```typescript
function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const nonce = getNonce();
    const styleUri = webview.asWebviewUri(/*...*/);
    const scriptUri = webview.asWebviewUri(/*...*/);

    return `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${webview.cspSource};
        script-src 'nonce-${nonce}';
        img-src ${webview.cspSource} https:;
    ">
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
```

### Security Guidelines

1. **Limit localResourceRoots** - Only allow needed directories
2. **Use CSP** - Restrict script and style sources
3. **Sanitize input** - Never trust webview messages
4. **Use HTTPS** - For external resources
5. **Disable scripts** - If not needed

---

## Theming

Webviews adapt to VS Code themes via CSS classes and variables:

```css
/* Theme-aware styles */
body.vscode-light {
    background: white;
    color: black;
}

body.vscode-dark {
    background: #1e1e1e;
    color: white;
}

body.vscode-high-contrast {
    background: black;
    color: white;
}

/* Use VS Code CSS variables */
body {
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    font-family: var(--vscode-font-family);
}

button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
}

button:hover {
    background: var(--vscode-button-hoverBackground);
}
```

---

## Lifecycle Events

```typescript
// Handle disposal
panel.onDidDispose(() => {
    // Clean up resources
    clearInterval(myInterval);
}, null, context.subscriptions);

// Handle visibility changes
panel.onDidChangeViewState(e => {
    if (e.webviewPanel.visible) {
        // Panel became visible
        updateContent();
    }
});
```

---

## Webview Options

```typescript
const panel = vscode.window.createWebviewPanel('type', 'Title',
    vscode.ViewColumn.One,
    {
        // Enable JavaScript
        enableScripts: true,

        // Restrict resource loading
        localResourceRoots: [mediaFolder],

        // Retain context when hidden (memory intensive)
        retainContextWhenHidden: true,

        // Enable find widget
        enableFindWidget: true,

        // Enable command URIs
        enableCommandUris: true
    }
);
```

---

## Webview Views (Sidebar)

```typescript
class MyViewProvider implements vscode.WebviewViewProvider {
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) {
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = getWebviewContent();
    }
}

// Register in activate()
context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('myext.sidebarView', new MyViewProvider())
);
```

```json
{
  "contributes": {
    "views": {
      "explorer": [{
        "type": "webview",
        "id": "myext.sidebarView",
        "name": "My View"
      }]
    }
  }
}
```
