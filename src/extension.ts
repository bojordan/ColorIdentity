import * as vscode from 'vscode';
import { readConfig } from './types';
import { generateColors } from './colorGenerator';
import { applyColors, resetColors } from './colorApplier';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWorkspaceName(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        return folders[0].name;
    }
    return undefined;
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
}

// ── Extension Lifecycle ──────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
    // Apply colors on startup
    applyIdentityColors();

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
                }
            }
        })
    );
}

export function deactivate() {
    // Nothing to clean up — colors persist in workspace settings intentionally
}
