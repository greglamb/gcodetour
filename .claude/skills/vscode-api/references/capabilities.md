# VS Code Extension Capabilities

What extensions can do and how to implement common features.

---

## Capability Categories

### Common Capabilities

Available to all extensions:
- Commands, configuration, keybindings
- Context menus
- Data storage
- Notifications
- Quick picks and input boxes
- File pickers
- Output channels
- Progress indicators

### Theming

- Color themes (dark/light)
- File icon themes
- Product icon themes
- Semantic token colors

### Language Features (Declarative)

No code required:
- Syntax highlighting (TextMate grammars)
- Bracket matching
- Auto-indentation
- Snippets
- Language configuration

### Language Features (Programmatic)

Via `vscode.languages.*`:
- Hover information
- Go to definition
- IntelliSense (completions)
- Code actions (quick fixes)
- CodeLens
- Diagnostics (errors/warnings)
- Formatting
- Folding
- Rename

### Workbench Extensions

- Tree views
- Webviews
- Custom editors
- Status bar items
- Notifications
- Activity bar containers

### Debugging

- Debug adapters
- Breakpoint support
- Debug configurations
- Variable inspection

---

## Key Restrictions

> **No DOM Access**: Extensions cannot access the VS Code UI DOM. No custom CSS or HTML injection into the main window.

Use provided APIs (webviews, tree views) for custom UI.

---

## Common Capabilities

### Commands

```typescript
// Register command
const cmd = vscode.commands.registerCommand('myext.greet', (name: string) => {
    vscode.window.showInformationMessage(`Hello, ${name}!`);
});
context.subscriptions.push(cmd);
```

```json
{
  "contributes": {
    "commands": [{
      "command": "myext.greet",
      "title": "Greet User"
    }]
  }
}
```

---

### Configuration

```typescript
// Read configuration
const config = vscode.workspace.getConfiguration('myext');
const enabled = config.get<boolean>('enabled', true);
const count = config.get<number>('maxItems', 10);

// Update configuration
await config.update('enabled', false, vscode.ConfigurationTarget.Global);

// Watch for changes
vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('myext.enabled')) {
        // React to change
    }
});
```

---

### Context Menus

```json
{
  "contributes": {
    "menus": {
      "editor/context": [{
        "command": "myext.format",
        "when": "editorTextFocus && resourceLangId == javascript",
        "group": "modification"
      }]
    }
  }
}
```

---

### Data Storage

```typescript
// Workspace state (per workspace)
context.workspaceState.update('lastFile', 'example.ts');
const lastFile = context.workspaceState.get<string>('lastFile');

// Global state (all workspaces, can sync)
context.globalState.update('totalUsage', 42);
context.globalState.setKeysForSync(['totalUsage']); // Enable sync

// File storage (workspace)
const uri = vscode.Uri.joinPath(context.storageUri!, 'data.json');
await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(data)));

// Global file storage
const globalUri = vscode.Uri.joinPath(context.globalStorageUri, 'settings.json');

// Secrets (encrypted, never synced)
await context.secrets.store('apiKey', 'secret-value');
const secret = await context.secrets.get('apiKey');
```

---

### Notifications

```typescript
// Information
vscode.window.showInformationMessage('Task completed!');

// Warning
vscode.window.showWarningMessage('File not saved');

// Error
vscode.window.showErrorMessage('Connection failed');

// With actions
const action = await vscode.window.showInformationMessage(
    'Do you want to proceed?',
    'Yes', 'No'
);
if (action === 'Yes') {
    // Handle
}

// With progress
vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Processing...',
    cancellable: true
}, async (progress, token) => {
    progress.report({ increment: 0, message: 'Starting' });
    // Do work
    progress.report({ increment: 50, message: 'Halfway' });
    // More work
    progress.report({ increment: 100, message: 'Done' });
});
```

---

### Quick Pick

```typescript
// Simple
const choice = await vscode.window.showQuickPick(['Option A', 'Option B', 'Option C']);

// With details
const items: vscode.QuickPickItem[] = [
    { label: 'Option A', description: 'First option', detail: 'More info' },
    { label: 'Option B', description: 'Second option' }
];
const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an option',
    canPickMany: false
});

// Multi-select
const multiple = await vscode.window.showQuickPick(items, {
    canPickMany: true
});
```

---

### Input Box

```typescript
const name = await vscode.window.showInputBox({
    prompt: 'Enter your name',
    placeHolder: 'John Doe',
    value: 'Default',
    validateInput: (value) => {
        return value.length < 2 ? 'Name too short' : undefined;
    }
});
```

---

### File Picker

```typescript
// Open file dialog
const uris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: true,
    filters: { 'Images': ['png', 'jpg'], 'All': ['*'] }
});

// Save file dialog
const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file('untitled.txt'),
    filters: { 'Text': ['txt'] }
});
```

---

### Output Channel

```typescript
const output = vscode.window.createOutputChannel('My Extension');
output.appendLine('Starting process...');
output.appendLine(`Result: ${result}`);
output.show(); // Focus the output panel

// Log channel (supports log levels)
const logOutput = vscode.window.createOutputChannel('My Extension', { log: true });
logOutput.info('Info message');
logOutput.warn('Warning');
logOutput.error('Error');
```

---

### Progress

```typescript
// In notification
await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Loading',
    cancellable: true
}, async (progress, token) => {
    for (let i = 0; i <= 100; i += 10) {
        if (token.isCancellationRequested) break;
        progress.report({ increment: 10, message: `${i}%` });
        await sleep(100);
    }
});

// In status bar
await vscode.window.withProgress({
    location: vscode.ProgressLocation.Window,
    title: 'Loading'
}, async () => {
    await doWork();
});

// In source control
await vscode.window.withProgress({
    location: { viewId: 'workbench.scm' }
}, async () => {
    await gitOperation();
});
```

---

### Status Bar

```typescript
const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
);
statusBar.text = '$(sync~spin) Loading';
statusBar.tooltip = 'Click to cancel';
statusBar.command = 'myext.cancel';
statusBar.show();

context.subscriptions.push(statusBar);
```
