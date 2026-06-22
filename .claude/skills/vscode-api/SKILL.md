---
name: vscode-api
description: VS Code Extension API documentation - use when building VS Code extensions, registering commands, creating webviews, tree views, language features, or integrating with VS Code
---

# VS Code Extension API Skill

Comprehensive assistance for building Visual Studio Code extensions.

## When to Use This Skill

This skill should be triggered when:
- Building VS Code extensions
- Registering commands, keybindings, or menus
- Creating webviews, tree views, or custom editors
- Implementing language support (syntax, IntelliSense, diagnostics)
- Working with the extension manifest (package.json)
- Understanding activation events and contribution points
- Using the VS Code API namespaces

## Quick Reference

### Project Setup

```bash
# Generate extension scaffold
npx --package yo --package generator-code -- yo code

# Or with global install
npm install --global yo generator-code
yo code
```

### Extension Structure

```
my-extension/
├── package.json          # Extension manifest
├── src/
│   └── extension.ts      # Entry point
├── .vscode/
│   └── launch.json       # Debug configuration
└── README.md
```

### Minimal Extension

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register a command
    const disposable = vscode.commands.registerCommand(
        'myext.helloWorld',
        () => {
            vscode.window.showInformationMessage('Hello World!');
        }
    );
    context.subscriptions.push(disposable);
}

export function deactivate() {}
```

### package.json (Manifest)

```json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "version": "0.0.1",
  "publisher": "my-publisher",
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [{
      "command": "myext.helloWorld",
      "title": "Hello World"
    }]
  }
}
```

---

## Core API Namespaces

| Namespace | Purpose |
|-----------|---------|
| `vscode.commands` | Register and execute commands |
| `vscode.window` | UI elements, editors, notifications |
| `vscode.workspace` | Files, folders, configuration |
| `vscode.languages` | Language features, diagnostics |
| `vscode.debug` | Debugging sessions, breakpoints |
| `vscode.env` | Environment info, clipboard |
| `vscode.authentication` | Auth providers and sessions |
| `vscode.chat` | Chat participants (AI) |
| `vscode.lm` | Language model interactions |

---

## Common Patterns

### Register a Command

```typescript
const cmd = vscode.commands.registerCommand('ext.myCommand', (arg) => {
    vscode.window.showInformationMessage(`Received: ${arg}`);
});
context.subscriptions.push(cmd);
```

### Execute Built-in Command

```typescript
// Comment current line
vscode.commands.executeCommand('editor.action.addCommentLine');

// Go to definition
vscode.commands.executeCommand('vscode.executeDefinitionProvider', uri, position);
```

### Show Quick Pick

```typescript
const result = await vscode.window.showQuickPick(
    ['Option 1', 'Option 2', 'Option 3'],
    { placeHolder: 'Select an option' }
);
```

### Show Input Box

```typescript
const input = await vscode.window.showInputBox({
    prompt: 'Enter your name',
    placeHolder: 'Name'
});
```

### Read/Write Configuration

```typescript
// Read
const config = vscode.workspace.getConfiguration('myext');
const value = config.get<boolean>('enableFeature');

// Write
await config.update('enableFeature', true, vscode.ConfigurationTarget.Global);
```

### Create Output Channel

```typescript
const output = vscode.window.createOutputChannel('My Extension');
output.appendLine('Starting...');
output.show();
```

### Show Progress

```typescript
vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Processing...',
    cancellable: true
}, async (progress, token) => {
    progress.report({ increment: 50, message: 'Halfway done' });
    await doWork();
});
```

---

## Key Contribution Points

| Point | Purpose |
|-------|---------|
| `commands` | Define commands for Command Palette |
| `menus` | Place commands in context menus |
| `configuration` | Extension settings |
| `keybindings` | Keyboard shortcuts |
| `views` | Sidebar tree views |
| `viewsContainers` | Activity bar/panel containers |
| `languages` | Language registration |
| `grammars` | TextMate syntax highlighting |
| `snippets` | Code snippets |
| `themes` | Color themes |
| `customEditors` | Custom editor implementations |
| `debuggers` | Debug adapters |
| `taskDefinitions` | Task types |
| `walkthroughs` | Onboarding guides |

---

## Key Activation Events

| Event | Trigger |
|-------|---------|
| `onCommand:ext.cmd` | Command invoked |
| `onLanguage:python` | File of language opened |
| `onView:myView` | View expanded |
| `workspaceContains:**/*.py` | Matching file in workspace |
| `onFileSystem:sftp` | URI scheme accessed |
| `onStartupFinished` | After VS Code starts |
| `*` | Immediate (avoid if possible) |

---

## Storage Options

| Type | Scope | Use Case |
|------|-------|----------|
| `context.workspaceState` | Per workspace | Workspace-specific data |
| `context.globalState` | All workspaces | User preferences |
| `context.storageUri` | Per workspace | Large files |
| `context.globalStorageUri` | All workspaces | Shared files |
| `context.secrets` | Encrypted | API keys, tokens |

```typescript
// Read/write state
const value = context.globalState.get<string>('key');
await context.globalState.update('key', 'new value');

// Store secrets
await context.secrets.store('apiKey', 'secret123');
const secret = await context.secrets.get('apiKey');
```

---

## Reference Files

This skill includes documentation in `references/`:

- **getting-started.md** - First extension walkthrough
- **api-reference.md** - Core API namespaces
- **contribution-points.md** - All contribution types
- **activation-events.md** - Event triggers
- **capabilities.md** - What extensions can do
- **webview.md** - Webview API guide
- **commands.md** - Command patterns
- **tree-view.md** - Tree view implementation

## Tips

1. **Use activation events** - Load only when needed
2. **Dispose resources** - Add to `context.subscriptions`
3. **Use Output Channel** - Better than console.log
4. **Check extension kind** - Remote vs local execution
5. **Test with F5** - Opens Extension Development Host

## Resources

- Official Docs: https://code.visualstudio.com/api
- Extension Samples: https://github.com/microsoft/vscode-extension-samples
- API Reference: https://code.visualstudio.com/api/references/vscode-api
