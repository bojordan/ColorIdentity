import * as vscode from 'vscode';
import * as path from 'path';
import { readConfig } from './types';
import { generateColors, hashToHue, getThemeProfile } from './colorGenerator';
import { applyColors, resetColors } from './colorApplier';
import { showColorPicker } from './colorPicker';
import { clearSwatchCache } from './swatchGenerator';
import { extractThemeBaseHue } from './themeAnalyzer';

// ── Helpers ──────────────────────────────────────────────────────────────────

let statusBarItem: vscode.StatusBarItem;
let swatchDir: string;

function getWorkspaceName(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        return folders[0].name;
    }
    return undefined;
}

function getEffectiveHue(): number {
    const config = readConfig();

    // In harmonized mode with a stored offset, recompute from the current
    // theme's base hue so the color adapts when the theme changes.
    if (config.colorMode === 'harmonized' && config.harmonyOffset !== null) {
        const baseHue = extractThemeBaseHue();
        return ((baseHue + config.harmonyOffset) % 360 + 360) % 360;
    }

    if (config.hueOverride !== null) {
        return config.hueOverride;
    }
    const name = getWorkspaceName();
    return name ? hashToHue(name) : 0;
}

function updateStatusBar(): void {
    const config = readConfig();
    if (!config.enabled) {
        statusBarItem.text = '$(circle-slash) ColorIdentity';
        statusBarItem.tooltip = 'ColorIdentity is disabled';
    } else {
        const hue = getEffectiveHue();
        const isHarmony = config.colorMode === 'harmonized' && config.harmonyOffset !== null;
        const isAuto = config.hueOverride === null && !isHarmony;
        const source = isHarmony ? 'harmony' : isAuto ? 'auto' : 'override';
        statusBarItem.text = `$(symbol-color) ColorIdentity`;
        statusBarItem.tooltip = `Hue: ${hue}° (${source}) — Click to change`;
    }
}

async function applyIdentityColors(): Promise<void> {
    const config = readConfig();
    if (!config.enabled) {
        return;
    }

    const workspaceName = getWorkspaceName();
    if (!workspaceName) {
        return;
    }

    const themeKind = vscode.window.activeColorTheme.kind;
    const colors = generateColors(workspaceName, themeKind, config);
    await applyColors(colors);
    updateStatusBar();
}

/**
 * Persist the color selection. In harmonized mode with a known offset,
 * we store the offset (so it adapts on theme change) and also store the
 * current absolute hue as a fallback for when the theme base can't be
 * detected. When offset is undefined we clear it and just use hueOverride.
 */
async function persistColorSelection(
    hue: number | null,
    harmonyOffset?: number
): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('colorIdentity');
    await cfg.update('hueOverride', hue, vscode.ConfigurationTarget.Workspace);
    await cfg.update(
        'harmonyOffset',
        harmonyOffset ?? null,
        vscode.ConfigurationTarget.Workspace
    );
}

// ── Extension Lifecycle ──────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
    // Set up swatch cache directory in extension's global storage
    swatchDir = path.join(context.globalStorageUri.fsPath, 'swatches');

    // Status bar item — click to open color picker
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        50
    );
    statusBarItem.command = 'colorIdentity.chooseColor';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Apply colors on startup
    applyIdentityColors();

    // Command: Choose a color via quick pick
    context.subscriptions.push(
        vscode.commands.registerCommand('colorIdentity.chooseColor', async () => {
            const workspaceName = getWorkspaceName();
            if (!workspaceName) {
                vscode.window.showWarningMessage(
                    'ColorIdentity: No workspace folder is open.'
                );
                return;
            }

            const currentHue = getEffectiveHue();
            const themeKind = vscode.window.activeColorTheme.kind;
            const themeProfile = getThemeProfile(themeKind);
            const config = readConfig();
            const result = await showColorPicker(currentHue, themeProfile, swatchDir, config.colorMode);
            if (result === undefined) {
                return; // dismissed
            }

            await persistColorSelection(result.hue, result.harmonyOffset);
            // Config change listener will auto-apply
        })
    );

    // Command: Apply / re-apply colors
    context.subscriptions.push(
        vscode.commands.registerCommand('colorIdentity.applyColors', async () => {
            const config = readConfig();
            const workspaceName = getWorkspaceName();
            if (!workspaceName) {
                vscode.window.showWarningMessage(
                    'ColorIdentity: No workspace folder is open.'
                );
                return;
            }
            const themeKind = vscode.window.activeColorTheme.kind;
            const colors = generateColors(workspaceName, themeKind, config);
            await applyColors(colors);
            vscode.window.showInformationMessage('ColorIdentity: Colors applied.');
        })
    );

    // Command: Reset (remove) colors
    context.subscriptions.push(
        vscode.commands.registerCommand('colorIdentity.resetColors', async () => {
            await resetColors();
            vscode.window.showInformationMessage('ColorIdentity: Colors reset.');
            updateStatusBar();
        })
    );

    // Command: Refresh for current theme
    context.subscriptions.push(
        vscode.commands.registerCommand('colorIdentity.refreshColors', async () => {
            await applyIdentityColors();
            vscode.window.showInformationMessage(
                'ColorIdentity: Colors refreshed for current theme.'
            );
        })
    );

    // Re-apply when the theme kind changes (e.g., Dark → Light)
    context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme(() => {
            clearSwatchCache(swatchDir);
            setTimeout(() => applyIdentityColors(), 250);
        })
    );

    // Re-apply when configuration changes — covers both our own settings
    // AND the workbench color theme (which changes when switching between
    // themes of the same kind, e.g., Dark Modern → Dracula).
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('workbench.colorTheme')) {
                clearSwatchCache(swatchDir);
                setTimeout(() => applyIdentityColors(), 250);
            } else if (e.affectsConfiguration('colorIdentity')) {
                const config = readConfig();
                if (config.enabled) {
                    applyIdentityColors();
                } else {
                    resetColors();
                    updateStatusBar();
                }
            }
        })
    );
}

export function deactivate() {
    // Nothing to clean up — colors persist in workspace settings intentionally
}
