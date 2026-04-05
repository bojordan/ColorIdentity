# Color Identity

**Theme-aware workspace coloring** — distinguish VS Code windows with colors that
harmonize with your active color theme.

Like [Peacock](https://marketplace.visualstudio.com/items?itemName=johnpapa.vscode-peacock),
Color Identity tints your title bar, activity bar, and status bar so you can tell
workspaces apart at a glance. Unlike Peacock, the colors are **derived from your
active theme**, so they always feel like they belong.

## How It Works

1. Your workspace folder name is hashed to produce a **unique, deterministic hue**
2. The extension reads your current **theme kind** (Dark, Light, High Contrast)
3. Saturation and lightness are chosen to **harmonize with the theme** — muted
   darks for dark themes, soft pastels for light themes, bold accents for HC
4. Colors are written to workspace-level `workbench.colorCustomizations`
5. When you **switch themes**, colors automatically re-derive to match

The result: every workspace has a unique visual identity that always fits your
theme.

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type
**Color Identity**:

| Command                                        | Description                                |
| ---------------------------------------------- | ------------------------------------------ |
| **Color Identity: Apply Colors**               | Apply or re-apply identity colors          |
| **Color Identity: Reset Colors**               | Remove all identity colors from workspace  |
| **Color Identity: Refresh Colors for Current Theme** | Re-derive colors for the active theme |

## Settings

| Setting                              | Type      | Default | Description                                              |
| ------------------------------------ | --------- | ------- | -------------------------------------------------------- |
| `colorIdentity.enabled`             | boolean   | `true`  | Auto-apply identity colors on workspace open             |
| `colorIdentity.affectTitleBar`      | boolean   | `true`  | Colorize the title bar                                   |
| `colorIdentity.affectActivityBar`   | boolean   | `true`  | Colorize the activity bar                                |
| `colorIdentity.affectStatusBar`     | boolean   | `true`  | Colorize the status bar                                  |
| `colorIdentity.affectTabBar`        | boolean   | `false` | Colorize the editor tab bar background                   |
| `colorIdentity.saturationAdjustment`| number    | `0`     | Fine-tune saturation (-50 to +50)                        |
| `colorIdentity.lightnessAdjustment` | number    | `0`     | Fine-tune lightness (-30 to +30)                         |
| `colorIdentity.hueOverride`         | number \| null | `null`  | Override auto-detected hue (0–360); null = automatic |

## Examples

**Same workspace, different themes — the hue stays consistent, the tone adapts:**

- Dark theme → deep, muted navy
- Light theme → soft, pastel blue
- High contrast → bold, saturated blue

**Different workspaces, same theme — each gets a unique hue:**

- `my-api` → teal
- `my-frontend` → coral
- `my-docs` → lavender

## Development

See [`docs/vscode-extension-development.md`](docs/vscode-extension-development.md)
for a full guide to VS Code extension development.

### Quick Start

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode (recompile on save)
npm run watch

# Debug: press F5 in VS Code to launch Extension Development Host
```

## License

See [LICENSE](LICENSE).
