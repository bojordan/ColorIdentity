import * as vscode from 'vscode';
import { HSL, ThemeProfile, WorkspaceColors, ColorIdentityConfig } from './types';
import { extractThemeBaseHue } from './themeAnalyzer';

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

export function getThemeProfile(kind: vscode.ColorThemeKind): ThemeProfile {
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

/** Shortest angular distance between two hues on the 360° wheel. */
function angularDistance(a: number, b: number): number {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
}

// ── Logging ─────────────────────────────────────────────────────────────────

const log = vscode.window.createOutputChannel('ColorIdentity', { log: true });

// ── Hue Resolution ──────────────────────────────────────────────────────────

interface ResolvedHue {
    hue: number;
    source: string;
}

/**
 * Resolve the effective hue from config, accounting for harmony offset.
 */
function resolveHue(
    workspaceName: string,
    config: ColorIdentityConfig,
    themeBaseHue: number | undefined
): ResolvedHue {
    // Harmonized mode with a stored offset: recompute from current theme base
    if (config.colorMode === 'harmonized' && config.harmonyOffset !== null && themeBaseHue !== undefined) {
        const hue = ((themeBaseHue + config.harmonyOffset) % 360 + 360) % 360;
        return {
            hue,
            source: `harmony offset ${config.harmonyOffset > 0 ? '+' : ''}${config.harmonyOffset}° from theme base ${themeBaseHue}°`,
        };
    }

    if (config.hueOverride !== null) {
        return { hue: config.hueOverride, source: `manual override` };
    }

    // Automatic: derive from workspace name
    const hue = hashToHue(workspaceName);
    return { hue, source: `auto (hash of "${workspaceName}")` };
}

// ── Color Generation ─────────────────────────────────────────────────────────

/**
 * Derive a complete set of workspace colors given the inputs.
 *
 * In "harmonized" mode, saturation and lightness are pulled toward the
 * theme's native color space so the identity tint looks intentional
 * rather than painted-on.
 */
export function generateColors(
    workspaceName: string,
    themeKind: vscode.ColorThemeKind,
    config: ColorIdentityConfig
): WorkspaceColors {
    const themeKindName = themeKindToString(themeKind);
    const themeHue = config.colorMode === 'harmonized' ? extractThemeBaseHue() : undefined;
    const resolved = resolveHue(workspaceName, config, themeHue);
    const hue = resolved.hue;
    const profile = getThemeProfile(themeKind);

    log.info(`── Color generation ──────────────────────────`);
    log.info(`Workspace:  "${workspaceName}"`);
    log.info(`Mode:       ${config.colorMode}`);
    log.info(`Theme kind: ${themeKindName}`);
    if (themeHue !== undefined) {
        log.info(`Theme base hue: ${themeHue}°`);
    }
    log.info(`Hue:        ${hue}° (${resolved.source})`);

    let satBase = profile.baseSaturation;
    let litBase = profile.baseLightness;

    if (themeHue !== undefined) {
        const dist = angularDistance(hue, themeHue);
        const proximityFactor = 1 - dist / 180;
        const satShift = Math.round(8 * proximityFactor - 4);
        const litShift = Math.round(3 * proximityFactor);

        satBase = satBase + satShift;
        litBase = litBase + litShift;

        log.info(`Harmony adjustment: angular distance ${dist}° → proximity ${proximityFactor.toFixed(2)}`);
        log.info(`  Saturation: ${profile.baseSaturation} ${satShift >= 0 ? '+' : ''}${satShift} → ${satBase} (closer=more vivid, farther=subtler)`);
        log.info(`  Lightness:  ${profile.baseLightness} ${litShift >= 0 ? '+' : ''}${litShift} → ${litBase}`);
    }

    const sat = clamp(satBase + config.saturationAdjustment, 0, 100);
    const lit = clamp(litBase + config.lightnessAdjustment, 0, 100);
    const fgLit = profile.fgLightness;
    const inactiveLit = clamp(lit + profile.inactiveLightnessShift, 0, 100);

    if (config.saturationAdjustment !== 0 || config.lightnessAdjustment !== 0) {
        log.info(`User adjustments: saturation ${config.saturationAdjustment >= 0 ? '+' : ''}${config.saturationAdjustment}, lightness ${config.lightnessAdjustment >= 0 ? '+' : ''}${config.lightnessAdjustment}`);
    }

    const bg = hslToHex(hue, sat, lit);
    const fg = hslToHex(hue, Math.max(sat - 15, 0), fgLit);
    const inactiveBg = hslToHex(hue, Math.max(sat - 10, 0), inactiveLit);
    const inactiveFg = hslToHex(hue, Math.max(sat - 20, 0), clamp(fgLit - 20, 0, 100));
    const accentBorder = hslToHex(hue, clamp(sat + 15, 0, 100), clamp(lit + 10, 0, 100));

    const statusLit = clamp(lit - 3, 0, 100);
    const statusBg = hslToHex(hue, sat, statusLit);

    const tabLit = themeKind === vscode.ColorThemeKind.Dark ||
                   themeKind === vscode.ColorThemeKind.HighContrast
        ? clamp(lit + 3, 0, 100)
        : clamp(lit - 2, 0, 100);
    const tabBg = hslToHex(hue, Math.max(sat - 10, 0), tabLit);

    log.info(`Final HSL:  hsl(${hue}, ${sat}%, ${lit}%)`);
    log.info(`Applied colors:`);
    log.info(`  Title bar:    bg=${bg}  fg=${fg}`);
    log.info(`  Activity bar: bg=${bg}  fg=${fg}  border=${accentBorder}`);
    log.info(`  Status bar:   bg=${statusBg}  fg=${fg}`);
    log.info(`  Tab bar:      bg=${tabBg}`);
    log.info(`──────────────────────────────────────────────`);

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

function themeKindToString(kind: vscode.ColorThemeKind): string {
    switch (kind) {
        case vscode.ColorThemeKind.Light: return 'Light';
        case vscode.ColorThemeKind.Dark: return 'Dark';
        case vscode.ColorThemeKind.HighContrast: return 'High Contrast';
        case vscode.ColorThemeKind.HighContrastLight: return 'High Contrast Light';
        default: return `Unknown (${kind})`;
    }
}
