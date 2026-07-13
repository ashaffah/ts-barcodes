/**
 * Minimal dependency-free PNG writer (8-bit grayscale) for verification.
 * Not part of the published package — used only to render barcodes so a real
 * decoder (ZXing/zbar) can read them back.
 */

import { deflateSync } from "node:zlib";
import type { BarcodeData } from "../src/common/types.js";

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Encode a w×h 8-bit grayscale buffer (0 = black, 255 = white) as PNG. */
export function grayPNG(w: number, h: number, gray: Uint8Array): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // colour type: grayscale
  const raw = Buffer.alloc(h * (w + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0; // filter type 0 (none)
    for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = gray[y * w + x];
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

/** Rasterize a barcode to a grayscale buffer and return a PNG. */
export function barcodeToPNG(data: BarcodeData, scale = 3, quietModules = 6): Buffer {
  if (data.kind === "linear") {
    const cols = data.bars.length;
    const barH = data.height;
    const q = quietModules * scale;
    const w = cols * scale + 2 * q;
    const h = barH * scale + 2 * q;
    const gray = new Uint8Array(w * h).fill(255);
    for (let c = 0; c < cols; c++) {
      if (!data.bars[c]) continue;
      const x0 = q + c * scale;
      for (let y = 0; y < barH * scale; y++) {
        for (let dx = 0; dx < scale; dx++) gray[(q + y) * w + x0 + dx] = 0;
      }
    }
    return grayPNG(w, h, gray);
  }
  const { modules, width, height } = data;
  const q = quietModules * scale;
  const w = width * scale + 2 * q;
  const h = height * scale + 2 * q;
  const gray = new Uint8Array(w * h).fill(255);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!modules[row][col]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          gray[(q + row * scale + dy) * w + q + col * scale + dx] = 0;
        }
      }
    }
  }
  return grayPNG(w, h, gray);
}
