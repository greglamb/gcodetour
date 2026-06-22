# Getting Started with VS Code Extensions

Create your first VS Code extension step by step.

---

## Prerequisites

- Node.js installed
- Git installed

---

## Project Setup

Use Yeoman and the VS Code Extension Generator:

```bash
# Quick method (no global installation)
npx --package yo --package generator-code -- yo code

# Or global installation method
npm install --global yo generator-code
yo code
```

### Configuration Options

When prompted for a TypeScript project:

| Prompt | Response |
|--------|----------|
| Extension type | New Extension (TypeScript) |
| Name | HelloWorld |
| Identifier | helloworld |
| Description | (leave blank or describe) |
| Git repository | Y |
| Bundler | unbundled |
| Package manager | npm |
| Open in VS Code | Yes |

---

## Project Structure

```
helloworld/
├── .vscode/
│   ├── launch.json       # Debug configuration
│   └── tasks.json        # Build tasks
├── src/
│   └── extension.ts      # Extension entry point
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript config
└── README.md
```

---

## Running Your Extension

1. Open `src/extension.ts` in the editor
2. Press **F5** or use **Debug: Start Debugging** from Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. This compiles and launches an Extension Development Host window
4. Run the "Hello World" command from the Command Palette in that window

You should see: "Hello World from HelloWorld!" notification appear.

---

## Making Changes

1. Edit the message in `extension.ts`
2. Run **Developer: Reload Window** in the debug window
3. Execute the command again to see updates

---

## Understanding extension.ts

```typescript
import * as vscode from 'vscode';

// Called when extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "helloworld" is now active!');

    // Register a command
    let disposable = vscode.commands.registerCommand(
        'helloworld.helloWorld',
        () => {
            vscode.window.showInformationMessage('Hello World!');
        }
    );

    // Add to subscriptions for cleanup
    context.subscriptions.push(disposable);
}

// Called when extension is deactivated
export function deactivate() {}
```

---

## Understanding package.json

```json
{
  "name": "helloworld",
  "displayName": "HelloWorld",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.85.0"
  },
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [{
      "command": "helloworld.helloWorld",
      "title": "Hello World"
    }]
  }
}
```

Key fields:
- **engines.vscode**: Minimum VS Code version
- **main**: Entry point (compiled JS)
- **activationEvents**: When to load (empty = auto-detected)
- **contributes.commands**: Commands exposed to users

---

## Debugging Features

- **Breakpoints**: Click the gutter to set breakpoints
- **Variable Inspection**: Hover over variables while paused
- **Debug Console**: Evaluate expressions at runtime
- **Call Stack**: Navigate through execution frames

---

## Next Steps

1. Read Extension Anatomy guide for code details
2. Explore UX Guidelines for best practices
3. Check Extension Samples on GitHub
4. Learn about contribution points and activation events
