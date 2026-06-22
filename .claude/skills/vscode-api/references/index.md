# VS Code Extension API Documentation Index

Complete reference for building VS Code extensions.

---

## Reference Files

- **getting-started.md** - First extension walkthrough
- **api-reference.md** - Core API namespaces
- **contribution-points.md** - All contribution types
- **activation-events.md** - Extension activation triggers
- **capabilities.md** - What extensions can do
- **webview.md** - Webview API guide
- **commands.md** - Command patterns
- **tree-view.md** - Tree view implementation
- **manifest.md** - Extension manifest (package.json)

---

## Quick Links

### Getting Started
1. Install Node.js and Git
2. Run: `npx --package yo --package generator-code -- yo code`
3. Choose TypeScript extension
4. Press F5 to debug

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Commands** | Actions triggered by user or code |
| **Contribution Points** | JSON declarations extending VS Code |
| **Activation Events** | When extension loads |
| **API Namespaces** | vscode.window, vscode.workspace, etc. |

### Extension Capabilities

- **Common**: Commands, config, keybindings, menus, storage
- **UI**: Webviews, tree views, custom editors, status bar
- **Languages**: Syntax, IntelliSense, diagnostics, formatting
- **Debugging**: Debug adapters, breakpoints, sessions

---

## Resources

- Official Docs: https://code.visualstudio.com/api
- Extension Samples: https://github.com/microsoft/vscode-extension-samples
- API Reference: https://code.visualstudio.com/api/references/vscode-api
