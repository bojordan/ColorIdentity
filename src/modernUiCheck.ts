import * as vscode from 'vscode';

/**
 * VS Code 1.131 ships `workbench.experimental.modernUI` as an auto-enrolled
 * experiment. Its shell ignores the `titleBar.*`, `activityBar.*` and
 * `statusBar.*` color tokens, so ColorIdentity writes correct colors that
 * never render. Until VS Code exposes customization points for the new shell
 * (microsoft/vscode#325250), turning the setting off is the only fix.
 */
export const MODERN_UI_SETTING = 'workbench.experimental.modernUI';

const DISMISSED_STATE_KEY = 'colorIdentity.modernUiNoticeDismissed';

const TRACKING_ISSUE_URL = 'https://github.com/microsoft/vscode/issues/325250';

/** True when the modernUI experiment is currently switched on. */
export function isModernUiEnabled(): boolean {
    return vscode.workspace.getConfiguration().get<boolean>(MODERN_UI_SETTING, false);
}

/**
 * Whether the notice should be surfaced. Kept separate from the UI so the
 * decision can be tested without a live window.
 */
export function shouldNotifyModernUi(state: {
    modernUiEnabled: boolean;
    checkEnabled: boolean;
    dismissed: boolean;
}): boolean {
    return state.modernUiEnabled && state.checkEnabled && !state.dismissed;
}

/** Turn the experiment off in user settings. */
export async function disableModernUi(): Promise<void> {
    await vscode.workspace
        .getConfiguration()
        .update(MODERN_UI_SETTING, false, vscode.ConfigurationTarget.Global);
}

async function offerReload(): Promise<void> {
    const reload = await vscode.window.showInformationMessage(
        'ColorIdentity: Modern UI disabled. Reload the window to restore your colors.',
        'Reload Window'
    );
    if (reload === 'Reload Window') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
}

/**
 * Prompt to disable modernUI and apply the change if the user accepts.
 * Returns true when the setting was changed.
 */
export async function promptToDisableModernUi(
    context: vscode.ExtensionContext,
    { allowDismiss }: { allowDismiss: boolean }
): Promise<boolean> {
    const disableAction = 'Disable Modern UI';
    const learnMoreAction = 'Learn More';
    const dismissAction = "Don't Show Again";

    const actions = allowDismiss
        ? [disableAction, learnMoreAction, dismissAction]
        : [disableAction, learnMoreAction];

    const choice = await vscode.window.showWarningMessage(
        `ColorIdentity: VS Code's "${MODERN_UI_SETTING}" is enabled, which ignores the ` +
            'title bar, activity bar and status bar colors this extension applies. ' +
            'Disable it to restore your workspace colors.',
        ...actions
    );

    if (choice === disableAction) {
        await disableModernUi();
        await offerReload();
        return true;
    }

    if (choice === learnMoreAction) {
        await vscode.env.openExternal(vscode.Uri.parse(TRACKING_ISSUE_URL));
        return false;
    }

    if (choice === dismissAction) {
        await context.globalState.update(DISMISSED_STATE_KEY, true);
    }

    return false;
}

/**
 * Check the modernUI setting and, when it is on, offer to switch it off.
 * Silent when the setting is off, the check is disabled, or the user
 * previously dismissed the notice.
 */
export async function checkModernUi(context: vscode.ExtensionContext): Promise<void> {
    const checkEnabled = vscode.workspace
        .getConfiguration('colorIdentity')
        .get<boolean>('checkModernUI', true);

    const shouldNotify = shouldNotifyModernUi({
        modernUiEnabled: isModernUiEnabled(),
        checkEnabled,
        dismissed: context.globalState.get<boolean>(DISMISSED_STATE_KEY, false),
    });

    if (!shouldNotify) {
        return;
    }

    await promptToDisableModernUi(context, { allowDismiss: true });
}

/**
 * Entry point for the manual command — always prompts, and reports when
 * there is nothing to fix.
 */
export async function runModernUiCommand(
    context: vscode.ExtensionContext
): Promise<void> {
    if (!isModernUiEnabled()) {
        vscode.window.showInformationMessage(
            `ColorIdentity: "${MODERN_UI_SETTING}" is already off — colors should render normally.`
        );
        return;
    }

    // Clear a previous "Don't Show Again" so the automatic check resumes.
    await context.globalState.update(DISMISSED_STATE_KEY, false);
    await promptToDisableModernUi(context, { allowDismiss: false });
}
