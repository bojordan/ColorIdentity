import * as vscode from 'vscode';
import { hslToHex } from './colorGenerator';

export interface ColorPreset {
    label: string;
    hue: number;
    icon: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
    { label: 'Red',         hue: 0,   icon: '🔴' },
    { label: 'Orange',      hue: 30,  icon: '🟠' },
    { label: 'Yellow',      hue: 55,  icon: '🟡' },
    { label: 'Lime',        hue: 80,  icon: '🟢' },
    { label: 'Green',       hue: 120, icon: '🟢' },
    { label: 'Mint',        hue: 150, icon: '🟩' },
    { label: 'Teal',        hue: 175, icon: '🩵' },
    { label: 'Cyan',        hue: 190, icon: '🔵' },
    { label: 'Blue',        hue: 220, icon: '🔵' },
    { label: 'Indigo',      hue: 245, icon: '🟣' },
    { label: 'Purple',      hue: 270, icon: '🟣' },
    { label: 'Magenta',     hue: 300, icon: '🩷' },
    { label: 'Pink',        hue: 330, icon: '🩷' },
    { label: 'Rose',        hue: 350, icon: '🔴' },
];

/**
 * Show a quick pick with named color presets plus options for custom hue
 * and resetting to automatic. Returns the chosen hue or null to reset,
 * or undefined if the user dismissed the picker.
 */
export async function showColorPicker(
    currentHue: number
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

    // Named color presets with a swatch preview
    for (const preset of COLOR_PRESETS) {
        const swatch = hslToHex(preset.hue, 50, 50);
        items.push({
            label: `${preset.icon}  ${preset.label}`,
            description: `hue ${preset.hue}°`,
            detail: currentHue === preset.hue ? '$(check) Currently selected' : undefined,
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
