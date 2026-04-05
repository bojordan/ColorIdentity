import * as vscode from 'vscode';

/** HSL color with values: h ∈ [0,360), s ∈ [0,100], l ∈ [0,100] */
export interface HSL {
    h: number;
    s: number;
    l: number;
}

/** Configuration read from user settings */
export interface ColorIdentityConfig {
    enabled: boolean;
    affectTitleBar: boolean;
    affectActivityBar: boolean;
    affectStatusBar: boolean;
    affectTabBar: boolean;
    saturationAdjustment: number;
    lightnessAdjustment: number;
    hueOverride: number | null;
}

/** Resolved set of hex colors to apply to the workspace */
export interface WorkspaceColors {
    titleBarActiveBackground?: string;
    titleBarActiveForeground?: string;
    titleBarInactiveBackground?: string;
    titleBarInactiveForeground?: string;
    activityBarBackground?: string;
    activityBarForeground?: string;
    activityBarActiveBorder?: string;
    statusBarBackground?: string;
    statusBarForeground?: string;
    tabsBackground?: string;
}

/** Theme profile: saturation and lightness ranges appropriate for a theme kind */
export interface ThemeProfile {
    baseSaturation: number;
    baseLightness: number;
    fgLightness: number;
    inactiveLightnessShift: number;
}

export function readConfig(): ColorIdentityConfig {
    const cfg = vscode.workspace.getConfiguration('colorIdentity');
    return {
        enabled: cfg.get<boolean>('enabled', true),
        affectTitleBar: cfg.get<boolean>('affectTitleBar', true),
        affectActivityBar: cfg.get<boolean>('affectActivityBar', true),
        affectStatusBar: cfg.get<boolean>('affectStatusBar', true),
        affectTabBar: cfg.get<boolean>('affectTabBar', false),
        saturationAdjustment: cfg.get<number>('saturationAdjustment', 0),
        lightnessAdjustment: cfg.get<number>('lightnessAdjustment', 0),
        hueOverride: cfg.get<number | null>('hueOverride', null),
    };
}
