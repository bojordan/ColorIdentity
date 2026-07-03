import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the extension manifest (package.json).
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The compiled test suite entry point (out/test/suite/index.js).
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        await runTests({ extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();
