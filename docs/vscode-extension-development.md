# VS Code Extension Development Guide

A beginner-friendly guide to developing Visual Studio Code extensions, written for
the **ColorIdentity** project. Everything here applies to VS Code extensions in
general, with call-outs specific to our use case where relevant.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Scaffolding a New Extension](#2-scaffolding-a-new-extension)
3. [Project Structure](#3-project-structure)
4. [Key Files Explained](#4-key-files-explained)
5. [Development Workflow](#5-development-workflow)
6. [Core VS Code APIs](#6-core-vs-code-apis)
7. [How Workspace Color Customization Works](#7-how-workspace-color-customization-works)
8. [Testing](#8-testing)
9. [Packaging & Publishing](#9-packaging--publishing)
10. [Useful References](#10-useful-references)

---

## 1. Prerequisites

| Tool     | Version  | Purpose                                    |
| -------- | -------- | ------------------------------------------ |
| Node.js  | ≥ 18 LTS | Runtime for the extension and build tools  |
| npm      | ≥ 9      | Package manager (comes with Node)          |
| Git      | any      | Version control                            |
| VS Code  | ≥ 1.85   | The editor we're extending                 |

Verify your setup:

```bash
node -v    # e.g. v20.11.0
npm -v     # e.g. 10.2.4
git --version
code --version
```

---

## 2. Scaffolding a New Extension

The official way to create a new extension is with the **Yeoman** generator:

```bash
# One-shot (no global install required)
npx --package yo --package generator-code -- yo code
```

The generator will walk you through several prompts:

| Prompt                       | Recommended Choice                  |
| ---------------------------- | ----------------------------------- |
| What type of extension?      | **New Extension (TypeScript)**      |
| Extension name               | `color-identity`                    |
| Identifier                   | `color-identity`                    |
| Description                  | *your description*                  |
| Initialize git repo?         | **Yes**                             |
| Bundle with webpack/esbuild? | **esbuild** (fast, modern)          |
| Package manager              | **npm**                             |

After scaffolding, open the project:

```bash
cd color-identity
code .
```

---

## 3. Project Structure

A typical TypeScript-based VS Code extension looks like this:

```
color-identity/
├── .vscode/
│   ├── launch.json          # Debug configurations (F5 to launch)
│   └── tasks.json           # Build tasks
├── src/
│   ├── extension.ts         # Main entry point (activate / deactivate)
│   ├── colorGenerator.ts    # HSL color generation & workspace-name hashing
│   ├── colorApplier.ts      # Reads/writes workbench.colorCustomizations
│   ├── colorPicker.ts       # Quick pick UI with named presets
│   ├── swatchGenerator.ts   # Runtime PNG swatch generation for picker icons
│   ├── types.ts             # Shared interfaces & config reader
│   └── test/                # Extension tests
├── docs/                     # Project documentation
├── out/                      # Compiled JavaScript (gitignored)
├── node_modules/             # Dependencies (gitignored)
├── package.json              # Extension manifest + metadata
├── tsconfig.json             # TypeScript compiler options
├── .vscodeignore             # Files to exclude from the packaged .vsix
├── .gitignore
├── README.md
└── LICENSE
```

---

## 4. Key Files Explained

### `package.json` — The Extension Manifest

This is the most important file. It tells VS Code everything about your extension:
what it does, when to activate it, which commands it provides, and what settings it
contributes.

```jsonc
{
  "name": "color-identity",
  "displayName": "Color Identity",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.85.0"          // Minimum VS Code version
  },

  // When the extension should be loaded into memory
  "activationEvents": [
    "onStartupFinished"          // Load after VS Code finishes starting
  ],

  // What the extension contributes to the editor
  "contributes": {
    "commands": [
      {
        "command": "colorIdentity.chooseColor",
        "title": "Color Identity: Choose Color…"
      },
      {
        "command": "colorIdentity.applyColors",
        "title": "Color Identity: Apply Colors"
      },
      {
        "command": "colorIdentity.resetColors",
        "title": "Color Identity: Reset Colors"
      },
      {
        "command": "colorIdentity.refreshColors",
        "title": "Color Identity: Refresh Colors for Current Theme"
      }
    ],
    "configuration": {
      "title": "Color Identity",
      "properties": {
        "colorIdentity.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable automatic workspace coloring."
        }
      }
    }
  },

  "main": "./out/extension.js"   // Compiled entry point
}
```

**Key sections:**

- **`activationEvents`** — Controls *when* VS Code loads your extension. Common
  events: `onStartupFinished`, `onCommand:yourCommand`, `workspaceContains:`.
  Using `onStartupFinished` is ideal for an extension like ours that needs to
  apply colors as soon as the editor is ready.

- **`contributes.commands`** — Registers commands that appear in the Command
  Palette (`Ctrl+Shift+P`). Each command needs a handler registered in code.

- **`contributes.configuration`** — Declares settings that users can configure.
  These appear in the Settings UI and can be read programmatically.

### `src/extension.ts` — The Entry Point

Every VS Code extension must export two functions:

```typescript
import * as vscode from 'vscode';

// Called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('ColorIdentity is now active');

    // Register command handlers
    const applyCmd = vscode.commands.registerCommand(
        'colorIdentity.applyColors',
        () => {
            // Implementation here
        }
    );

    context.subscriptions.push(applyCmd);
}

// Called when your extension is deactivated
export function deactivate() {
    // Clean up resources if needed
}
```

**Important concepts:**

- **`ExtensionContext`** — Provided by VS Code; gives you access to extension
  storage, subscriptions (for cleanup), and secrets.
- **`context.subscriptions`** — An array of `Disposable` objects. Push your
  commands, event listeners, etc. here so VS Code can clean them up when the
  extension deactivates.

### `tsconfig.json`

Standard TypeScript configuration. The generator sets sensible defaults. Key
settings:

```jsonc
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "outDir": "out",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

### `.vscode/launch.json`

Pre-configured debug profile. Press **F5** and VS Code will:

1. Compile your TypeScript
2. Launch a new VS Code window (the "Extension Development Host")
3. Load your extension into that window
4. Attach the debugger — breakpoints work!

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "npm: watch"
    }
  ]
}
```

---

## 5. Development Workflow

### Day-to-Day Loop

```
 ┌─────────────────────────────────────────────────┐
 │  1. Edit source in src/                         │
 │  2. Press F5 → launches Extension Dev Host      │
 │  3. Test your extension in the new window       │
 │  4. Set breakpoints, inspect variables          │
 │  5. Ctrl+Shift+P → run your commands            │
 │  6. Make changes → Ctrl+Shift+F5 to reload      │
 └─────────────────────────────────────────────────┘
```

### Continuous Compilation

Start the TypeScript watcher so your code compiles on save:

```bash
npm run watch
```

This runs `tsc -watch` (or the esbuild equivalent) in the background.

### Debugging Tips

- **Console output** — Use `console.log()` and view output in the Debug Console
  panel of the *host* VS Code window (not the Extension Development Host).
- **Breakpoints** — Set them in `.ts` files; source maps make this work
  seamlessly.
- **Reload** — After code changes, press `Ctrl+Shift+F5` (or use the Command
  Palette: "Developer: Reload Window") in the Extension Development Host.

---

## 6. Core VS Code APIs

These are the APIs most relevant to our extension:

### Reading Configuration

```typescript
const config = vscode.workspace.getConfiguration('colorIdentity');
const isEnabled = config.get<boolean>('enabled', true);
```

### Writing Workspace Settings

This is the key API that Peacock (and our extension) uses. You can
programmatically update `workbench.colorCustomizations` in workspace settings:

```typescript
const config = vscode.workspace.getConfiguration();

// Read existing customizations (don't clobber other extensions' settings)
const existing = config.get<Record<string, string>>(
    'workbench.colorCustomizations'
) ?? {};

// Merge in our colors
const updated = {
    ...existing,
    'titleBar.activeBackground': '#1a3a5c',
    'titleBar.activeForeground': '#ffffff',
    'activityBar.background': '#1a3a5c',
    'statusBar.background': '#15304d',
};

// Write to workspace settings (.vscode/settings.json)
await config.update(
    'workbench.colorCustomizations',
    updated,
    vscode.ConfigurationTarget.Workspace
);
```

**Configuration targets:**

| Target                    | Writes to                         |
| ------------------------- | --------------------------------- |
| `Global`                  | User-level `settings.json`        |
| `Workspace`               | `.vscode/settings.json`           |
| `WorkspaceFolder`         | Folder-level settings (multi-root)|

For our extension, **`Workspace`** is the right choice — each workspace gets its
own identity color without affecting the global user settings.

### Active Color Theme

```typescript
const theme = vscode.window.activeColorTheme;

// theme.kind values:
//   ColorThemeKind.Light          = 1
//   ColorThemeKind.Dark           = 2
//   ColorThemeKind.HighContrast   = 3
//   ColorThemeKind.HighContrastLight = 4

// Listen for theme changes
vscode.window.onDidChangeActiveColorTheme((newTheme) => {
    // Re-apply colors tuned to the new theme
});
```

> **Note:** The API exposes the theme *kind* (dark/light/high-contrast) but does
> not expose the actual RGB values of theme colors at runtime. To work with the
> theme's actual palette, you'd need to read the theme's JSON file from disk or
> use heuristics based on the theme kind.

### Workspace Information

```typescript
// Get the workspace folder name (useful for deterministic hashing)
const folders = vscode.workspace.workspaceFolders;
if (folders && folders.length > 0) {
    const workspaceName = folders[0].name;  // e.g. "my-project"
    const workspacePath = folders[0].uri.fsPath;
}
```

### Registering Commands

```typescript
const disposable = vscode.commands.registerCommand(
    'colorIdentity.applyColors',
    async () => {
        // Command implementation
        vscode.window.showInformationMessage('Colors applied!');
    }
);
context.subscriptions.push(disposable);
```

### Status Bar Items

```typescript
const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    50
);
statusBarItem.text = '$(symbol-color) Color Identity';
statusBarItem.tooltip = 'Hue: 120° (auto) — Click to change';
statusBarItem.command = 'colorIdentity.chooseColor';
statusBarItem.show();
context.subscriptions.push(statusBarItem);
```

### Quick Pick with Custom Icons

The VS Code `QuickPick` API supports an `iconPath` property on items. While SVG
data URIs and ThemeIcon colors are not supported, **PNG files on disk retain
their color**. This is the technique ColorIdentity uses for its color picker:

```typescript
// Generate a solid-color PNG swatch at runtime
import * as zlib from 'zlib';

function createSolidPng(hex: string, size: number): Buffer {
    // Build raw RGBA pixel data, compress with zlib, assemble PNG chunks
    // (IHDR → IDAT → IEND) with proper CRC-32 checksums
    // See src/swatchGenerator.ts for the full implementation
}

// Use the PNG as a QuickPickItem icon
const items: vscode.QuickPickItem[] = [{
    label: 'Green',
    description: 'hue 120° · #2a4a2f',
    iconPath: vscode.Uri.file('/path/to/swatch-2a4a2f.png'),
}];
```

Swatches are cached in `context.globalStorageUri` and regenerated when the
theme changes (since the same hue produces different colors per theme profile).

> **Tip:** This zero-dependency PNG approach avoids needing image libraries.
> Node's built-in `zlib.deflateSync` handles the DEFLATE compression required
> by the PNG spec.

---

## 7. How Workspace Color Customization Works

This is the core mechanism that powers Peacock-like extensions:

### The Color Keys

VS Code exposes these UI elements for color customization:

```
Title Bar:
  titleBar.activeBackground
  titleBar.activeForeground
  titleBar.inactiveBackground
  titleBar.inactiveForeground

Activity Bar (left sidebar icons):
  activityBar.background
  activityBar.foreground
  activityBar.activeBorder

Status Bar (bottom bar):
  statusBar.background
  statusBar.foreground

Additional elements:
  sideBar.border
  panel.border
  tab.activeBorderTop
  editorGroupHeader.tabsBackground
```

A full list is available at:
https://code.visualstudio.com/api/references/theme-color

### The Approach: Peacock vs. ColorIdentity

**Peacock's approach:**
- User picks an arbitrary color (e.g., bright green `#00ff00`)
- That color is applied as-is to the title bar, activity bar, status bar
- Works great for distinction, but can clash with the user's theme

**ColorIdentity's approach (our extension):**
- Hash the workspace name to get a deterministic hue (0–360°)
- Read the active theme kind (dark/light/high-contrast)
- Generate colors that harmonize with the theme:
  - **Dark theme** → muted, low-saturation accents with dark lightness
  - **Light theme** → soft, pastel-range accents with light lightness
  - **High contrast** → bolder accents within accessible contrast ranges
- Apply the generated colors to workspace settings
- When the user changes themes, automatically re-derive colors

This means the color always "fits" the theme while still providing a unique
visual identity per workspace.

### Color Generation Strategy

Using HSL (Hue, Saturation, Lightness) color space:

```
Hue:        Deterministic from workspace name hash (0–360°)
Saturation: Tuned to theme kind (e.g., 30–50% for dark, 20–40% for light)
Lightness:  Tuned to theme kind (e.g., 20–30% for dark, 85–92% for light)
```

This ensures:
- Each workspace gets a **unique hue** (distinction)
- Colors are always **appropriate for the theme** (harmony)
- Foreground colors maintain **readable contrast** (accessibility)

---

## 8. Testing

### Unit Tests

The scaffolded project includes a test setup. Tests run in a special VS Code
instance:

```bash
npm run test
```

Tests live in `src/test/` and use the `@vscode/test-electron` package to launch
a headless VS Code instance.

Example test:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Extension should be present', () => {
        const ext = vscode.extensions.getExtension('yourPublisher.color-identity');
        assert.ok(ext);
    });

    test('Should activate without error', async () => {
        const ext = vscode.extensions.getExtension('yourPublisher.color-identity');
        await ext?.activate();
        assert.ok(ext?.isActive);
    });
});
```

### Manual Testing

1. Press **F5** to launch the Extension Development Host
2. Open a workspace/folder in the dev host
3. Open the Command Palette (`Ctrl+Shift+P`)
4. Run your extension's commands
5. Verify the title bar / status bar / activity bar colors change
6. Switch color themes and verify colors re-adapt

---

## 9. Packaging & Publishing

### Install the VS Code Extension CLI

```bash
npm install -g @vscode/vsce
```

### Package into a `.vsix`

```bash
vsce package
```

This creates a `.vsix` file you can share or install locally:

```bash
code --install-extension color-identity-0.1.0.vsix
```

### Publish to the Marketplace

1. Create a publisher account at https://marketplace.visualstudio.com/manage
2. Get a Personal Access Token (PAT) from Azure DevOps
3. Log in and publish:

```bash
vsce login <publisher-name>
vsce publish
```

Your extension will then be installable by anyone via the Extensions sidebar in
VS Code.

---

## 10. Useful References

| Resource                                   | URL                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------- |
| Official "Your First Extension" tutorial   | https://code.visualstudio.com/api/get-started/your-first-extension  |
| Extension API reference                    | https://code.visualstudio.com/api/references/vscode-api             |
| Theme color reference (all color keys)     | https://code.visualstudio.com/api/references/theme-color            |
| Color theme extension guide                | https://code.visualstudio.com/api/extension-guides/color-theme      |
| Extension samples (GitHub)                 | https://github.com/microsoft/vscode-extension-samples               |
| Peacock source (inspiration)               | https://github.com/johnpapa/vscode-peacock                          |
| Publishing extensions                      | https://code.visualstudio.com/api/working-with-extensions/publishing-extension |
| Extension Manifest (`package.json`) ref    | https://code.visualstudio.com/api/references/extension-manifest     |

---

## Quick-Start Cheat Sheet

```bash
# Scaffold
npx --package yo --package generator-code -- yo code

# Install dependencies
npm install

# Start watching for changes
npm run watch

# Debug: press F5 in VS Code

# Run tests
npm run test

# Package
npx @vscode/vsce package

# Install locally
code --install-extension *.vsix
```
