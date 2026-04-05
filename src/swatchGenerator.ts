import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';

/**
 * Generate a tiny solid-color PNG file and return its Uri.
 * Uses raw PNG encoding — no external dependencies needed.
 */
export function generateColorSwatch(
    storageDir: string,
    hex: string,
    size: number = 16
): vscode.Uri {
    const fileName = `swatch-${hex.replace('#', '')}.png`;
    const filePath = path.join(storageDir, fileName);

    if (!fs.existsSync(filePath)) {
        const pngBuffer = createSolidPng(hex, size);
        fs.mkdirSync(storageDir, { recursive: true });
        fs.writeFileSync(filePath, pngBuffer);
    }

    return vscode.Uri.file(filePath);
}

/** Remove all cached swatch files. */
export function clearSwatchCache(storageDir: string): void {
    if (!fs.existsSync(storageDir)) {
        return;
    }
    for (const file of fs.readdirSync(storageDir)) {
        if (file.startsWith('swatch-') && file.endsWith('.png')) {
            fs.unlinkSync(path.join(storageDir, file));
        }
    }
}

// ── PNG Encoder ──────────────────────────────────────────────────────────────

function createSolidPng(hex: string, size: number): Buffer {
    const { r, g, b } = hexToRgb(hex);

    // Build raw image data: each row starts with a filter byte (0 = None)
    const rowLen = 1 + size * 4; // filter byte + RGBA * width
    const raw = Buffer.alloc(rowLen * size);
    for (let y = 0; y < size; y++) {
        const offset = y * rowLen;
        raw[offset] = 0; // filter: None
        for (let x = 0; x < size; x++) {
            const px = offset + 1 + x * 4;
            raw[px] = r;
            raw[px + 1] = g;
            raw[px + 2] = b;
            raw[px + 3] = 255; // fully opaque
        }
    }

    const compressed = zlib.deflateSync(raw);

    // Assemble PNG file
    const chunks: Buffer[] = [];

    // Signature
    chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);  // width
    ihdr.writeUInt32BE(size, 4);  // height
    ihdr[8] = 8;                   // bit depth
    ihdr[9] = 6;                   // color type: RGBA
    ihdr[10] = 0;                  // compression
    ihdr[11] = 0;                  // filter
    ihdr[12] = 0;                  // interlace
    chunks.push(pngChunk('IHDR', ihdr));

    // IDAT
    chunks.push(pngChunk('IDAT', compressed));

    // IEND
    chunks.push(pngChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(chunks);
}

function pngChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

    const crc = crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([length, typeAndData, crcBuf]);
}

// ── CRC-32 (per PNG spec) ────────────────────────────────────────────────────

const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
}

function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ 0xffffffff;
}

// ── Hex → RGB ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
    };
}
