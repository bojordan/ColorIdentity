import * as vscode from 'vscode';
import { hslToHex } from './colorGenerator';
import { generateColorSwatch } from './swatchGenerator';
import { ThemeProfile } from './types';

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

/**
 * Show a quick pick with named color presets that display accurate
 * theme-aware color swatches. Returns the chosen hue or null to reset,
 * or undefined if the user dismissed the picker.
 */
export async function showColorPicker(
    currentHue: number,
    themeProfile: ThemeProfile,
    swatchDir: string
): Promise<{ hue: number | null } | undefined> {
    type PickItem = vscode.QuickPickItem & { _hue?: number | null; _action?: string };

    const items: PickItem[] = [];

    // "Automatic" option to reset to hash-based hue
    items.push({
        label: '$(refresh) Automatic',
        description: 'Derive hue from workspace name',
        _hue: null,
    });

    items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });

    // Named color presets with accurate PNG swatches
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

    // Custom hue entry
    items.push({
        label: '$(edit) Custom Hue…',
        description: 'Enter a value from 0 to 360',
        _action: 'custom',
    });

    const picked = await vscode.window.showQuickPick(items, {
        title: 'Color Identity: Choose a Color',
        placeHolder: 'Pick a color for this workspace',
        matchOnDescription: true,
    });

    if (!picked) {
        return undefined;
    }

    if ((picked as PickItem)._action === 'custom') {
        const input = await vscode.window.showInputBox({
            title: 'Color Identity: Custom Hue',
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

    return { hue: (picked as PickItem)._hue ?? null };
}
