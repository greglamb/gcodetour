# VS Code API Reference

Core namespaces and APIs for extension development.

---

## Core Namespaces

### vscode.commands

Register and execute commands.

```typescript
// Register a command
vscode.commands.registerCommand('ext.myCommand', (args) => {
    console.log('Command executed with:', args);
});

// Execute a command
vscode.commands.executeCommand('editor.action.addCommentLine');

// Execute with return value
const definitions = await vscode.commands.executeCommand(
    'vscode.executeDefinitionProvider',
    document.uri,
    position
);
```

---

### vscode.window

UI elements and editor state.

```typescript
// Active editor
const editor = vscode.window.activeTextEditor;

// Show messages
vscode.window.showInformationMessage('Info');
vscode.window.showWarningMessage('Warning');
vscode.window.showErrorMessage('Error');

// Quick pick
const choice = await vscode.window.showQuickPick(['a', 'b', 'c']);

// Input box
const input = await vscode.window.showInputBox({ prompt: 'Enter name' });

// Create output channel
const output = vscode.window.createOutputChannel('My Extension');
output.appendLine('Log message');
output.show();

// Create terminal
const terminal = vscode.window.createTerminal('My Terminal');
terminal.sendText('echo Hello');
terminal.show();
```

---

### vscode.workspace

Files, folders, and configuration.

```typescript
// Workspace folders
const folders = vscode.workspace.workspaceFolders;

// Find files
const files = await vscode.workspace.findFiles('**/*.ts', '**/node_modules/**');

// Open document
const doc = await vscode.workspace.openTextDocument(uri);

// Get configuration
const config = vscode.workspace.getConfiguration('myext');
const value = config.get<string>('setting');

// Update configuration
await config.update('setting', 'value', vscode.ConfigurationTarget.Global);

// Watch files
const watcher = vscode.workspace.createFileSystemWatcher('**/*.ts');
watcher.onDidChange(uri => console.log('Changed:', uri.path));
```

---

### vscode.languages

Language features and diagnostics.

```typescript
// Create diagnostic collection
const diagnostics = vscode.languages.createDiagnosticCollection('myext');

// Set diagnostics
diagnostics.set(document.uri, [
    new vscode.Diagnostic(
        range,
        'Error message',
        vscode.DiagnosticSeverity.Error
    )
]);

// Register hover provider
vscode.languages.registerHoverProvider('javascript', {
    provideHover(document, position) {
        return new vscode.Hover('Hover text');
    }
});

// Register completion provider
vscode.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems(document, position) {
        return [
            new vscode.CompletionItem('myFunction', vscode.CompletionItemKind.Function)
        ];
    }
});
```

---

### vscode.debug

Debugging operations.

```typescript
// Start debugging
await vscode.debug.startDebugging(folder, 'Launch Config');

// Stop debugging
await vscode.debug.stopDebugging();

// Active session
const session = vscode.debug.activeDebugSession;

// Breakpoints
const breakpoints = vscode.debug.breakpoints;

// Listen for session events
vscode.debug.onDidStartDebugSession(session => {
    console.log('Debug started:', session.name);
});
```

---

### vscode.env

Environment information.

```typescript
// App info
const appName = vscode.env.appName;        // "Visual Studio Code"
const language = vscode.env.language;       // "en"
const machineId = vscode.env.machineId;

// Clipboard
await vscode.env.clipboard.writeText('copied');
const text = await vscode.env.clipboard.readText();

// Open external URL
await vscode.env.openExternal(vscode.Uri.parse('https://code.visualstudio.com'));

// Check remote
const isRemote = vscode.env.remoteName !== undefined;
```

---

### vscode.authentication

Auth providers and sessions.

```typescript
// Get GitHub session
const session = await vscode.authentication.getSession('github', ['repo'], {
    createIfNone: true
});
const token = session.accessToken;

// Listen for auth changes
vscode.authentication.onDidChangeSessions(e => {
    if (e.provider.id === 'github') {
        // Handle change
    }
});
```

---

### vscode.chat

Chat participants (AI features).

```typescript
// Create chat participant
const participant = vscode.chat.createChatParticipant('myext.helper',
    async (request, context, response, token) => {
        response.markdown('Hello! How can I help?');
    }
);

participant.iconPath = new vscode.ThemeIcon('robot');
```

---

### vscode.lm

Language model interactions.

```typescript
// Select a model
const models = await vscode.lm.selectChatModels({ family: 'gpt-4' });

// Send request
if (models.length > 0) {
    const response = await models[0].sendRequest(
        [{ role: 'user', content: 'Hello' }],
        {},
        token
    );
}
```

---

## Key Classes

### TextEditor

```typescript
const editor = vscode.window.activeTextEditor;
if (editor) {
    const document = editor.document;
    const selection = editor.selection;

    // Edit document
    await editor.edit(editBuilder => {
        editBuilder.replace(selection, 'new text');
    });
}
```

### TextDocument

```typescript
const doc = editor.document;
const text = doc.getText();
const lineCount = doc.lineCount;
const languageId = doc.languageId;
const uri = doc.uri;
```

### Uri

```typescript
const uri = vscode.Uri.file('/path/to/file');
const uri2 = vscode.Uri.parse('https://example.com');
const joined = vscode.Uri.joinPath(uri, 'subdir', 'file.txt');
```

### Position and Range

```typescript
const pos = new vscode.Position(line, character);
const range = new vscode.Range(startPos, endPos);
const range2 = new vscode.Range(0, 0, 10, 20);
```

### Disposable

```typescript
const disposable = vscode.commands.registerCommand('ext.cmd', () => {});
context.subscriptions.push(disposable); // Auto-dispose on deactivate
```
