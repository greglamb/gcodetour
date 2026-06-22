# VS Code Tree View API Guide

Create sidebar tree views in VS Code extensions.

---

## Overview

Tree views display hierarchical data in the sidebar. Common uses:
- File explorers
- Dependency trees
- Outline views
- Custom data browsers

---

## Basic Implementation

### 1. Package.json Configuration

```json
{
  "contributes": {
    "views": {
      "explorer": [{
        "id": "nodeDependencies",
        "name": "Node Dependencies"
      }]
    }
  }
}
```

### 2. Create Tree Data Provider

```typescript
import * as vscode from 'vscode';

// Define tree item
class Dependency extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly version: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${label} - ${version}`;
        this.description = version;
    }
}

// Implement provider
class DependencyProvider implements vscode.TreeDataProvider<Dependency> {
    // Required: Get children
    getChildren(element?: Dependency): Dependency[] {
        if (element) {
            // Return children of element
            return this.getDepsOf(element);
        } else {
            // Return root elements
            return this.getRootDeps();
        }
    }

    // Required: Convert to TreeItem
    getTreeItem(element: Dependency): vscode.TreeItem {
        return element;
    }

    private getRootDeps(): Dependency[] {
        return [
            new Dependency('lodash', '4.17.21', vscode.TreeItemCollapsibleState.None),
            new Dependency('express', '4.18.2', vscode.TreeItemCollapsibleState.Collapsed)
        ];
    }

    private getDepsOf(dep: Dependency): Dependency[] {
        if (dep.label === 'express') {
            return [
                new Dependency('body-parser', '1.20.0', vscode.TreeItemCollapsibleState.None)
            ];
        }
        return [];
    }
}
```

### 3. Register Provider

```typescript
export function activate(context: vscode.ExtensionContext) {
    const provider = new DependencyProvider();

    // Option 1: Simple registration
    vscode.window.registerTreeDataProvider('nodeDependencies', provider);

    // Option 2: With TreeView access (for programmatic control)
    const treeView = vscode.window.createTreeView('nodeDependencies', {
        treeDataProvider: provider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);
}
```

---

## Refreshing the Tree

```typescript
class DependencyProvider implements vscode.TreeDataProvider<Dependency> {
    // Event emitter for refresh
    private _onDidChangeTreeData = new vscode.EventEmitter<Dependency | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Call to refresh entire tree
    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    // Call to refresh specific item
    refreshItem(item: Dependency): void {
        this._onDidChangeTreeData.fire(item);
    }
}
```

---

## Tree Item Properties

```typescript
class MyTreeItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);

        // Display properties
        this.label = 'Item Name';
        this.description = 'secondary text';
        this.tooltip = 'Hover text';

        // Icon
        this.iconPath = new vscode.ThemeIcon('file');
        // Or: this.iconPath = vscode.Uri.file('/path/to/icon.svg');

        // Command on click
        this.command = {
            command: 'myext.openItem',
            title: 'Open Item',
            arguments: [this]
        };

        // Context value for menu when clauses
        this.contextValue = 'dependencyItem';

        // Resource for file-based items
        this.resourceUri = vscode.Uri.file('/path/to/file');
    }
}
```

---

## Collapsible States

```typescript
// No children
vscode.TreeItemCollapsibleState.None

// Has children, initially collapsed
vscode.TreeItemCollapsibleState.Collapsed

// Has children, initially expanded
vscode.TreeItemCollapsibleState.Expanded
```

---

## Tree View Actions

### View Title Actions

```json
{
  "contributes": {
    "menus": {
      "view/title": [{
        "command": "myext.refreshDeps",
        "when": "view == nodeDependencies",
        "group": "navigation"
      }]
    }
  }
}
```

### Item Context Menu

```json
{
  "contributes": {
    "menus": {
      "view/item/context": [{
        "command": "myext.deleteItem",
        "when": "view == nodeDependencies && viewItem == dependencyItem",
        "group": "inline"
      }, {
        "command": "myext.editItem",
        "when": "view == nodeDependencies",
        "group": "1_modification"
      }]
    }
  }
}
```

### Inline Actions

```json
{
  "view/item/context": [{
    "command": "myext.delete",
    "when": "view == nodeDependencies",
    "group": "inline"
  }]
}
```

---

## Custom View Container

Create a new Activity Bar section:

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "myExtExplorer",
        "title": "My Explorer",
        "icon": "resources/explorer.svg"
      }]
    },
    "views": {
      "myExtExplorer": [{
        "id": "myext.mainView",
        "name": "Main View"
      }, {
        "id": "myext.secondaryView",
        "name": "Secondary View"
      }]
    }
  }
}
```

---

## Welcome Content

Show helpful content when view is empty:

```json
{
  "contributes": {
    "viewsWelcome": [{
      "view": "nodeDependencies",
      "contents": "No dependencies found.\n[Open package.json](command:myext.openPackageJson)"
    }]
  }
}
```

---

## View Visibility

Control initial visibility:

```json
{
  "views": {
    "explorer": [{
      "id": "myView",
      "name": "My View",
      "visibility": "collapsed"
    }]
  }
}
```

Values: `visible`, `collapsed`, `hidden`

---

## TreeView API

```typescript
const treeView = vscode.window.createTreeView('myView', {
    treeDataProvider: provider,
    showCollapseAll: true,
    canSelectMany: true
});

// Reveal item
treeView.reveal(item, { select: true, focus: true, expand: true });

// Get selection
const selected = treeView.selection;

// Listen to selection changes
treeView.onDidChangeSelection(e => {
    console.log('Selected:', e.selection);
});

// Listen to visibility changes
treeView.onDidChangeVisibility(e => {
    if (e.visible) {
        // View became visible
    }
});

// Set title
treeView.title = 'Dependencies (3)';

// Set description
treeView.description = 'npm packages';

// Check visibility
const isVisible = treeView.visible;
```

---

## Drag and Drop

```typescript
class MyProvider implements vscode.TreeDataProvider<Item>, vscode.TreeDragAndDropController<Item> {
    dropMimeTypes = ['application/vnd.code.tree.myView'];
    dragMimeTypes = ['text/uri-list'];

    handleDrag(source: readonly Item[], dataTransfer: vscode.DataTransfer): void {
        dataTransfer.set('application/vnd.code.tree.myView',
            new vscode.DataTransferItem(source));
    }

    handleDrop(target: Item | undefined, dataTransfer: vscode.DataTransfer): void {
        const data = dataTransfer.get('application/vnd.code.tree.myView');
        if (data) {
            // Handle drop
        }
    }
}
```

---

## Complete Example

```typescript
import * as vscode from 'vscode';

class FileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly isDirectory: boolean,
        public readonly path: string
    ) {
        super(
            label,
            isDirectory
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );

        this.iconPath = new vscode.ThemeIcon(isDirectory ? 'folder' : 'file');
        this.contextValue = isDirectory ? 'folder' : 'file';

        if (!isDirectory) {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(path)]
            };
        }
    }
}

class FileExplorerProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<FileItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getChildren(element?: FileItem): FileItem[] {
        // Implementation
        return [];
    }

    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new FileExplorerProvider();

    const treeView = vscode.window.createTreeView('fileExplorer', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    context.subscriptions.push(
        treeView,
        vscode.commands.registerCommand('myext.refresh', () => provider.refresh())
    );
}
```
