# ColorIdentity

**Theme-aware workspace coloring** — distinguish VS Code windows with colors that
harmonize with your active color theme.

Like [Peacock](https://marketplace.visualstudio.com/items?itemName=johnpapa.vscode-peacock),
ColorIdentity tints your title bar, activity bar, and status bar so you can tell
workspaces apart at a glance. Unlike Peacock, the colors are **derived from your
active theme**, so they always feel like they belong.

## How It Works

ColorIdentity operates in two modes: **simple** and **harmonized** (default).

### Simple Mode

1. Your workspace folder name is hashed to produce a **unique, deterministic hue**
2. The extension reads your current **theme kind** (Dark, Light, High Contrast)
3. Saturation and lightness are chosen to suit the theme kind — muted darks for
   dark themes, soft pastels for light themes, bold accents for HC
4. Colors are written to workspace-level `workbench.colorCustomizations`

### Harmonized Mode (default)

Harmonized mode goes further by analyzing your active theme's color palette:

1. The extension detects your theme's **base hue** — by reading non-managed color
   customizations or matching the theme name against a built-in heuristic table
2. The color picker presents suggestions organized by **color harmony** relative
   to your theme: analogous, complementary, triadic, and split-complementary
3. When you pick a color, the extension stores the **angular offset** from the
   theme's base hue (e.g., "analogous warm" = +25°, "complement" = +180°)
4. When you **switch themes**, the effective hue is automatically recalculated
   from the new theme's base hue + the stored offset — your harmony relationship
   carries over without reopening the picker

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type
**ColorIdentity**:

| Command                                        | Description                                |
| ---------------------------------------------- | ------------------------------------------ |
| **ColorIdentity: Choose Color…**              | Pick a color from named presets or enter a custom hue |
| **ColorIdentity: Apply Colors**               | Apply or re-apply identity colors          |
| **ColorIdentity: Reset Colors**               | Remove all identity colors from workspace  |
| **ColorIdentity: Refresh Colors for Current Theme** | Re-derive colors for the active theme |

### Color Picker

The **Choose Color…** command adapts to the current mode:

- **Simple mode** — shows 14 named presets (Red, Orange, Yellow, etc.) with
  accurate theme-aware swatches
- **Harmonized mode** — shows suggestions grouped by color harmony (Analogous,
  Complementary, Triadic, Split-Complementary), each calculated relative to your
  theme's base hue. The detected base hue is displayed at the top.

Both modes include:
- **Automatic** — reset to the hash-based hue derived from your workspace name
- **Custom Hue…** — enter any value from 0 to 360

### Status Bar

A **ColorIdentity** indicator appears in the status bar. It shows the current
hue and its source — `auto` (from workspace name), `override` (manual hue), or
`harmony` (offset from theme base). Click it to open the color picker.

## Settings

| Setting                              | Type           | Default        | Description                                              |
| ------------------------------------ | -------------- | -------------- | -------------------------------------------------------- |
| `colorIdentity.enabled`             | boolean        | `true`         | Auto-apply identity colors on workspace open             |
| `colorIdentity.colorMode`           | `"simple"` \| `"harmonized"` | `"harmonized"` | Color selection mode (see below) |
| `colorIdentity.affectTitleBar`      | boolean        | `true`         | Colorize the title bar                                   |
| `colorIdentity.affectActivityBar`   | boolean        | `true`         | Colorize the activity bar                                |
| `colorIdentity.affectStatusBar`     | boolean        | `true`         | Colorize the status bar                                  |
| `colorIdentity.affectTabBar`        | boolean        | `false`        | Colorize the editor tab bar background                   |
| `colorIdentity.saturationAdjustment`| number         | `0`            | Fine-tune saturation (-50 to +50)                        |
| `colorIdentity.lightnessAdjustment` | number         | `0`            | Fine-tune lightness (-30 to +30)                         |
| `colorIdentity.hueOverride`         | number \| null | `null`         | Fixed hue (0–360); null = automatic                      |
| `colorIdentity.harmonyOffset`       | number \| null | `null`         | Offset from theme base hue; set automatically by the picker in harmonized mode |

### How `hueOverride` and `harmonyOffset` interact

These two settings serve different purposes:

- **`hueOverride`** is a fixed, absolute hue (0–360). It doesn't change when you
  switch themes. Used in simple mode, for custom hue entries, or as a fallback
  when the theme's base hue can't be detected.

- **`harmonyOffset`** is a signed angular offset (-180 to +180) from the theme's
  base hue. It's set automatically when you pick a harmony-relative color (e.g.,
  "Complement" stores +180°). The effective hue is recalculated as
  `themeBaseHue + offset` every time colors are applied, so your chosen harmony
  relationship adapts when you switch themes.

Resolution order in harmonized mode:

1. If `harmonyOffset` is set → effective hue = `themeBaseHue + harmonyOffset`
2. Else if `hueOverride` is set → use it directly
3. Else → derive hue from workspace name hash

In simple mode, `harmonyOffset` is ignored — only `hueOverride` matters.

## Diagnostics

Open the **Output** panel (`Cmd+Shift+U`) and select the **ColorIdentity**
channel to see detailed logs every time colors are generated — including the
detected theme base hue, harmony offset, angular distance, saturation/lightness
adjustments, and the final applied hex values.

## Examples

**Same workspace, different themes — the harmony adapts:**

- Dracula (base ~260°) + complement → hue 80° (green-yellow)
- Nord (base ~210°) + complement → hue 30° (warm orange)
- The relationship stays "complement"; the actual color shifts to match

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
