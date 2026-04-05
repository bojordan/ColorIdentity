import * as vscode from 'vscode';
import { WorkspaceColors } from './types';

/**
 * Keys we manage — used to identify our customizations so we can
 * cleanly add / remove them without clobbering other extensions' settings.
 */
const MANAGED_KEYS: readonly (keyof WorkspaceColors)[] = [
    'titleBarActiveBackground',
    'titleBarActiveForeground',
    'titleBarInactiveBackground',
    'titleBarInactiveForeground',
    'activityBarBackground',
    'activityBarForeground',
    'activityBarActiveBorder',
    'statusBarBackground',
    'statusBarForeground',
    'tabsBackground',
];

/** Map our camelCase property names to the VS Code dotted keys. */
const KEY_MAP: Record<keyof WorkspaceColors, string> = {
    titleBarActiveBackground: 'titleBar.activeBackground',
    titleBarActiveForeground: 'titleBar.activeForeground',
    titleBarInactiveBackground: 'titleBar.inactiveBackground',
    titleBarInactiveForeground: 'titleBar.inactiveForeground',
    activityBarBackground: 'activityBar.background',
    activityBarForeground: 'activityBar.foreground',
    activityBarActiveBorder: 'activityBar.activeBorder',
    statusBarBackground: 'statusBar.background',
    statusBarForeground: 'statusBar.foreground',
    tabsBackground: 'editorGroupHeader.tabsBackground',
};

/**
 * Apply the given colors to the workspace's `workbench.colorCustomizations`.
 * Merges with existing customizations so other extensions' settings are preserved.
 */
export async function applyColors(colors: WorkspaceColors): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const existing = config.get<Record<string, string>>(
        'workbench.colorCustomizations'
    ) ?? {};

    const updated = { ...existing };

    for (const key of MANAGED_KEYS) {
        const vscodeKey = KEY_MAP[key];
        const value = colors[key];
        if (value !== undefined) {
            updated[vscodeKey] = value;
        } else {
            // If the color isn't set (element not affected), remove our old value
            delete updated[vscodeKey];
        }
    }

    await config.update(
        'workbench.colorCustomizations',
        Object.keys(updated).length > 0 ? updated : undefined,
        vscode.ConfigurationTarget.Workspace
    );
}

/**
 * Remove all ColorIdentity-managed keys from `workbench.colorCustomizations`.
 */
export async function resetColors(): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const existing = config.get<Record<string, string>>(
        'workbench.colorCustomizations'
    ) ?? {};

    const updated = { ...existing };

    for (const key of MANAGED_KEYS) {
        delete updated[KEY_MAP[key]];
    }

    await config.update(
        'workbench.colorCustomizations',
        Object.keys(updated).length > 0 ? updated : undefined,
        vscode.ConfigurationTarget.Workspace
    );
}
