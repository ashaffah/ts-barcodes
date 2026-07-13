/**
 * Aztec Code barcode encoder.
 *
 * Binary Shift high-level encoding (universal), Reed–Solomon over the Aztec
 * Galois fields and the standard bull's-eye / mode-message / spiral layout
 * (ISO/IEC 24778). Compact (1–4 layers) and full-range (1–12 layers) symbols.
 */

import { Barcode, matrix } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";

const MAX_LAYERS_FULL = 12;

// Word size (bits per codeword) indexed by layer count.
const WORD_SIZE = [
  4, 6, 6, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12,
  12, 12, 12, 12, 12, 12,
];

// ---- Galois field GF(2^m) ----

class Gf {
  readonly exp: number[];
  readonly log: number[];

  constructor(primitive: number, size: number) {
    this.exp = new Array<number>(2 * size).fill(0);
    this.log = new Array<number>(size).fill(0);
    let x = 1;
    for (let i = 0; i < size - 1; i++) {
      this.exp[i] = x;
      this.log[x] = i;
      x <<= 1;
      if (x >= size) x ^= primitive;
    }
    for (let i = 0; i < size - 1; i++) this.exp[size - 1 + i] = this.exp[i];
  }

  mul(a: number, b: number): number {
    return a === 0 || b === 0 ? 0 : this.exp[this.log[a] + this.log[b]];
  }
}

function fieldFor(wordSize: number): Gf {
  switch (wordSize) {
    case 4:
      return new Gf(0x13, 16);
    case 6:
      return new Gf(0x43, 64);
    case 8:
      return new Gf(0x12d, 256);
    case 10:
      return new Gf(0x409, 1024);
    default:
      return new Gf(0x1069, 4096);
  }
}

function rsEncode(gf: Gf, words: number[], dataLen: number, ec: number): void {
  const genp = new Array<number>(ec + 1).fill(0);
  genp[0] = 1;
  for (let i = 0; i < ec; i++) {
    const root = gf.exp[1 + i];
    const cur = i + 1;
    const ng = new Array<number>(ec + 1).fill(0);
    for (let j = 0; j < cur; j++) {
      ng[j] ^= genp[j];
      ng[j + 1] ^= gf.mul(genp[j], root);
    }
    for (let j = 0; j <= cur; j++) genp[j] = ng[j];
  }
  const rem = new Array<number>(ec).fill(0);
  for (let i = 0; i < dataLen; i++) {
    const factor = words[i] ^ rem[0];
    for (let k = 0; k < ec - 1; k++) rem[k] = rem[k + 1];
    rem[ec - 1] = 0;
    if (factor !== 0) for (let k = 0; k < ec; k++) rem[k] ^= gf.mul(factor, genp[k + 1]);
  }
  for (let k = 0; k < ec; k++) words[dataLen + k] = rem[k];
}

// ---- Bit buffer ----

class Bits {
  bits: boolean[] = [];
  get len(): number {
    return this.bits.length;
  }
  pushBits(value: number, count: number): void {
    for (let i = count - 1; i >= 0; i--) this.bits.push(((value >> i) & 1) === 1);
  }
}

function totalBitsInLayer(layers: number, compact: boolean): number {
  return ((compact ? 88 : 112) + 16 * layers) * layers;
}

function stuffBits(input: Bits, wordSize: number, out: Bits): void {
  const n = input.len;
  const mask = (1 << wordSize) - 2;
  let i = 0;
  while (i < n) {
    let word = 0;
    for (let j = 0; j < wordSize; j++) {
      const idx = i + j;
      if (idx >= n || input.bits[idx]) word |= 1 << (wordSize - 1 - j);
    }
    if ((word & mask) === mask) {
      out.pushBits(word & mask, wordSize);
      i -= 1;
    } else if ((word & mask) === 0) {
      out.pushBits(word | 1, wordSize);
      i -= 1;
    } else {
      out.pushBits(word, wordSize);
    }
    i += wordSize;
  }
}

function generateCheckWords(input: Bits, totalBits: number, wordSize: number, out: Bits): void {
  const messageWords = Math.floor(input.len / wordSize);
  const totalWords = Math.floor(totalBits / wordSize);
  const gf = fieldFor(wordSize);

  const words = new Array<number>(totalWords).fill(0);
  for (let i = 0; i < messageWords; i++) {
    let v = 0;
    for (let j = 0; j < wordSize; j++) {
      if (input.bits[i * wordSize + j]) v |= 1 << (wordSize - j - 1);
    }
    words[i] = v;
  }
  rsEncode(gf, words, messageWords, totalWords - messageWords);

  const startPad = totalBits % wordSize;
  out.pushBits(0, startPad);
  for (let i = 0; i < totalWords; i++) out.pushBits(words[i], wordSize);
}

function generateModeMessage(
  compact: boolean,
  layers: number,
  messageWords: number,
  out: Bits,
): void {
  const m = new Bits();
  if (compact) {
    m.pushBits(layers - 1, 2);
    m.pushBits(messageWords - 1, 6);
    generateCheckWords(m, 28, 4, out);
  } else {
    m.pushBits(layers - 1, 5);
    m.pushBits(messageWords - 1, 11);
    generateCheckWords(m, 40, 4, out);
  }
}

// ---- Matrix drawing ----

type Grid = boolean[][];

function drawBullsEye(m: Grid, center: number, size: number): void {
  for (let i = 0; i < size; i += 2) {
    for (let j = center - i; j <= center + i; j++) {
      m[center - i][j] = true;
      m[center + i][j] = true;
      m[j][center - i] = true;
      m[j][center + i] = true;
    }
  }
  m[center - size][center - size] = true;
  m[center - size][center - size + 1] = true;
  m[center - size + 1][center - size] = true;
  m[center - size][center + size] = true;
  m[center - size + 1][center + size] = true;
  m[center + size - 1][center + size] = true;
}

function drawModeMessage(m: Grid, compact: boolean, size: number, mode: Bits): void {
  const center = Math.floor(size / 2);
  const b = mode.bits;
  if (compact) {
    for (let i = 0; i < 7; i++) {
      const offset = center - 3 + i;
      if (b[i]) m[center - 5][offset] = true;
      if (b[i + 7]) m[offset][center + 5] = true;
      if (b[20 - i]) m[center + 5][offset] = true;
      if (b[27 - i]) m[offset][center - 5] = true;
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const offset = center - 5 + i + Math.floor(i / 5);
      if (b[i]) m[center - 7][offset] = true;
      if (b[i + 10]) m[offset][center + 7] = true;
      if (b[29 - i]) m[center + 7][offset] = true;
      if (b[39 - i]) m[offset][center - 7] = true;
    }
  }
}

export class Aztec {
  static readonly symbology = "Aztec Code";

  /** Encode `input` into an Aztec Code symbol. */
  static encode(input: string): Barcode {
    const data = Array.from(new TextEncoder().encode(input));
    if (data.length === 0) throw EncodeError.invalidInput("Aztec input must not be empty");

    // High-level: single Binary Shift run of the whole input (from UPPER).
    const bits = new Bits();
    bits.pushBits(31, 5); // B/S latch
    const count = data.length;
    if (count <= 31) {
      bits.pushBits(count, 5);
    } else {
      bits.pushBits(0, 5);
      bits.pushBits(count - 31, 11);
    }
    for (const b of data) bits.pushBits(b, 8);

    const eccBits = Math.floor((bits.len * 23) / 100) + 11; // ~23% ECC
    const totalSizeBits = bits.len + eccBits;

    let compact = true;
    let layers = 0;
    let wordSize = 0;
    let totalBitsLayer = 0;
    let stuffed = new Bits();
    let found = false;
    for (let i = 0; i <= MAX_LAYERS_FULL + 3; i++) {
      compact = i <= 3;
      layers = compact ? i + 1 : i;
      if (!compact && layers > MAX_LAYERS_FULL) break;
      totalBitsLayer = totalBitsInLayer(layers, compact);
      if (totalSizeBits > totalBitsLayer) continue;
      if (wordSize !== WORD_SIZE[layers]) {
        wordSize = WORD_SIZE[layers];
        stuffed = new Bits();
        stuffBits(bits, wordSize, stuffed);
      }
      const usable = totalBitsLayer - (totalBitsLayer % wordSize);
      if (compact && stuffed.len > wordSize * 64) continue;
      if (stuffed.len + eccBits <= usable) {
        found = true;
        break;
      }
    }
    if (!found) throw EncodeError.dataTooLong();

    const message = new Bits();
    generateCheckWords(stuffed, totalBitsLayer, wordSize, message);
    const messageWords = Math.floor(stuffed.len / wordSize);
    const mode = new Bits();
    generateModeMessage(compact, layers, messageWords, mode);

    const base = (compact ? 11 : 14) + layers * 4;
    const amap = new Array<number>(67).fill(0);
    let size: number;
    if (compact) {
      size = base;
      for (let i = 0; i < base; i++) amap[i] = i;
    } else {
      size = base + 1 + 2 * Math.floor((Math.floor(base / 2) - 1) / 15);
      const origCenter = Math.floor(base / 2);
      const center = Math.floor(size / 2);
      for (let i = 0; i < origCenter; i++) {
        const newOffset = i + Math.floor(i / 15);
        amap[origCenter - i - 1] = center - newOffset - 1;
        amap[origCenter + i] = center + newOffset + 1;
      }
    }

    const m: Grid = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    const mb = message.bits;

    // Draw the data bits in the spiral.
    let rowOffset = 0;
    for (let i = 0; i < layers; i++) {
      const rowSize = (layers - i) * 4 + (compact ? 9 : 12);
      for (let j = 0; j < rowSize; j++) {
        const columnOffset = j * 2;
        for (let k = 0; k < 2; k++) {
          if (mb[rowOffset + columnOffset + k]) setCell(m, amap[i * 2 + k], amap[i * 2 + j]);
          if (mb[rowOffset + rowSize * 2 + columnOffset + k]) {
            setCell(m, amap[i * 2 + j], amap[base - 1 - i * 2 - k]);
          }
          if (mb[rowOffset + rowSize * 4 + columnOffset + k]) {
            setCell(m, amap[base - 1 - i * 2 - k], amap[base - 1 - i * 2 - j]);
          }
          if (mb[rowOffset + rowSize * 6 + columnOffset + k]) {
            setCell(m, amap[base - 1 - i * 2 - j], amap[i * 2 + k]);
          }
        }
      }
      rowOffset += rowSize * 8;
    }

    drawModeMessage(m, compact, size, mode);
    const half = Math.floor(size / 2);
    if (compact) {
      drawBullsEye(m, half, 5);
    } else {
      drawBullsEye(m, half, 7);
      let i = 0;
      let j = 0;
      while (i < Math.floor(base / 2) - 1) {
        for (let k = half & 1; k < size; k += 2) {
          m[k][half - j] = true;
          m[k][half + j] = true;
          m[half - j][k] = true;
          m[half + j][k] = true;
        }
        i += 15;
        j += 16;
      }
    }

    return matrix(Aztec.symbology, m);
  }
}

// Matrix.set(x, y) sets column x, row y -> m[y][x].
function setCell(m: Grid, x: number, y: number): void {
  m[y][x] = true;
}
