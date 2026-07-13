/**
 * PDF417 barcode encoder.
 *
 * Byte compaction (universal), Reed–Solomon error correction over GF(929) and
 * the standard ISO/IEC 15438 low-level codeword patterns. Each row is emitted
 * three times so square-module rendering produces the tall rows a scanner needs.
 */

import { Barcode, matrix } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";
import { CODEWORD_TABLE } from "./pdf417-table.js";

const START_PATTERN = 0x1fea8;
const STOP_PATTERN = 0x3fa29;
const PRIME = 929;
const MAX_EC = 64;
const MAX_COLS = 30;
const MAX_ROWS = 90;
const ROW_HEIGHT = 3;

// EC generator coefficients (ISO/IEC 15438), levels 0..5. Source: ZXing.
const EC_COEFFICIENTS: readonly (readonly number[])[] = [
  [27, 917],
  [522, 568, 723, 809],
  [237, 308, 436, 284, 646, 653, 428, 379],
  [274, 562, 232, 755, 599, 524, 801, 132, 295, 116, 442, 428, 295, 42, 176, 65],
  [
    361, 575, 922, 525, 176, 586, 640, 321, 536, 742, 677, 742, 687, 284, 193, 517, 273, 494, 263,
    147, 593, 800, 571, 320, 803, 133, 231, 390, 685, 330, 63, 410,
  ],
  [
    539, 422, 6, 93, 862, 771, 453, 106, 610, 287, 107, 505, 733, 877, 381, 612, 723, 476, 462, 172,
    430, 609, 858, 822, 543, 376, 511, 400, 672, 762, 283, 184, 440, 35, 519, 31, 460, 594, 225,
    535, 517, 352, 605, 158, 651, 201, 488, 502, 648, 733, 717, 83, 404, 97, 280, 771, 840, 629, 4,
    381, 843, 623, 264, 543,
  ],
];

function generateEc(data: number[], level: number): number[] {
  const coeff = EC_COEFFICIENTS[level];
  const k = coeff.length;
  const e = new Array<number>(MAX_EC).fill(0);
  for (const cwv of data) {
    const t1 = (cwv + e[k - 1]) % PRIME;
    for (let j = k - 1; j >= 1; j--) {
      const t2 = (t1 * coeff[j]) % PRIME;
      e[j] = (e[j - 1] + (PRIME - t2)) % PRIME;
    }
    e[0] = (PRIME - ((t1 * coeff[0]) % PRIME)) % PRIME;
  }
  const out = new Array<number>(k).fill(0);
  for (let i = 0; i < k; i++) {
    const v = e[k - 1 - i];
    out[i] = v !== 0 ? PRIME - v : 0;
  }
  return out;
}

function byteCompaction(data: number[]): number[] {
  const cw: number[] = [0]; // [0] reserved for the length descriptor
  const len = data.length;
  cw.push(len % 6 === 0 ? 924 : 901);

  let i = 0;
  for (; i + 6 <= len; i += 6) {
    let t = 0n;
    for (let j = 0; j < 6; j++) t = (t << 8n) | BigInt(data[i + j]);
    const tmp = new Array<number>(5);
    for (let k = 4; k >= 0; k--) {
      tmp[k] = Number(t % 900n);
      t /= 900n;
    }
    for (const v of tmp) cw.push(v);
  }
  for (; i < len; i++) cw.push(data[i]);
  return cw;
}

function isqrt(n: number): number {
  return n === 0 ? 0 : Math.floor(Math.sqrt(n));
}

function recommendedLevel(dataCw: number): number {
  if (dataCw <= 40) return 2;
  if (dataCw <= 160) return 3;
  if (dataCw <= 320) return 4;
  return 5;
}

function dimensions(total: number): [number, number] {
  const start = Math.min(Math.max(isqrt(total), 1), MAX_COLS);
  for (let c = start; c <= MAX_COLS; c++) {
    const r = Math.ceil(total / c);
    if (r >= 3 && r <= MAX_ROWS) return [r, c];
  }
  for (let c = start - 1; c >= 1; c--) {
    const r = Math.ceil(total / c);
    if (r >= 3 && r <= MAX_ROWS) return [r, c];
  }
  throw EncodeError.dataTooLong();
}

function rowIndicators(
  y: number,
  r: number,
  c: number,
  level: number,
  cluster: number,
): [number, number] {
  const base = 30 * Math.floor(y / 3);
  if (cluster === 0) return [base + Math.floor((r - 1) / 3), base + (c - 1)];
  if (cluster === 1) return [base + level * 3 + ((r - 1) % 3), base + Math.floor((r - 1) / 3)];
  return [base + (c - 1), base + level * 3 + ((r - 1) % 3)];
}

function rowWidth(cols: number): number {
  return 17 * (cols + 3) + 18;
}

export class Pdf417 {
  static readonly symbology = "PDF417";

  /** Encode `input` into a PDF417 barcode (EC level auto-selected). */
  static encode(input: string): Barcode {
    if (input.length === 0) throw EncodeError.invalidInput("PDF417 input must not be empty");

    const bytes = Array.from(new TextEncoder().encode(input));
    const cw = byteCompaction(bytes);
    const payloadEnd = cw.length;

    const level = recommendedLevel(payloadEnd);
    const ec = 1 << (level + 1);

    const [rows, cols] = dimensions(payloadEnd + ec);
    const capacity = rows * cols;
    const dataLen = capacity - ec;
    if (payloadEnd > dataLen) throw EncodeError.dataTooLong();

    // Pad the data region with 900, then write the length descriptor.
    while (cw.length < dataLen) cw.push(900);
    cw[0] = dataLen;

    const ecCw = generateEc(cw.slice(0, dataLen), level);
    const all = cw.slice(0, dataLen).concat(ecCw);

    const width = rowWidth(cols);
    const modules: boolean[][] = [];
    for (let y = 0; y < rows; y++) {
      const cluster = y % 3;
      const [left, right] = rowIndicators(y, rows, cols, level, cluster);
      const rowBits: boolean[] = [];
      appendPattern(rowBits, START_PATTERN, 17);
      appendPattern(rowBits, CODEWORD_TABLE[cluster][left], 17);
      for (let x = 0; x < cols; x++) {
        appendPattern(rowBits, CODEWORD_TABLE[cluster][all[y * cols + x]], 17);
      }
      appendPattern(rowBits, CODEWORD_TABLE[cluster][right], 17);
      appendPattern(rowBits, STOP_PATTERN, 18);
      for (let h = 0; h < ROW_HEIGHT; h++) modules.push(rowBits.slice());
    }

    return matrix(Pdf417.symbology, modules);
  }
}

function appendPattern(bits: boolean[], pattern: number, len: number): void {
  for (let i = len - 1; i >= 0; i--) bits.push(((pattern >> i) & 1) === 1);
}
