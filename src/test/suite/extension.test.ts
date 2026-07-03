import * as assert from 'assert';
import * as vscode from 'vscode';
import { hashToHue, hslToHex, getThemeProfile, generateColors, buildIdentityName, extractRemoteName } from '../../colorGenerator';
import { ColorIdentityConfig } from '../../types';

function baseConfig(overrides: Partial<ColorIdentityConfig> = {}): ColorIdentityConfig {
    return {
        enabled: true,
        colorMode: 'simple',
        includeRemoteName: true,
        affectTitleBar: true,
        affectActivityBar: true,
        affectStatusBar: true,
        affectTabBar: false,
        saturationAdjustment: 0,
        lightnessAdjustment: 0,
        hueOverride: 200,
        harmonyOffset: null,
        ...overrides,
    };
}

suite('Color Generation', () => {
    test('hashToHue is deterministic and within [0, 360)', () => {
        const a = hashToHue('my-workspace');
        const b = hashToHue('my-workspace');
        assert.strictEqual(a, b);
        assert.ok(a >= 0 && a < 360, `hue ${a} out of range`);
    });

    test('hashToHue separates distinct inputs', () => {
        assert.notStrictEqual(hashToHue('alpha'), hashToHue('beta'));
    });

    test('hslToHex produces valid #rrggbb strings', () => {
        assert.strictEqual(hslToHex(0, 100, 50), '#ff0000');
        assert.strictEqual(hslToHex(120, 100, 50), '#00ff00');
        assert.strictEqual(hslToHex(240, 100, 50), '#0000ff');
        assert.match(hslToHex(200, 35, 22), /^#[0-9a-f]{6}$/);
    });

    test('getThemeProfile differs for light and dark', () => {
        const dark = getThemeProfile(vscode.ColorThemeKind.Dark);
        const light = getThemeProfile(vscode.ColorThemeKind.Light);
        assert.notStrictEqual(dark.baseLightness, light.baseLightness);
    });

    test('generateColors honors enabled surfaces', () => {
        const colors = generateColors(
            'demo',
            vscode.ColorThemeKind.Dark,
            baseConfig({ affectTabBar: true })
        );
        assert.ok(colors.titleBarActiveBackground);
        assert.ok(colors.activityBarBackground);
        assert.ok(colors.statusBarBackground);
        assert.ok(colors.tabsBackground);
    });

    test('generateColors omits disabled surfaces', () => {
        const colors = generateColors(
            'demo',
            vscode.ColorThemeKind.Dark,
            baseConfig({
                affectTitleBar: false,
                affectActivityBar: false,
                affectStatusBar: false,
                affectTabBar: false,
            })
        );
        assert.strictEqual(colors.titleBarActiveBackground, undefined);
        assert.strictEqual(colors.activityBarBackground, undefined);
        assert.strictEqual(colors.statusBarBackground, undefined);
        assert.strictEqual(colors.tabsBackground, undefined);
    });
});

suite('Remote Identity', () => {
    test('extractRemoteName returns undefined when local', () => {
        assert.strictEqual(extractRemoteName(undefined, undefined), undefined);
        assert.strictEqual(extractRemoteName('tunnel+my-box', undefined), undefined);
    });

    test('extractRemoteName parses the name after the "+" separator', () => {
        assert.strictEqual(extractRemoteName('tunnel+my-box', 'tunnel'), 'my-box');
        assert.strictEqual(extractRemoteName('ssh-remote+devhost', 'ssh-remote'), 'devhost');
        assert.strictEqual(extractRemoteName('wsl+Ubuntu', 'wsl'), 'Ubuntu');
    });

    test('extractRemoteName falls back to remoteName without an authority', () => {
        assert.strictEqual(extractRemoteName(undefined, 'tunnel'), 'tunnel');
        assert.strictEqual(extractRemoteName('codespaces', 'codespaces'), 'codespaces');
    });

    test('buildIdentityName prefixes the remote when enabled', () => {
        assert.strictEqual(buildIdentityName('proj', 'my-box', true), 'my-box/proj');
    });

    test('buildIdentityName ignores the remote when disabled or absent', () => {
        assert.strictEqual(buildIdentityName('proj', 'my-box', false), 'proj');
        assert.strictEqual(buildIdentityName('proj', undefined, true), 'proj');
    });

    test('remote name changes the derived hue', () => {
        const local = hashToHue(buildIdentityName('proj', undefined, true));
        const remote = hashToHue(buildIdentityName('proj', 'my-box', true));
        assert.notStrictEqual(local, remote);
    });
});

suite('Extension Activation', () => {
    test('extension is present', () => {
        const ext = vscode.extensions.getExtension('bojordan.color-identity');
        assert.ok(ext, 'Extension bojordan.color-identity not found');
    });

    test('activates and registers commands', async () => {
        const ext = vscode.extensions.getExtension('bojordan.color-identity');
        await ext?.activate();
        assert.strictEqual(ext?.isActive, true);

        const commands = await vscode.commands.getCommands(true);
        const expected = [
            'colorIdentity.chooseColor',
            'colorIdentity.applyColors',
            'colorIdentity.resetColors',
            'colorIdentity.refreshColors',
        ];
        for (const cmd of expected) {
            assert.ok(commands.includes(cmd), `Missing command: ${cmd}`);
        }
    });
});
