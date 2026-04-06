import * as vscode from 'vscode';
import { ThemeProfile } from './types';
import { hslToHex } from './colorGenerator';

// ── Types ───────────────────────────────────────────────────────────────────

export interface HarmonyGroup {
    label: string;
    description: string;
    hues: HarmonySuggestion[];
}

export interface HarmonySuggestion {
    label: string;
    hue: number;
    offset: number;  // signed offset from theme base hue (-180 to +180)
    reason: string;
}

// ── Theme Base-Hue Extraction ───────────────────────────────────────────────

/**
 * Attempt to extract a dominant hue from the active theme by reading
 * well-known color customizations or inferring from the theme name.
 * Returns a hue in [0, 360). Falls back to a neutral hue derived from
 * the theme kind if no specific signal is found.
 */
export function extractThemeBaseHue(): number {
    // Check user-level color customizations for theme signals.
    // IMPORTANT: skip keys that ColorIdentity manages — reading our own
    // applied colors would create a feedback loop where we detect our
    // output as the theme's input.
    const colorConfig = vscode.workspace.getConfiguration('workbench');
    const customizations = colorConfig.get<Record<string, string>>('colorCustomizations') ?? {};

    const managedKeys = new Set([
        'titleBar.activeBackground',
        'titleBar.activeForeground',
        'titleBar.inactiveBackground',
        'titleBar.inactiveForeground',
        'activityBar.background',
        'activityBar.foreground',
        'activityBar.activeBorder',
        'statusBar.background',
        'statusBar.foreground',
        'editorGroupHeader.tabsBackground',
    ]);

    // Probe keys we do NOT manage — these reflect the user's theme, not our tint
    const probeKeys = [
        'sideBar.background',
        'editor.background',
        'editorGroup.border',
        'panel.background',
        'tab.activeBackground',
    ];

    for (const key of probeKeys) {
        const hex = customizations[key];
        if (hex && hex.startsWith('#')) {
            const hsl = hexToHsl(hex);
            // Only treat it as a signal if it has meaningful saturation
            if (hsl && hsl.s > 8) {
                return hsl.h;
            }
        }
    }

    // Fall back to theme-name heuristics for popular themes
    const themeName = (colorConfig.get<string>('colorTheme') ?? '').toLowerCase();
    const namedHue = inferHueFromThemeName(themeName);
    if (namedHue !== undefined) {
        return namedHue;
    }

    // Last resort: derive a neutral hue from the theme kind
    return fallbackHueFromKind(vscode.window.activeColorTheme.kind);
}

/**
 * Map theme names to their dominant hue. Covers VS Code built-in themes
 * and popular third-party themes.
 */
function inferHueFromThemeName(name: string): number | undefined {
    const themeHues: [RegExp, number][] = [
        // ── VS Code built-in themes ─────────────────────────────────
        [/dark\s*modern/i, 215],             // blue-grey
        [/dark\+/i, 220],                    // default dark+ (blue)
        [/dark.*default/i, 220],             // "Default Dark+" variants
        [/light\s*modern/i, 215],            // blue-grey
        [/light\+/i, 215],                   // default light+
        [/light.*default/i, 215],            // "Default Light+" variants
        [/high\s*contrast\s*dark/i, 210],    // HC dark
        [/high\s*contrast\s*light/i, 210],   // HC light
        [/visual\s*studio\s*dark/i, 220],    // blue
        [/visual\s*studio\s*light/i, 215],   // blue
        [/quiet\s*light/i, 30],              // warm
        [/kimbie\s*dark/i, 25],              // warm orange-brown
        [/red/i, 0],                         // Red theme
        [/tomorrow\s*night\s*blue/i, 220],   // blue
        [/abyss/i, 220],                     // deep blue
        [/solarized\s*dark/i, 195],          // blue-cyan
        [/solarized\s*light/i, 45],          // warm yellow
        [/monokai/i, 70],                    // greenish-yellow

        // ── Popular third-party themes ──────────────────────────────
        [/dracula/i, 260],                   // purple
        [/nord/i, 210],                      // steel blue
        [/gruvbox\s*dark/i, 30],             // warm orange
        [/gruvbox\s*light/i, 45],            // warm yellow
        [/one\s*dark/i, 220],                // blue
        [/one\s*light/i, 220],               // blue
        [/cobalt/i, 220],                    // blue
        [/tokyo\s*night/i, 235],             // indigo
        [/catppuccin.*mocha/i, 250],         // lavender
        [/catppuccin.*macchiato/i, 240],     // blue-lavender
        [/catppuccin.*frappe/i, 230],        // blue
        [/catppuccin.*latte/i, 220],         // blue
        [/github\s*dark/i, 215],             // blue
        [/github\s*light/i, 215],            // blue
        [/synthwave/i, 290],                 // magenta
        [/ayu.*dark/i, 35],                  // orange
        [/ayu.*mirage/i, 220],               // blue
        [/ayu.*light/i, 40],                 // amber
        [/night\s*owl/i, 210],               // blue
        [/material.*ocean/i, 220],           // blue
        [/material.*palenight/i, 260],       // purple
        [/material.*darker/i, 200],          // blue-teal
        [/horizon/i, 350],                   // pinkish-red
        [/panda/i, 160],                     // green-teal
        [/palenight/i, 260],                 // purple
        [/vitesse/i, 150],                   // teal-green
        [/everforest/i, 140],                // green
        [/rose\s*pine/i, 280],               // rose-purple
        [/kanagawa/i, 220],                  // blue
        [/vesper/i, 30],                     // warm
        [/slack/i, 270],                     // purple
        [/winter\s*is\s*coming/i, 210],      // blue
        [/atom\s*one/i, 220],                // blue
        [/shades\s*of\s*purple/i, 270],      // purple
        [/andromeda/i, 270],                 // purple
        [/bearded/i, 210],                   // blue
        [/moonlight/i, 230],                 // blue-indigo
    ];

    for (const [pattern, hue] of themeHues) {
        if (pattern.test(name)) {
            return hue;
        }
    }
    return undefined;
}

/**
 * Last-resort hue based on theme kind. Returns a neutral blue that
 * produces reasonable harmony groups for any theme.
 */
function fallbackHueFromKind(kind: vscode.ColorThemeKind): number {
    switch (kind) {
        case vscode.ColorThemeKind.Light:
        case vscode.ColorThemeKind.HighContrastLight:
            return 215;  // neutral blue
        case vscode.ColorThemeKind.HighContrast:
        case vscode.ColorThemeKind.Dark:
        default:
            return 220;  // neutral blue
    }
}

// ── Harmony Generation ──────────────────────────────────────────────────────

/**
 * Generate harmonized color suggestions based on a theme's base hue.
 */
export function generateHarmonyGroups(
    themeBaseHue: number,
    themeProfile: ThemeProfile
): HarmonyGroup[] {
    const base = themeBaseHue;

    return [
        {
            label: 'Analogous',
            description: 'Colors adjacent to your theme — subtle distinction',
            hues: [
                { label: 'Warm Shift', hue: norm(base + 25),  offset: 25,   reason: 'Analogous warm' },
                { label: 'Cool Shift', hue: norm(base - 25),  offset: -25,  reason: 'Analogous cool' },
                { label: 'Near Warm',  hue: norm(base + 40),  offset: 40,   reason: 'Wide analogous warm' },
                { label: 'Near Cool',  hue: norm(base - 40),  offset: -40,  reason: 'Wide analogous cool' },
            ],
        },
        {
            label: 'Complementary',
            description: 'Opposite your theme — strong distinction',
            hues: [
                { label: 'Complement',     hue: norm(base + 180), offset: 180,  reason: 'Direct complement' },
                { label: 'Near Complement', hue: norm(base + 165), offset: 165,  reason: 'Near complement warm' },
                { label: 'Far Complement',  hue: norm(base + 195), offset: -165, reason: 'Near complement cool' },
            ],
        },
        {
            label: 'Triadic',
            description: 'Evenly spaced — balanced and vivid',
            hues: [
                { label: 'Triad A', hue: norm(base + 120), offset: 120,  reason: 'Triadic +120°' },
                { label: 'Triad B', hue: norm(base + 240), offset: -120, reason: 'Triadic −120°' },
            ],
        },
        {
            label: 'Split-Complementary',
            description: 'Flanking the complement — distinctive yet harmonious',
            hues: [
                { label: 'Split A', hue: norm(base + 150), offset: 150,  reason: 'Split-complementary A' },
                { label: 'Split B', hue: norm(base + 210), offset: -150, reason: 'Split-complementary B' },
            ],
        },
    ];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize a hue to [0, 360). */
function norm(hue: number): number {
    return ((hue % 360) + 360) % 360;
}

/** Convert a #rrggbb hex string to HSL. Returns undefined for invalid input. */
function hexToHsl(hex: string): { h: number; s: number; l: number } | undefined {
    const m = hex.match(/^#([0-9a-f]{6})$/i);
    if (!m) { return undefined; }

    const r = parseInt(m[1].substring(0, 2), 16) / 255;
    const g = parseInt(m[1].substring(2, 4), 16) / 255;
    const b = parseInt(m[1].substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
        return { h: 0, s: 0, l: l * 100 };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h: number;
    if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
        h = ((b - r) / d + 2) / 6;
    } else {
        h = ((r - g) / d + 4) / 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
