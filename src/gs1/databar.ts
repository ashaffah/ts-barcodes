/**
 * GS1 DataBar Omnidirectional (RSS-14) barcode encoder.
 *
 * Encodes a 13- or 14-digit GTIN into the 96-module DataBar Omnidirectional
 * linear pattern (ISO/IEC 24724). Tables and the combinatorial width algorithm
 * follow the standard, so the symbol decodes on conforming readers.
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";

const COMBINS: readonly number[][] = [
  [1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1],
  [1, 2, 1, 1, 1, 1],
  [1, 3, 3, 1, 1, 1],
  [1, 4, 6, 4, 1, 1],
  [1, 5, 10, 10, 5, 1],
  [1, 6, 15, 20, 15, 6],
  [1, 7, 21, 35, 35, 21],
  [1, 8, 28, 56, 70, 56],
  [1, 9, 36, 84, 126, 126],
  [1, 10, 45, 120, 210, 252],
  [1, 11, 55, 165, 330, 462],
  [1, 12, 66, 220, 495, 792],
  [1, 13, 78, 286, 715, 1287],
  [1, 14, 91, 364, 1001, 2002],
  [1, 15, 105, 455, 1365, 3003],
  [1, 16, 120, 560, 1820, 4368],
  [1, 17, 136, 680, 2380, 6188],
];

const G_SUM = [0, 161, 961, 2015, 2715, 0, 336, 1036, 1516];
const T_EVEN_ODD = [1, 10, 34, 70, 126, 4, 20, 48, 81];
const MODULES = [12, 10, 8, 6, 4, 5, 7, 9, 11, 4, 6, 8, 10, 12, 10, 8, 6, 4];
const WIDEST = [8, 6, 4, 3, 1, 2, 4, 6, 8];
const CHECKSUM_WEIGHT: readonly number[][] = [
  [1, 3, 9, 27, 2, 6, 18, 54],
  [4, 12, 36, 29, 8, 24, 72, 58],
  [16, 48, 65, 37, 32, 17, 51, 74],
  [64, 34, 23, 69, 49, 68, 46, 59],
];
const FINDER: readonly number[][] = [
  [3, 8, 2, 1, 1],
  [3, 5, 5, 1, 1],
  [3, 3, 7, 1, 1],
  [3, 1, 9, 1, 1],
  [2, 7, 4, 1, 1],
  [2, 5, 6, 1, 1],
  [2, 3, 8, 1, 1],
  [1, 5, 7, 1, 1],
  [1, 3, 9, 1, 1],
];

function combins(n: number, r: number): number {
  if (n < 0 || n >= 18 || r < 0 || r >= 6) return 0;
  return COMBINS[n][r];
}

/** Generate 4 element widths for `val` (ISO/IEC 24724 Annex B). */
function getWidths(
  widths: number[],
  val: number,
  n: number,
  maxWidth: number,
  noNarrow: boolean,
): void {
  const ELEMENTS = 4;
  let narrowMask = 0;
  let bar = 0;
  while (bar < ELEMENTS - 1) {
    let elmWidth = 1;
    narrowMask |= 1 << bar;
    let subVal = 0;
    for (;;) {
      subVal = combins(n - elmWidth - 1, ELEMENTS - bar - 2);
      if (
        noNarrow &&
        narrowMask === 0 &&
        n - elmWidth - (ELEMENTS - bar - 1) >= ELEMENTS - bar - 1
      ) {
        subVal -= combins(n - elmWidth - (ELEMENTS - bar), ELEMENTS - bar - 2);
      }
      if (ELEMENTS - bar - 1 > 1) {
        let lessVal = 0;
        let mxw = n - elmWidth - (ELEMENTS - bar - 2);
        while (mxw > maxWidth) {
          lessVal += combins(n - elmWidth - mxw - 1, ELEMENTS - bar - 3);
          mxw -= 1;
        }
        subVal -= lessVal * (ELEMENTS - 1 - bar);
      } else if (n - elmWidth > maxWidth) {
        subVal -= 1;
      }
      val -= subVal;
      if (val < 0) break;
      elmWidth += 1;
      narrowMask &= ~(1 << bar);
    }
    val += subVal;
    n -= elmWidth;
    widths[bar] = elmWidth;
    bar += 1;
  }
  widths[bar] = n;
}

function interleave(
  ret: number[],
  vOdd: number,
  vEven: number,
  nOdd: number,
  nEven: number,
  maxWidth: number,
  noNarrow: boolean,
): void {
  const odd = [0, 0, 0, 0];
  const even = [0, 0, 0, 0];
  getWidths(odd, vOdd, nOdd, maxWidth, noNarrow);
  getWidths(even, vEven, nEven, 9 - maxWidth, !noNarrow);
  for (let i = 0; i < 4; i++) {
    ret[i << 1] = odd[i];
    ret[(i << 1) + 1] = even[i];
  }
}

function group(val: number, outside: boolean): number {
  const end = 8 >> (outside ? 1 : 0);
  let i = outside ? 0 : 5;
  while (i < end) {
    if (val < G_SUM[i + 1]) return i;
    i += 1;
  }
  return i;
}

export class DataBar {
  static readonly symbology = "GS1 DataBar";

  /** Encode a 13- or 14-digit GTIN into a DataBar Omnidirectional barcode. */
  static encode(input: string): Barcode {
    const val = parse(input);

    const leftPair = Math.floor(val / 4537077);
    const rightPair = val % 4537077;
    const dataChar = [
      Math.floor(leftPair / 1597),
      leftPair % 1597,
      Math.floor(rightPair / 1597),
      rightPair % 1597,
    ];

    const dataWidths: number[][] = [[], [], [], []];
    for (let i = 0; i < 4; i++) {
      const outside = i % 2 === 0;
      const g = group(dataChar[i], outside);
      const v = dataChar[i] - G_SUM[g];
      const vDiv = Math.floor(v / T_EVEN_ODD[g]);
      const vMod = v % T_EVEN_ODD[g];
      const vOdd = outside ? vDiv : vMod;
      const vEven = outside ? vMod : vDiv;
      const ret = [0, 0, 0, 0, 0, 0, 0, 0];
      interleave(ret, vOdd, vEven, MODULES[g], MODULES[g + 9], WIDEST[g], !outside);
      dataWidths[i] = ret;
    }

    let checksum = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 8; j++) checksum += CHECKSUM_WEIGHT[i][j] * dataWidths[i][j];
    }
    checksum %= 79;
    if (checksum >= 8) checksum += 1;
    if (checksum >= 72) checksum += 1;
    const cLeft = Math.floor(checksum / 9);
    const cRight = checksum % 9;

    // 46 element widths: guards, data, finders.
    const tw = new Array<number>(46).fill(0);
    tw[0] = 1;
    tw[1] = 1;
    tw[44] = 1;
    tw[45] = 1;
    for (let i = 0; i < 8; i++) {
      tw[i + 2] = dataWidths[0][i];
      tw[i + 15] = dataWidths[1][7 - i];
      tw[i + 23] = dataWidths[3][i];
      tw[i + 36] = dataWidths[2][7 - i];
    }
    for (let i = 0; i < 5; i++) {
      tw[i + 10] = FINDER[cLeft][i];
      tw[i + 31] = FINDER[cRight][4 - i];
    }

    // Render: alternate light/dark starting with light (96 modules).
    const bars: boolean[] = [];
    let dark = false;
    for (const width of tw) {
      for (let k = 0; k < width; k++) bars.push(dark);
      dark = !dark;
    }

    return linear(DataBar.symbology, bars, 33);
  }
}

/** GS1 mod-10 check digit (weights 3,1,… from the right). */
function gs1Check(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[digits.length - 1 - i] * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

function parse(input: string): number {
  const t = input.trim();
  if (!/^[0-9]+$/.test(t)) {
    throw EncodeError.invalidInput("GS1 DataBar input must contain digits only");
  }
  let digits13: number[];
  if (t.length === 13) {
    digits13 = t.split("").map((c) => c.charCodeAt(0) - 48);
  } else if (t.length === 14) {
    const d = t.split("").map((c) => c.charCodeAt(0) - 48);
    if (gs1Check(d.slice(0, 13)) !== d[13]) {
      throw EncodeError.invalidInput("GS1 DataBar check digit mismatch");
    }
    digits13 = d.slice(0, 13);
  } else {
    throw EncodeError.invalidInput("GS1 DataBar input must be 13 or 14 digits");
  }
  let val = 0;
  for (const d of digits13) val = val * 10 + d;
  return val;
}
