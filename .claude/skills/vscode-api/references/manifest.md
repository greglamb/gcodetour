# VS Code Extension Manifest (package.json)

Complete reference for the extension manifest file.

---

## Required Fields

```json
{
  "name": "my-extension",
  "version": "0.0.1",
  "publisher": "my-publisher",
  "engines": {
    "vscode": "^1.85.0"
  }
}
```

| Field | Description |
|-------|-------------|
| `name` | Extension identifier (lowercase, no spaces) |
| `version` | SemVer version (major.minor.patch) |
| `publisher` | Publisher ID from Marketplace |
| `engines.vscode` | Minimum VS Code version |

---

## Common Fields

```json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "description": "A helpful VS Code extension",
  "version": "1.0.0",
  "publisher": "my-publisher",
  "license": "MIT",
  "icon": "images/icon.png",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "keywords": ["utility", "productivity"],
  "main": "./out/extension.js",
  "activationEvents": [],
  "contributes": {}
}
```

---

## Display Fields

```json
{
  "displayName": "My Extension",
  "description": "Brief description of what it does",
  "icon": "images/icon.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  },
  "badges": [{
    "url": "https://img.shields.io/badge/build-passing-green",
    "href": "https://github.com/me/myext",
    "description": "Build Status"
  }],
  "preview": true,
  "qna": "marketplace"
}
```

| Field | Description |
|-------|-------------|
| `displayName` | User-friendly name |
| `description` | Short description |
| `icon` | 128x128 minimum PNG |
| `galleryBanner` | Marketplace header |
| `badges` | Status badges |
| `preview` | Mark as preview |
| `qna` | Q&A settings |

---

## Categories

```json
{
  "categories": [
    "Programming Languages",
    "Snippets",
    "Linters",
    "Themes",
    "Debuggers",
    "Formatters",
    "Keymaps",
    "SCM Providers",
    "Other",
    "Extension Packs",
    "Language Packs",
    "Data Science",
    "Machine Learning",
    "Visualization",
    "Notebooks",
    "Education",
    "Testing",
    "Chat"
  ]
}
```

---

## Entry Points

```json
{
  "main": "./out/extension.js",
  "browser": "./out/web/extension.js"
}
```

| Field | Description |
|-------|-------------|
| `main` | Desktop extension entry |
| `browser` | Web extension entry |

---

## Extension Dependencies

```json
{
  "extensionDependencies": [
    "publisher.otherExtension"
  ],
  "extensionPack": [
    "publisher.extension1",
    "publisher.extension2"
  ]
}
```

---

## Extension Kind (Remote)

```json
{
  "extensionKind": ["ui", "workspace"]
}
```

| Value | Description |
|-------|-------------|
| `ui` | Runs in UI/local side |
| `workspace` | Runs in workspace/remote side |

---

## Activation Events

```json
{
  "activationEvents": [
    "onLanguage:python",
    "onCommand:myext.activate",
    "onView:myext.treeView",
    "workspaceContains:**/package.json",
    "onStartupFinished"
  ]
}
```

See activation-events.md for complete list.

---

## Contributes Section

```json
{
  "contributes": {
    "commands": [],
    "menus": {},
    "configuration": {},
    "keybindings": [],
    "views": {},
    "viewsContainers": {},
    "languages": [],
    "grammars": [],
    "snippets": [],
    "themes": [],
    "debuggers": [],
    "taskDefinitions": [],
    "walkthroughs": []
  }
}
```

See contribution-points.md for details.

---

## Capabilities

```json
{
  "capabilities": {
    "untrustedWorkspaces": {
      "supported": "limited",
      "description": "Some features disabled",
      "restrictedConfigurations": ["myext.dangerousSetting"]
    },
    "virtualWorkspaces": {
      "supported": false,
      "description": "Requires file system access"
    }
  }
}
```

---

## Pricing (Marketplace)

```json
{
  "pricing": "Free",
  "sponsor": {
    "url": "https://github.com/sponsors/me"
  }
}
```

Values: `Free`, `Trial`

---

## Scripts

```json
{
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile",
    "test": "node ./out/test/runTest.js",
    "lint": "eslint src --ext ts",
    "package": "vsce package",
    "publish": "vsce publish"
  }
}
```

---

## Development Dependencies

```json
{
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^18.0.0",
    "typescript": "^5.3.0",
    "@vscode/vsce": "^2.22.0",
    "esbuild": "^0.19.0"
  }
}
```

---

## Complete Example

```json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "description": "A helpful VS Code extension",
  "version": "1.0.0",
  "publisher": "my-publisher",
  "license": "MIT",
  "icon": "images/icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/me/my-extension"
  },
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "keywords": ["utility", "productivity"],
  "main": "./out/extension.js",
  "activationEvents": [],
  "contributes": {
    "commands": [{
      "command": "myext.helloWorld",
      "title": "Hello World",
      "category": "My Extension"
    }],
    "configuration": {
      "title": "My Extension",
      "properties": {
        "myext.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable the extension"
        }
      }
    },
    "keybindings": [{
      "command": "myext.helloWorld",
      "key": "ctrl+shift+h",
      "mac": "cmd+shift+h"
    }]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^18.0.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Validation

Validate your manifest:

```bash
# Using vsce
npx vsce ls

# Check for issues
npx vsce package --no-dependencies
```

---

## Best Practices

1. **Keep engines.vscode updated** - Use lowest compatible version
2. **Use displayName** - More readable than name
3. **Add icon** - 128x128 PNG minimum
4. **Include repository** - For Marketplace links
5. **Use categories** - Improve discoverability
6. **Add keywords** - Up to 30 terms
7. **Keep description short** - ~100 characters
