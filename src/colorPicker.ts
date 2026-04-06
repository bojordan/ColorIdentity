import * as vscode from 'vscode';
import { hslToHex } from './colorGenerator';
import { generateColorSwatch } from './swatchGenerator';
import { ColorMode, ThemeProfile } from './types';
import { extractThemeBaseHue, generateHarmonyGroups } from './themeAnalyzer';

export interface ColorPreset {
    label: string;
    hue: number;
}

export const COLOR_PRESETS: ColorPreset[] = [
    { label: 'Red',         hue: 0   },
    { label: 'Orange',      hue: 30  },
    { label: 'Yellow',      hue: 55  },
    { label: 'Lime',        hue: 80  },
    { label: 'Green',       hue: 120 },
    { label: 'Mint',        hue: 150 },
    { label: 'Teal',        hue: 175 },
    { label: 'Cyan',        hue: 190 },
    { label: 'Blue',        hue: 220 },
    { label: 'Indigo',      hue: 245 },
    { label: 'Purple',      hue: 270 },
    { label: 'Magenta',     hue: 300 },
    { label: 'Pink',        hue: 330 },
    { label: 'Rose',        hue: 350 },
];

/** Result from the color picker. */
export interface ColorPickResult {
    /** Absolute hue to set (or null to reset to automatic). */
    hue: number | null;
    /**
     * If set, this is the signed offset from the theme's base hue.
     * The extension should persist this so the color adapts on theme change.
     * Only meaningful when a theme base hue was detected.
     */
    harmonyOffset?: number;
}

/**
 * Show a quick pick with named color presets that display accurate
 * theme-aware color swatches. Returns the chosen hue or null to reset,
 * or undefined if the user dismissed the picker.
 */
export async function showColorPicker(
    currentHue: number,
    themeProfile: ThemeProfile,
    swatchDir: string,
    colorMode: ColorMode = 'simple'
): Promise<ColorPickResult | undefined> {
    if (colorMode === 'harmonized') {
        return showHarmonizedPicker(currentHue, themeProfile, swatchDir);
    }
    return showSimplePicker(currentHue, themeProfile, swatchDir);
}

// ── Simple Mode (original behavior) ────────────────────────────────────────

async function showSimplePicker(
    currentHue: number,
    themeProfile: ThemeProfile,
    swatchDir: string
): Promise<ColorPickResult | undefined> {
    type PickItem = vscode.QuickPickItem & { _hue?: number | null; _offset?: number; _action?: string };

    const items: PickItem[] = [];

    items.push({
        label: '$(refresh) Automatic',
        description: 'Derive hue from workspace name',
        _hue: null,
    });

    items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });

    for (const preset of COLOR_PRESETS) {
        const previewHex = hslToHex(
            preset.hue,
            themeProfile.baseSaturation,
            themeProfile.baseLightness
        );
        const swatchUri = generateColorSwatch(swatchDir, previewHex);

        items.push({
            label: preset.label,
            description: `hue ${preset.hue}°  ·  ${previewHex}`,
            detail: currentHue === preset.hue ? '$(check) Currently selected' : undefined,
            iconPath: swatchUri,
            _hue: preset.hue,
        });
    }

    items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });

    items.push({
        label: '$(edit) Custom Hue…',
        description: 'Enter a value from 0 to 360',
        _action: 'custom',
    });

    return pickAndResolve(items, currentHue);
}

// ── Harmonized Mode ─────────────────────────────────────────────────────────

async function showHarmonizedPicker(
    currentHue: number,
    themeProfile: ThemeProfile,
    swatchDir: string
): Promise<ColorPickResult | undefined> {
    type PickItem = vscode.QuickPickItem & { _hue?: number | null; _offset?: number; _action?: string };

    const themeBaseHue = extractThemeBaseHue();
    const groups = generateHarmonyGroups(themeBaseHue, themeProfile);

    const items: PickItem[] = [];

    items.push({
        label: '$(refresh) Automatic',
        description: 'Derive hue from workspace name',
        _hue: null,
    });

    items.push({
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
    });
    items.push({
        label: `$(info) Theme base hue: ${themeBaseHue}°`,
        description: 'Colors will adapt when you change themes',
        _action: 'info',
    });

    for (const group of groups) {
        items.push({
            label: group.label,
            kind: vscode.QuickPickItemKind.Separator,
        });

        for (const suggestion of group.hues) {
            const previewHex = hslToHex(
                suggestion.hue,
                themeProfile.baseSaturation,
                themeProfile.baseLightness
            );
            const swatchUri = generateColorSwatch(swatchDir, previewHex);

            items.push({
                label: suggestion.label,
                description: `hue ${suggestion.hue}°  ·  ${previewHex}  ·  ${suggestion.reason}`,
                detail: currentHue === suggestion.hue ? '$(check) Currently selected' : undefined,
                iconPath: swatchUri,
                _hue: suggestion.hue,
                _offset: suggestion.offset,
            });
        }
    }

    items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });

    items.push({
        label: '$(edit) Custom Hue…',
        description: 'Enter a value from 0 to 360',
        _action: 'custom',
    });

    return pickAndResolve(items, currentHue);
}

// ── Shared picker logic ─────────────────────────────────────────────────────

type PickItem = vscode.QuickPickItem & {
    _hue?: number | null;
    _offset?: number;
    _action?: string;
};

async function pickAndResolve(
    items: PickItem[],
    currentHue: number
): Promise<ColorPickResult | undefined> {
    const picked = await vscode.window.showQuickPick(items, {
        title: 'ColorIdentity: Choose a Color',
        placeHolder: 'Pick a color for this workspace',
        matchOnDescription: true,
    });

    if (!picked) {
        return undefined;
    }

    const item = picked as PickItem;

    if (item._action === 'info') {
        return undefined; // non-actionable info row
    }

    if (item._action === 'custom') {
        const input = await vscode.window.showInputBox({
            title: 'ColorIdentity: Custom Hue',
            prompt: 'Enter a hue value (0 = red, 120 = green, 240 = blue)',
            value: String(currentHue),
            validateInput: (value) => {
                const n = Number(value);
                if (isNaN(n) || n < 0 || n > 360) {
                    return 'Please enter a number between 0 and 360';
                }
                return undefined;
            },
        });
        if (input === undefined) {
            return undefined;
        }
        return { hue: Number(input) };
    }

    return {
        hue: item._hue ?? null,
        harmonyOffset: item._offset,
    };
}
