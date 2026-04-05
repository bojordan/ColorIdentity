import * as vscode from 'vscode';
import { readConfig } from './types';
import { generateColors, hashToHue } from './colorGenerator';
import { applyColors, resetColors } from './colorApplier';
import { showColorPicker } from './colorPicker';

// ── Helpers ──────────────────────────────────────────────────────────────────

let statusBarItem: vscode.StatusBarItem;

function getWorkspaceName(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        return folders[0].name;
    }
    return undefined;
}

function getEffectiveHue(): number {
    const config = readConfig();
    if (config.hueOverride !== null) {
        return config.hueOverride;
    }
    const name = getWorkspaceName();
    return name ? hashToHue(name) : 0;
}

function updateStatusBar(): void {
    const config = readConfig();
    if (!config.enabled) {
        statusBarItem.text = '$(circle-slash) Color Identity';
        statusBarItem.tooltip = 'Color Identity is disabled';
    } else {
        const hue = getEffectiveHue();
        const isAuto = config.hueOverride === null;
        statusBarItem.text = `$(symbol-color) Color Identity`;
        statusBarItem.tooltip = `Hue: ${hue}° (${isAuto ? 'auto' : 'override'}) — Click to change`;
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

async function setHueOverride(hue: number | null): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('colorIdentity');
    await cfg.update('hueOverride', hue, vscode.ConfigurationTarget.Workspace);
}

// ── Extension Lifecycle ──────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
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
                    'Color Identity: No workspace folder is open.'
                );
                return;
            }

            const currentHue = getEffectiveHue();
            const result = await showColorPicker(currentHue);
            if (result === undefined) {
                return; // dismissed
            }

            await setHueOverride(result.hue);
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
                    'Color Identity: No workspace folder is open.'
                );
                return;
            }
            const themeKind = vscode.window.activeColorTheme.kind;
            const colors = generateColors(workspaceName, themeKind, config);
            await applyColors(colors);
            vscode.window.showInformationMessage('Color Identity: Colors applied.');
        })
    );

    // Command: Reset (remove) colors
    context.subscriptions.push(
        vscode.commands.registerCommand('colorIdentity.resetColors', async () => {
            await resetColors();
            vscode.window.showInformationMessage('Color Identity: Colors reset.');
            updateStatusBar();
        })
    );

    // Command: Refresh for current theme
    context.subscriptions.push(
        vscode.commands.registerCommand('colorIdentity.refreshColors', async () => {
            await applyIdentityColors();
            vscode.window.showInformationMessage(
                'Color Identity: Colors refreshed for current theme.'
            );
        })
    );

    // Re-apply when the user changes their color theme
    context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme(() => {
            applyIdentityColors();
        })
    );

    // Re-apply when our configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('colorIdentity')) {
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
