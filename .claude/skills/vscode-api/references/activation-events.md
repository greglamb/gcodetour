# VS Code Activation Events Reference

Events that trigger extension activation.

---

## Overview

Activation events define when your extension loads. Use specific events to minimize startup impact.

```json
{
  "activationEvents": [
    "onCommand:myext.sayHello",
    "onLanguage:python"
  ]
}
```

---

## Event Types

### onCommand

Activate when a command is invoked.

```json
"activationEvents": ["onCommand:myext.sayHello"]
```

---

### onLanguage

Activate when a file of a specific language opens.

```json
"activationEvents": ["onLanguage:python"]
```

Multiple languages:
```json
"activationEvents": [
  "onLanguage:javascript",
  "onLanguage:typescript"
]
```

---

### onView

Activate when a view expands.

```json
"activationEvents": ["onView:nodeDependencies"]
```

---

### workspaceContains

Activate when workspace contains matching files.

```json
"activationEvents": ["workspaceContains:**/.editorconfig"]
```

---

### onFileSystem

Activate when files from a specific scheme are accessed.

```json
"activationEvents": ["onFileSystem:sftp"]
```

---

### onUri

Activate when the extension's URI scheme is opened.

```json
"activationEvents": ["onUri"]
```

URIs: `vscode://publisher.extensionId/path`

---

### onWebviewPanel

Activate when a webview with matching viewType is restored.

```json
"activationEvents": ["onWebviewPanel:catCoding"]
```

---

### onCustomEditor

Activate when a custom editor opens.

```json
"activationEvents": ["onCustomEditor:myext.imageViewer"]
```

---

### onAuthenticationRequest

Activate when authentication is requested.

```json
"activationEvents": ["onAuthenticationRequest:github"]
```

---

### onStartupFinished

Activate after VS Code finishes starting (non-blocking).

```json
"activationEvents": ["onStartupFinished"]
```

Use for background tasks that don't need immediate execution.

---

### onDebug

Activate before a debug session starts.

```json
"activationEvents": ["onDebug"]
```

**Fine-grained variants:**
- `onDebugAdapterProtocolTracker`
- `onDebugDynamicConfigurations`
- `onDebugInitialConfigurations`
- `onDebugResolve:type`

---

### onTaskType

Activate when tasks of a type need resolving.

```json
"activationEvents": ["onTaskType:npm"]
```

---

### onNotebook

Activate when a notebook type opens.

```json
"activationEvents": ["onNotebook:jupyter-notebook"]
```

---

### onRenderer

Activate when a notebook renderer is used.

```json
"activationEvents": ["onRenderer:ms-toolsai.jupyter-renderers"]
```

---

### onTerminal

Activate when a terminal of a specific shell opens.

```json
"activationEvents": ["onTerminal:bash"]
```

---

### onTerminalProfile

Activate when a specific terminal profile launches.

```json
"activationEvents": ["onTerminalProfile:myext.terminal-profile"]
```

---

### onChatParticipant

Activate when a chat participant is invoked.

```json
"activationEvents": ["onChatParticipant:myext.helper"]
```

---

### onLanguageModelTool

Activate when a language model tool is invoked.

```json
"activationEvents": ["onLanguageModelTool:myext.tool"]
```

---

### onWalkthrough

Activate when a walkthrough opens.

```json
"activationEvents": ["onWalkthrough:myext.welcome"]
```

---

### onEditSession

Activate when an edit session is accessed.

```json
"activationEvents": ["onEditSession:file"]
```

---

### onSearch

Activate when search starts in a folder with given scheme.

```json
"activationEvents": ["onSearch:file"]
```

---

### onOpenExternalUri

Activate when an external URI (http/https) opens.

```json
"activationEvents": ["onOpenExternalUri"]
```

---

### onIssueReporterOpened

Activate when the issue reporter opens.

```json
"activationEvents": ["onIssueReporterOpened"]
```

---

### * (Startup)

Activate immediately on VS Code startup. **Avoid unless necessary.**

```json
"activationEvents": ["*"]
```

---

## Implicit Activation

Many contribution points auto-generate activation events:

| Contribution | Implicit Event |
|-------------|----------------|
| `commands` | `onCommand:` |
| `views` | `onView:` |
| `customEditors` | `onCustomEditor:` |
| `authentication` | `onAuthenticationRequest:` |
| `languages` (onEnterRules) | `onLanguage:` |

---

## Best Practices

1. **Be specific** - Use most specific event possible
2. **Avoid * ** - Slows VS Code startup
3. **Combine events** - Multiple events in array
4. **Use onStartupFinished** - For non-critical background tasks
5. **Rely on implicit** - Let contribution points handle it

---

## Extension Entry Points

```typescript
// Called when any activation event fires
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension activated!');
}

// Called when extension deactivates (VS Code shutdown)
export function deactivate(): Thenable<void> | undefined {
    console.log('Extension deactivated');
    return undefined;
}
```
