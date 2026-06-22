# VS Code Commands Guide

Register and execute commands in VS Code extensions.

---

## Overview

Commands are the primary way to trigger actions in VS Code. They can be:
- Invoked from Command Palette
- Bound to keyboard shortcuts
- Placed in menus
- Executed programmatically

---

## Registering Commands

### Basic Registration

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register a simple command
    const cmd = vscode.commands.registerCommand('myext.sayHello', () => {
        vscode.window.showInformationMessage('Hello World!');
    });

    context.subscriptions.push(cmd);
}
```

### With Arguments

```typescript
const cmd = vscode.commands.registerCommand('myext.greet', (name: string) => {
    vscode.window.showInformationMessage(`Hello, ${name}!`);
});
```

### With Return Value

```typescript
const cmd = vscode.commands.registerCommand('myext.calculate', (a: number, b: number) => {
    return a + b;
});

// Call it
const result = await vscode.commands.executeCommand<number>('myext.calculate', 5, 3);
// result = 8
```

### Text Editor Command

Only available when an editor is active:

```typescript
const cmd = vscode.commands.registerTextEditorCommand(
    'myext.insertText',
    (editor, edit, text: string) => {
        edit.insert(editor.selection.active, text);
    }
);
```

---

## Making Commands User-Facing

Add to `package.json` to show in Command Palette:

```json
{
  "contributes": {
    "commands": [{
      "command": "myext.sayHello",
      "title": "Say Hello",
      "category": "My Extension",
      "icon": "$(megaphone)"
    }]
  }
}
```

**Properties:**
- `command` - Unique identifier
- `title` - Display name
- `category` - Optional prefix (shown as "Category: Title")
- `icon` - ThemeIcon or path
- `enablement` - When clause for enabled state

---

## Command Visibility

Control when commands appear in Command Palette:

```json
{
  "contributes": {
    "menus": {
      "commandPalette": [{
        "command": "myext.formatMarkdown",
        "when": "editorLangId == markdown"
      }, {
        "command": "myext.internalCommand",
        "when": "false"
      }]
    }
  }
}
```

---

## Executing Commands

### Execute Built-in Commands

```typescript
// Comment current line
vscode.commands.executeCommand('editor.action.addCommentLine');

// Open settings
vscode.commands.executeCommand('workbench.action.openSettings');

// Open file
vscode.commands.executeCommand('vscode.open', vscode.Uri.file('/path/to/file'));

// Show quick open
vscode.commands.executeCommand('workbench.action.quickOpen');
```

### With Return Values

```typescript
// Get definition locations
const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider',
    document.uri,
    position
);

// Get completions
const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider',
    document.uri,
    position
);
```

---

## Command URIs

Execute commands via URIs in Markdown hovers, completions, etc.

```typescript
// Basic command URI
const uri = vscode.Uri.parse('command:myext.sayHello');

// With arguments
const args = [{ name: 'John' }];
const uri = vscode.Uri.parse(
    `command:myext.greet?${encodeURIComponent(JSON.stringify(args))}`
);

// In Markdown content
const markdown = new vscode.MarkdownString(
    `[Click to greet](command:myext.greet?${encodeURIComponent(JSON.stringify(['World']))})`
);
markdown.isTrusted = true; // Required for command URIs!
```

---

## Keybindings

Bind commands to keyboard shortcuts:

```json
{
  "contributes": {
    "keybindings": [{
      "command": "myext.format",
      "key": "ctrl+shift+f",
      "mac": "cmd+shift+f",
      "when": "editorTextFocus"
    }, {
      "command": "myext.save",
      "key": "ctrl+s",
      "when": "editorTextFocus && resourceExtname == .myext"
    }]
  }
}
```

---

## Context Menus

Add commands to right-click menus:

```json
{
  "contributes": {
    "menus": {
      "editor/context": [{
        "command": "myext.format",
        "when": "editorHasSelection",
        "group": "modification"
      }],
      "explorer/context": [{
        "command": "myext.openWith",
        "when": "resourceExtname == .json",
        "group": "navigation"
      }],
      "editor/title": [{
        "command": "myext.toggle",
        "group": "navigation"
      }]
    }
  }
}
```

**Menu Groups:**
- `navigation` - Top of menu
- `1_modification` - Edit operations
- `9_cutcopypaste` - Clipboard
- Custom groups sort alphabetically

---

## Custom When Contexts

Set custom context for `when` clauses:

```typescript
// Set context
vscode.commands.executeCommand('setContext', 'myext.isActive', true);
vscode.commands.executeCommand('setContext', 'myext.mode', 'edit');

// Clear context
vscode.commands.executeCommand('setContext', 'myext.isActive', false);
```

Use in `when` clauses:

```json
{
  "command": "myext.special",
  "when": "myext.isActive && myext.mode == 'edit'"
}
```

---

## Common Built-in Commands

### Editor Commands

```typescript
// Text manipulation
'editor.action.addCommentLine'
'editor.action.removeCommentLine'
'editor.action.formatDocument'
'editor.action.formatSelection'
'editor.action.copyLinesDownAction'

// Navigation
'editor.action.goToDefinition'
'editor.action.peekDefinition'
'editor.action.showReferences'
'editor.action.revealDefinition'

// Selection
'editor.action.selectAll'
'editor.action.smartSelect.expand'
```

### Workbench Commands

```typescript
// Files
'vscode.open'
'vscode.openWith'
'workbench.action.files.save'
'workbench.action.files.saveAll'

// Views
'workbench.action.toggleSidebarVisibility'
'workbench.action.togglePanel'
'workbench.action.focusActiveEditorGroup'

// Navigation
'workbench.action.quickOpen'
'workbench.action.showAllSymbols'
'workbench.action.gotoLine'

// Settings
'workbench.action.openSettings'
'workbench.action.openSettingsJson'
```

---

## Best Practices

1. **Use descriptive IDs** - `myext.formatDocument` not `myext.cmd1`
2. **Title style** - Use title case, start with verb
3. **Category** - Group related commands
4. **When clauses** - Hide irrelevant commands
5. **Dispose properly** - Add to subscriptions
6. **Unique IDs** - Avoid conflicts with other extensions

---

## Error Handling

```typescript
try {
    await vscode.commands.executeCommand('someCommand');
} catch (error) {
    vscode.window.showErrorMessage(`Command failed: ${error}`);
}
```

Registering duplicate command IDs throws an error. Use unique prefixes.
