/**
 * Code 128 barcode encoder.
 *
 * Full ASCII via subsets A/B/C, with automatic single-subset selection:
 * Code C for even-length all-digit input, Code A when control characters are
 * present, otherwise Code B. Mixed-subset switching is not performed.
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";

/** Symbol bar patterns 0–106; each is [bar, space, bar, space, bar, space]. */
const PATTERNS: readonly number[][] = [
  [2, 1, 2, 2, 2, 2],
  [2, 2, 2, 1, 2, 2],
  [2, 2, 2, 2, 2, 1],
  [1, 2, 1, 2, 2, 3],
  [1, 2, 1, 3, 2, 2],
  [1, 3, 1, 2, 2, 2],
  [1, 2, 2, 2, 1, 3],
  [1, 2, 2, 3, 1, 2],
  [1, 3, 2, 2, 1, 2],
  [2, 2, 1, 2, 1, 3],
  [2, 2, 1, 3, 1, 2],
  [2, 3, 1, 2, 1, 2],
  [1, 1, 2, 2, 3, 2],
  [1, 2, 2, 1, 3, 2],
  [1, 2, 2, 2, 3, 1],
  [1, 1, 3, 2, 2, 2],
  [1, 2, 3, 1, 2, 2],
  [1, 2, 3, 2, 2, 1],
  [2, 2, 3, 2, 1, 1],
  [2, 2, 1, 1, 3, 2],
  [2, 2, 1, 2, 3, 1],
  [2, 1, 3, 2, 1, 2],
  [2, 2, 3, 1, 1, 2],
  [3, 1, 2, 1, 3, 1],
  [3, 1, 1, 2, 2, 2],
  [3, 2, 1, 1, 2, 2],
  [3, 2, 1, 2, 2, 1],
  [3, 1, 2, 2, 1, 2],
  [3, 2, 2, 1, 1, 2],
  [3, 2, 2, 2, 1, 1],
  [2, 1, 2, 1, 2, 3],
  [2, 1, 2, 3, 2, 1],
  [2, 3, 2, 1, 2, 1],
  [1, 1, 1, 3, 2, 3],
  [1, 3, 1, 1, 2, 3],
  [1, 3, 1, 3, 2, 1],
  [1, 1, 2, 3, 1, 3],
  [1, 3, 2, 1, 1, 3],
  [1, 3, 2, 3, 1, 1],
  [2, 1, 1, 3, 1, 3],
  [2, 3, 1, 1, 1, 3],
  [2, 3, 1, 3, 1, 1],
  [1, 1, 2, 1, 3, 3],
  [1, 1, 2, 3, 3, 1],
  [1, 3, 2, 1, 3, 1],
  [1, 1, 3, 1, 2, 3],
  [1, 1, 3, 3, 2, 1],
  [1, 3, 3, 1, 2, 1],
  [3, 1, 3, 1, 2, 1],
  [2, 1, 1, 3, 3, 1],
  [2, 3, 1, 1, 3, 1],
  [2, 1, 3, 1, 1, 3],
  [2, 1, 3, 3, 1, 1],
  [2, 1, 3, 1, 3, 1],
  [3, 1, 1, 1, 2, 3],
  [3, 1, 1, 3, 2, 1],
  [3, 3, 1, 1, 2, 1],
  [3, 1, 2, 1, 1, 3],
  [3, 1, 2, 3, 1, 1],
  [3, 3, 2, 1, 1, 1],
  [3, 1, 4, 1, 1, 1],
  [2, 2, 1, 4, 1, 1],
  [4, 3, 1, 1, 1, 1],
  [1, 1, 1, 2, 2, 4],
  [1, 1, 1, 4, 2, 2],
  [1, 2, 1, 1, 2, 4],
  [1, 2, 1, 4, 2, 1],
  [1, 4, 1, 1, 2, 2],
  [1, 4, 1, 2, 2, 1],
  [1, 1, 2, 2, 1, 4],
  [1, 1, 2, 4, 1, 2],
  [1, 2, 2, 1, 1, 4],
  [1, 2, 2, 4, 1, 1],
  [1, 4, 2, 1, 1, 2],
  [1, 4, 2, 2, 1, 1],
  [2, 4, 1, 2, 1, 1],
  [2, 2, 1, 1, 1, 4],
  [4, 1, 3, 1, 1, 1],
  [2, 4, 1, 1, 1, 2],
  [1, 3, 4, 1, 1, 1],
  [1, 1, 1, 2, 4, 2],
  [1, 2, 1, 1, 4, 2],
  [1, 2, 1, 2, 4, 1],
  [1, 1, 4, 2, 1, 2],
  [1, 2, 4, 1, 1, 2],
  [1, 2, 4, 2, 1, 1],
  [4, 1, 1, 2, 1, 2],
  [4, 2, 1, 1, 1, 2],
  [4, 2, 1, 2, 1, 1],
  [2, 1, 2, 1, 4, 1],
  [2, 1, 4, 1, 2, 1],
  [4, 1, 2, 1, 2, 1],
  [1, 1, 1, 1, 4, 3],
  [1, 1, 1, 3, 4, 1],
  [1, 3, 1, 1, 4, 1],
  [1, 1, 4, 1, 1, 3],
  [1, 1, 4, 3, 1, 1],
  [4, 1, 1, 1, 1, 3],
  [4, 1, 1, 3, 1, 1],
  [1, 1, 3, 1, 4, 1],
  [1, 1, 4, 1, 3, 1],
  [3, 1, 1, 1, 4, 1],
  [4, 1, 1, 1, 3, 1],
  [2, 1, 1, 4, 1, 2], // 103 Start A
  [2, 1, 1, 2, 1, 4], // 104 Start B
  [2, 1, 1, 2, 3, 2], // 105 Start C
  [2, 3, 3, 1, 1, 1], // 106 Stop (final bar of width 2 appended)
];

const START_A = 103;
export const START_B = 104;
const START_C = 105;
export const STOP = 106;
/** FNC1 special function character (used by GS1-128). */
export const FNC1 = 102;
const STOP_TERMINATION = 2;

type Subset = "A" | "B" | "C";

export class Code128 {
  static readonly symbology = "Code 128";

  /** Encode `input` into a Code 128 barcode with an auto-selected subset. */
  static encode(input: string): Barcode {
    if (input.length === 0) throw EncodeError.invalidInput("Code 128 input must not be empty");
    const bytes = Array.from(input, (c) => c.charCodeAt(0));
    const subset = bestSubset(bytes);

    const symbols: number[] = [];
    symbols.push(subset === "A" ? START_A : subset === "B" ? START_B : START_C);

    if (subset === "A") {
      for (const b of bytes) symbols.push(b <= 0x1f ? b + 64 : b - 0x20);
    } else if (subset === "B") {
      for (const b of bytes) symbols.push(b - 0x20);
    } else {
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        symbols.push((bytes[i] - 48) * 10 + (bytes[i + 1] - 48));
      }
    }

    symbols.push(computeCheck(symbols));
    symbols.push(STOP);

    return linear(Code128.symbology, symbolsToBars(symbols), 50);
  }
}

function bestSubset(bytes: number[]): Subset {
  if (bytes.length >= 2 && bytes.length % 2 === 0 && bytes.every((b) => b >= 48 && b <= 57)) {
    return "C";
  }
  if (bytes.some((b) => b < 0x20 || b === 0x7f)) {
    if (bytes.every((b) => b <= 0x5f || b === 0x7f)) return "A";
    throw EncodeError.invalidInput("input contains characters not encodable in Code 128A");
  }
  if (bytes.every((b) => b >= 0x20 && b <= 0x7e)) return "B";
  throw EncodeError.invalidInput("input contains characters outside the Code 128 character set");
}

/** Weighted modulo-103 check symbol. */
export function computeCheck(symbols: number[]): number {
  let sum = symbols[0];
  for (let i = 1; i < symbols.length; i++) sum += i * symbols[i];
  return sum % 103;
}

/** Expand Code 128 symbol indices into dark/light modules. */
export function symbolsToBars(symbols: number[]): boolean[] {
  const bars: boolean[] = [];
  for (const sym of symbols) {
    const pattern = PATTERNS[sym];
    let dark = true;
    for (const width of pattern) {
      for (let k = 0; k < width; k++) bars.push(dark);
      dark = !dark;
    }
    if (sym === STOP) for (let k = 0; k < STOP_TERMINATION; k++) bars.push(true);
  }
  return bars;
}
