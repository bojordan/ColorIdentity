import * as vscode from 'vscode';
import { HSL, ThemeProfile, WorkspaceColors, ColorIdentityConfig } from './types';

// ── Hashing ──────────────────────────────────────────────────────────────────

/**
 * Deterministic hash of a string → number in [0, 360).
 * Uses djb2 — simple, fast, and produces a well-distributed spread.
 */
export function hashToHue(input: string): number {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
    }
    return hash % 360;
}

// ── Theme Profiles ───────────────────────────────────────────────────────────

function getThemeProfile(kind: vscode.ColorThemeKind): ThemeProfile {
    switch (kind) {
        case vscode.ColorThemeKind.Light:
            return {
                baseSaturation: 30,
                baseLightness: 88,
                fgLightness: 20,
                inactiveLightnessShift: 4,
            };
        case vscode.ColorThemeKind.HighContrastLight:
            return {
                baseSaturation: 50,
                baseLightness: 85,
                fgLightness: 10,
                inactiveLightnessShift: 5,
            };
        case vscode.ColorThemeKind.HighContrast:
            return {
                baseSaturation: 55,
                baseLightness: 18,
                fgLightness: 95,
                inactiveLightnessShift: -5,
            };
        case vscode.ColorThemeKind.Dark:
        default:
            return {
                baseSaturation: 35,
                baseLightness: 22,
                fgLightness: 90,
                inactiveLightnessShift: -4,
            };
    }
}

// ── HSL ↔ Hex conversion ────────────────────────────────────────────────────

/** Convert HSL to a #rrggbb hex string. s and l are percentages 0–100. */
export function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * Math.max(0, Math.min(1, color)))
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// ── Color Generation ─────────────────────────────────────────────────────────

/**
 * Derive a complete set of workspace colors given the inputs.
 */
export function generateColors(
    workspaceName: string,
    themeKind: vscode.ColorThemeKind,
    config: ColorIdentityConfig
): WorkspaceColors {
    const hue = config.hueOverride ?? hashToHue(workspaceName);
    const profile = getThemeProfile(themeKind);

    const sat = clamp(profile.baseSaturation + config.saturationAdjustment, 0, 100);
    const lit = clamp(profile.baseLightness + config.lightnessAdjustment, 0, 100);
    const fgLit = profile.fgLightness;
    const inactiveLit = clamp(lit + profile.inactiveLightnessShift, 0, 100);

    const bg = hslToHex(hue, sat, lit);
    const fg = hslToHex(hue, Math.max(sat - 15, 0), fgLit);
    const inactiveBg = hslToHex(hue, Math.max(sat - 10, 0), inactiveLit);
    const inactiveFg = hslToHex(hue, Math.max(sat - 20, 0), clamp(fgLit - 20, 0, 100));
    const accentBorder = hslToHex(hue, clamp(sat + 15, 0, 100), clamp(lit + 10, 0, 100));

    // Status bar gets a slightly different lightness for visual separation
    const statusLit = clamp(lit - 3, 0, 100);
    const statusBg = hslToHex(hue, sat, statusLit);

    // Tab bar uses a very subtle tint
    const tabLit = themeKind === vscode.ColorThemeKind.Dark ||
                   themeKind === vscode.ColorThemeKind.HighContrast
        ? clamp(lit + 3, 0, 100)
        : clamp(lit - 2, 0, 100);
    const tabBg = hslToHex(hue, Math.max(sat - 10, 0), tabLit);

    const colors: WorkspaceColors = {};

    if (config.affectTitleBar) {
        colors.titleBarActiveBackground = bg;
        colors.titleBarActiveForeground = fg;
        colors.titleBarInactiveBackground = inactiveBg;
        colors.titleBarInactiveForeground = inactiveFg;
    }

    if (config.affectActivityBar) {
        colors.activityBarBackground = bg;
        colors.activityBarForeground = fg;
        colors.activityBarActiveBorder = accentBorder;
    }

    if (config.affectStatusBar) {
        colors.statusBarBackground = statusBg;
        colors.statusBarForeground = fg;
    }

    if (config.affectTabBar) {
        colors.tabsBackground = tabBg;
    }

    return colors;
}
