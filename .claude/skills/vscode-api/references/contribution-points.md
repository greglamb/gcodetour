# VS Code Contribution Points Reference

JSON declarations in package.json `contributes` field that extend VS Code.

---

## Commands

Define commands for the Command Palette.

```json
{
  "contributes": {
    "commands": [{
      "command": "ext.sayHello",
      "title": "Hello World",
      "category": "Greetings",
      "icon": "$(megaphone)"
    }]
  }
}
```

| Property | Description |
|----------|-------------|
| `command` | Unique identifier |
| `title` | Display name |
| `category` | Optional grouping prefix |
| `icon` | ThemeIcon or path |
| `enablement` | When clause for enabled state |

---

## Menus

Place commands in context menus and UI locations.

```json
{
  "contributes": {
    "menus": {
      "editor/context": [{
        "command": "ext.format",
        "when": "editorHasSelection",
        "group": "modification"
      }],
      "explorer/context": [{
        "command": "ext.openFile",
        "when": "resourceExtname == .json"
      }],
      "commandPalette": [{
        "command": "ext.internal",
        "when": "false"
      }]
    }
  }
}
```

**Menu Locations:**
- `editor/context` - Editor right-click
- `editor/title` - Editor title bar
- `explorer/context` - File explorer right-click
- `view/title` - View header
- `view/item/context` - Tree item right-click
- `commandPalette` - Command Palette visibility
- `debug/callstack/context` - Debug call stack

---

## Configuration

Expose user-configurable settings.

```json
{
  "contributes": {
    "configuration": {
      "title": "My Extension",
      "properties": {
        "myext.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable the extension"
        },
        "myext.count": {
          "type": "integer",
          "default": 5,
          "minimum": 1,
          "maximum": 100
        },
        "myext.format": {
          "type": "string",
          "default": "json",
          "enum": ["json", "yaml", "xml"],
          "enumDescriptions": ["JSON format", "YAML format", "XML format"]
        }
      }
    }
  }
}
```

**Scopes:** `application`, `machine`, `window`, `resource`, `language-overridable`

---

## Keybindings

Define keyboard shortcuts.

```json
{
  "contributes": {
    "keybindings": [{
      "command": "ext.format",
      "key": "ctrl+shift+f",
      "mac": "cmd+shift+f",
      "when": "editorTextFocus"
    }]
  }
}
```

---

## Views

Add tree views to the sidebar.

```json
{
  "contributes": {
    "views": {
      "explorer": [{
        "id": "myext.dependencies",
        "name": "Dependencies",
        "when": "workspaceHasPackageJSON"
      }]
    }
  }
}
```

---

## Views Containers

Create custom Activity Bar or Panel containers.

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "myext-explorer",
        "title": "My Explorer",
        "icon": "resources/icon.svg"
      }]
    },
    "views": {
      "myext-explorer": [{
        "id": "myext.mainView",
        "name": "Main View"
      }]
    }
  }
}
```

---

## Languages

Register new languages.

```json
{
  "contributes": {
    "languages": [{
      "id": "myLang",
      "aliases": ["My Language", "mylang"],
      "extensions": [".ml", ".mylang"],
      "configuration": "./language-configuration.json"
    }]
  }
}
```

---

## Grammars

Provide TextMate syntax highlighting.

```json
{
  "contributes": {
    "grammars": [{
      "language": "myLang",
      "scopeName": "source.mylang",
      "path": "./syntaxes/mylang.tmLanguage.json"
    }]
  }
}
```

---

## Snippets

Contribute code snippets.

```json
{
  "contributes": {
    "snippets": [{
      "language": "javascript",
      "path": "./snippets/javascript.json"
    }]
  }
}
```

---

## Themes

Contribute color themes.

```json
{
  "contributes": {
    "themes": [{
      "label": "My Dark Theme",
      "uiTheme": "vs-dark",
      "path": "./themes/my-dark.json"
    }]
  }
}
```

---

## Custom Editors

Register custom editors.

```json
{
  "contributes": {
    "customEditors": [{
      "viewType": "myext.imageViewer",
      "displayName": "Image Viewer",
      "selector": [{
        "filenamePattern": "*.{png,jpg,gif}"
      }],
      "priority": "default"
    }]
  }
}
```

---

## Debuggers

Contribute debug adapters.

```json
{
  "contributes": {
    "debuggers": [{
      "type": "myDebugger",
      "label": "My Debugger",
      "program": "./out/debugAdapter.js",
      "runtime": "node",
      "languages": ["javascript"]
    }]
  }
}
```

---

## Task Definitions

Define task types.

```json
{
  "contributes": {
    "taskDefinitions": [{
      "type": "mytask",
      "required": ["task"],
      "properties": {
        "task": {
          "type": "string",
          "description": "The task name"
        }
      }
    }]
  }
}
```

---

## Walkthroughs

Create onboarding guides.

```json
{
  "contributes": {
    "walkthroughs": [{
      "id": "myext.welcome",
      "title": "Getting Started",
      "description": "Learn how to use My Extension",
      "steps": [{
        "id": "openSettings",
        "title": "Open Settings",
        "description": "Configure the extension...",
        "media": { "image": "media/settings.png" },
        "completionEvents": ["onSettingsOpened"]
      }]
    }]
  }
}
```

---

## All Contribution Points

| Point | Purpose |
|-------|---------|
| `authentication` | Auth providers |
| `breakpoints` | Language breakpoints |
| `colors` | Themable colors |
| `commands` | Command definitions |
| `configuration` | Settings |
| `configurationDefaults` | Setting defaults |
| `customEditors` | Custom editors |
| `debuggers` | Debug adapters |
| `grammars` | TextMate grammars |
| `icons` | Custom icons |
| `iconThemes` | File icon themes |
| `jsonValidation` | JSON schema validation |
| `keybindings` | Keyboard shortcuts |
| `languages` | Language registration |
| `menus` | Menu items |
| `problemMatchers` | Output parsers |
| `problemPatterns` | Reusable patterns |
| `productIconThemes` | UI icon themes |
| `resourceLabelFormatters` | URI formatting |
| `semanticTokenModifiers` | Token modifiers |
| `semanticTokenScopes` | Token scopes |
| `semanticTokenTypes` | Token types |
| `snippets` | Code snippets |
| `submenus` | Nested menus |
| `taskDefinitions` | Task types |
| `terminal` | Terminal profiles |
| `themes` | Color themes |
| `typescriptServerPlugins` | TS plugins |
| `views` | Tree views |
| `viewsContainers` | View containers |
| `viewsWelcome` | Welcome content |
| `walkthroughs` | Onboarding guides |
