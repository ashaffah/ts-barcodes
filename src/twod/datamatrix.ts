/**
 * Data Matrix ECC 200 barcode encoder.
 *
 * Square symbols 10×10–48×48 (single Reed–Solomon block), including the
 * multi-region 32×32–48×48 sizes. ASCII encoding, GF(256) (0x12D) error
 * correction and the ISO/IEC 16022 symbol-character placement algorithm.
 */

import { Barcode, matrix } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";

// [symbolSize, dataRegion, regionsPerSide, dataCodewords, ecCodewords]
const SYMBOL_PARAMS: readonly [number, number, number, number, number][] = [
  [10, 8, 1, 3, 5],
  [12, 10, 1, 5, 7],
  [14, 12, 1, 8, 10],
  [16, 14, 1, 12, 12],
  [18, 16, 1, 18, 14],
  [20, 18, 1, 22, 18],
  [22, 20, 1, 30, 20],
  [24, 22, 1, 36, 24],
  [26, 24, 1, 44, 28],
  [32, 14, 2, 62, 36],
  [36, 16, 2, 86, 42],
  [40, 18, 2, 114, 48],
  [44, 20, 2, 144, 56],
  [48, 22, 2, 174, 68],
];

const PRIM_POLY = 0x12d;

function gf256Mul(a: number, b: number): number {
  let result = 0;
  let aa = a;
  let bb = b;
  while (bb > 0) {
    if (bb & 1) result ^= aa;
    aa <<= 1;
    if (aa & 0x100) aa ^= PRIM_POLY;
    bb >>= 1;
  }
  return result & 0xff;
}

function gf256Pow(base: number, exp: number): number {
  let result = 1;
  for (let i = 0; i < exp; i++) result = gf256Mul(result, base);
  return result;
}

/** Reed–Solomon check bytes for Data Matrix. */
function rsEncode(data: number[], ecCount: number): number[] {
  const poly = new Array<number>(ecCount + 1).fill(0);
  poly[0] = 1;
  for (let i = 0; i < ecCount; i++) {
    const root = gf256Pow(2, i + 1);
    const cur = i + 1;
    const newPoly = new Array<number>(ecCount + 1).fill(0);
    for (let j = 0; j < cur; j++) {
      newPoly[j] ^= poly[j];
      newPoly[j + 1] ^= gf256Mul(poly[j], root);
    }
    for (let j = 0; j <= cur; j++) poly[j] = newPoly[j];
  }

  const rem = new Array<number>(ecCount).fill(0);
  for (const d of data) {
    const lead = d ^ rem[0];
    for (let i = 0; i < ecCount - 1; i++) rem[i] = rem[i + 1];
    rem[ecCount - 1] = 0;
    if (lead !== 0) for (let i = 0; i < ecCount; i++) rem[i] ^= gf256Mul(lead, poly[i + 1]);
  }
  return rem;
}

function asciiEncode(input: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < input.length; ) {
    if (i + 1 < input.length && isDigit(input[i]) && isDigit(input[i + 1])) {
      out.push(130 + (input[i] - 48) * 10 + (input[i + 1] - 48));
      i += 2;
    } else {
      out.push(input[i] + 1);
      i += 1;
    }
  }
  return out;
}

const isDigit = (b: number) => b >= 48 && b <= 57;

// ---- ISO/IEC 16022 placement ----

function placeBit(
  a: number[],
  nr: number,
  nc: number,
  r: number,
  c: number,
  p: number,
  b: number,
): void {
  if (r < 0) {
    r += nr;
    c += 4 - ((nr + 4) % 8);
  }
  if (c < 0) {
    c += nc;
    r += 4 - ((nc + 4) % 8);
  }
  a[r * nc + c] = (p << 3) | b;
}

function placeBlock(a: number[], nr: number, nc: number, r: number, c: number, p: number): void {
  placeBit(a, nr, nc, r - 2, c - 2, p, 7);
  placeBit(a, nr, nc, r - 2, c - 1, p, 6);
  placeBit(a, nr, nc, r - 1, c - 2, p, 5);
  placeBit(a, nr, nc, r - 1, c - 1, p, 4);
  placeBit(a, nr, nc, r - 1, c, p, 3);
  placeBit(a, nr, nc, r, c - 2, p, 2);
  placeBit(a, nr, nc, r, c - 1, p, 1);
  placeBit(a, nr, nc, r, c, p, 0);
}

function cornerA(a: number[], nr: number, nc: number, p: number): void {
  placeBit(a, nr, nc, nr - 1, 0, p, 7);
  placeBit(a, nr, nc, nr - 1, 1, p, 6);
  placeBit(a, nr, nc, nr - 1, 2, p, 5);
  placeBit(a, nr, nc, 0, nc - 2, p, 4);
  placeBit(a, nr, nc, 0, nc - 1, p, 3);
  placeBit(a, nr, nc, 1, nc - 1, p, 2);
  placeBit(a, nr, nc, 2, nc - 1, p, 1);
  placeBit(a, nr, nc, 3, nc - 1, p, 0);
}

function cornerB(a: number[], nr: number, nc: number, p: number): void {
  placeBit(a, nr, nc, nr - 3, 0, p, 7);
  placeBit(a, nr, nc, nr - 2, 0, p, 6);
  placeBit(a, nr, nc, nr - 1, 0, p, 5);
  placeBit(a, nr, nc, 0, nc - 4, p, 4);
  placeBit(a, nr, nc, 0, nc - 3, p, 3);
  placeBit(a, nr, nc, 0, nc - 2, p, 2);
  placeBit(a, nr, nc, 0, nc - 1, p, 1);
  placeBit(a, nr, nc, 1, nc - 1, p, 0);
}

function cornerC(a: number[], nr: number, nc: number, p: number): void {
  placeBit(a, nr, nc, nr - 3, 0, p, 7);
  placeBit(a, nr, nc, nr - 2, 0, p, 6);
  placeBit(a, nr, nc, nr - 1, 0, p, 5);
  placeBit(a, nr, nc, 0, nc - 2, p, 4);
  placeBit(a, nr, nc, 0, nc - 1, p, 3);
  placeBit(a, nr, nc, 1, nc - 1, p, 2);
  placeBit(a, nr, nc, 2, nc - 1, p, 1);
  placeBit(a, nr, nc, 3, nc - 1, p, 0);
}

function cornerD(a: number[], nr: number, nc: number, p: number): void {
  placeBit(a, nr, nc, nr - 1, 0, p, 7);
  placeBit(a, nr, nc, nr - 1, nc - 1, p, 6);
  placeBit(a, nr, nc, 0, nc - 3, p, 5);
  placeBit(a, nr, nc, 0, nc - 2, p, 4);
  placeBit(a, nr, nc, 0, nc - 1, p, 3);
  placeBit(a, nr, nc, 1, nc - 3, p, 2);
  placeBit(a, nr, nc, 1, nc - 2, p, 1);
  placeBit(a, nr, nc, 1, nc - 1, p, 0);
}

function ecc200Placement(nr: number, nc: number): number[] {
  const a = new Array<number>(nr * nc).fill(0);
  const idx = (r: number, c: number) => r * nc + c;

  let p = 1;
  let r = 4;
  let c = 0;

  for (;;) {
    if (r === nr && c === 0) cornerA(a, nr, nc, p++);
    if (r === nr - 2 && c === 0 && nc % 4 !== 0) cornerB(a, nr, nc, p++);
    if (r === nr - 2 && c === 0 && nc % 8 === 4) cornerC(a, nr, nc, p++);
    if (r === nr + 4 && c === 2 && nc % 8 === 0) cornerD(a, nr, nc, p++);

    for (;;) {
      if (r < nr && c >= 0 && a[idx(r, c)] === 0) placeBlock(a, nr, nc, r, c, p++);
      r -= 2;
      c += 2;
      if (!(r >= 0 && c < nc)) break;
    }
    r += 1;
    c += 3;

    for (;;) {
      if (r >= 0 && c < nc && a[idx(r, c)] === 0) placeBlock(a, nr, nc, r, c, p++);
      r += 2;
      c -= 2;
      if (!(r < nr && c >= 0)) break;
    }
    r += 3;
    c += 1;

    if (!(r < nr || c < nc)) break;
  }

  const last = nr * nc - 1;
  if (a[last] === 0) {
    a[last] = 1;
    a[nr * nc - nc - 2] = 1;
  }
  return a;
}

function buildGrid(
  size: number,
  dataRegion: number,
  regions: number,
  dataCw: number[],
  ecCw: number[],
): boolean[][] {
  const buf = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const block = dataRegion + 2;

  for (let br = 0; br < regions; br++) {
    for (let bc = 0; bc < regions; bc++) {
      const r0 = br * block;
      const c0 = bc * block;
      for (let i = 0; i < block; i++) {
        buf[r0 + block - 1][c0 + i] = true; // bottom solid
        buf[r0 + i][c0] = true; // left solid
      }
      for (let i = 0; i < block; i += 2) buf[r0][c0 + i] = true; // top timing
      for (let i = 1; i < block; i += 2) buf[r0 + i][c0 + block - 1] = true; // right timing
    }
  }

  const mapping = regions * dataRegion;
  const places = ecc200Placement(mapping, mapping);
  const dataLen = dataCw.length;

  for (let mr = 0; mr < mapping; mr++) {
    for (let mc = 0; mc < mapping; mc++) {
      const v = places[mr * mapping + mc];
      let dark: boolean;
      if (v === 0) dark = false;
      else if (v === 1) dark = true;
      else {
        const cwIdx = (v >> 3) - 1;
        const cw = cwIdx < dataLen ? dataCw[cwIdx] : ecCw[cwIdx - dataLen];
        dark = ((cw >> (v & 7)) & 1) === 1;
      }
      const pr = Math.floor(mr / dataRegion) * block + 1 + (mr % dataRegion);
      const pc = Math.floor(mc / dataRegion) * block + 1 + (mc % dataRegion);
      buf[pr][pc] = dark;
    }
  }
  return buf;
}

export class DataMatrix {
  static readonly symbology = "Data Matrix";

  /** Encode `input` into the smallest fitting Data Matrix (10×10–48×48). */
  static encode(input: string): Barcode {
    if (input.length === 0) throw EncodeError.invalidInput("Data Matrix input must not be empty");

    const bytes = Array.from(new TextEncoder().encode(input));
    const dataCw = asciiEncode(bytes);
    const n = dataCw.length;

    const params = SYMBOL_PARAMS.find(([, , , cap]) => n <= cap);
    if (!params) throw EncodeError.dataTooLong();
    const [size, dataRegion, regions, dataCap, ecCount] = params;

    // Pad: codeword 129 first, then the 253-state pseudo-random sequence.
    const padded = dataCw.slice();
    if (n < dataCap) {
      padded.push(129);
      for (let i = n + 1; i < dataCap; i++) {
        const pos = i + 1;
        const rr = ((149 * pos) % 253) + 1;
        const v = 129 + rr;
        padded.push(v > 254 ? v - 254 : v);
      }
    }

    const ec = rsEncode(padded, ecCount);
    const modules = buildGrid(size, dataRegion, regions, padded, ec);
    return matrix(DataMatrix.symbology, modules);
  }
}
