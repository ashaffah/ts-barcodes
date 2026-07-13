/**
 * Code 39 barcode encoder.
 *
 * Variable-length, discrete. Encodes digits, uppercase A–Z, space and
 * `- . $ / + %`. Each character is 9 elements (narrow=1, wide=3 modules); the
 * `*` start/stop delimiters are added automatically.
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";

// Each entry: 9 booleans, `true` = wide element.
const TABLE: Record<string, boolean[]> = {
  "0": [false, false, false, true, true, false, true, false, false],
  "1": [true, false, false, true, false, false, false, false, true],
  "2": [false, false, true, true, false, false, false, false, true],
  "3": [true, false, true, true, false, false, false, false, false],
  "4": [false, false, false, true, true, false, false, false, true],
  "5": [true, false, false, true, true, false, false, false, false],
  "6": [false, false, true, true, true, false, false, false, false],
  "7": [false, false, false, true, false, false, true, false, true],
  "8": [true, false, false, true, false, false, true, false, false],
  "9": [false, false, true, true, false, false, true, false, false],
  A: [true, false, false, false, false, true, false, false, true],
  B: [false, false, true, false, false, true, false, false, true],
  C: [true, false, true, false, false, true, false, false, false],
  D: [false, false, false, false, true, true, false, false, true],
  E: [true, false, false, false, true, true, false, false, false],
  F: [false, false, true, false, true, true, false, false, false],
  G: [false, false, false, false, false, true, true, false, true],
  H: [true, false, false, false, false, true, true, false, false],
  I: [false, false, true, false, false, true, true, false, false],
  J: [false, false, false, false, true, true, true, false, false],
  K: [true, false, false, false, false, false, false, true, true],
  L: [false, false, true, false, false, false, false, true, true],
  M: [true, false, true, false, false, false, false, true, false],
  N: [false, false, false, false, true, false, false, true, true],
  O: [true, false, false, false, true, false, false, true, false],
  P: [false, false, true, false, true, false, false, true, false],
  Q: [false, false, false, false, false, false, true, true, true],
  R: [true, false, false, false, false, false, true, true, false],
  S: [false, false, true, false, false, false, true, true, false],
  T: [false, false, false, false, true, false, true, true, false],
  U: [true, true, false, false, false, false, false, false, true],
  V: [false, true, true, false, false, false, false, false, true],
  W: [true, true, true, false, false, false, false, false, false],
  X: [false, true, false, false, true, false, false, false, true],
  Y: [true, true, false, false, true, false, false, false, false],
  Z: [false, true, true, false, true, false, false, false, false],
  "-": [false, true, false, false, false, false, true, false, true],
  ".": [true, true, false, false, false, false, true, false, false],
  " ": [false, true, true, false, false, false, true, false, false],
  $: [false, true, false, true, false, true, false, false, false],
  "/": [false, true, false, true, false, false, false, true, false],
  "+": [false, true, false, false, false, true, false, true, false],
  "%": [false, false, false, true, false, true, false, true, false],
  "*": [false, true, false, false, true, false, true, false, false],
};

export class Code39 {
  static readonly symbology = "Code 39";

  /** Encode `input` into a Code 39 barcode (`*` start/stop added). */
  static encode(input: string): Barcode {
    if (input.length === 0) throw EncodeError.invalidInput("Code 39 input must not be empty");
    for (const ch of input) {
      if (!(ch in TABLE)) throw EncodeError.invalidCharacter(ch);
    }
    const bars: boolean[] = [];
    appendChar(bars, TABLE["*"]);
    for (const ch of input) {
      bars.push(false); // narrow inter-character gap
      appendChar(bars, TABLE[ch]);
    }
    bars.push(false);
    appendChar(bars, TABLE["*"]);
    return linear(Code39.symbology, bars, 50);
  }
}

// 9 elements alternate bar/space starting with a bar; wide = 3, narrow = 1.
function appendChar(bars: boolean[], pattern: boolean[]): void {
  for (let i = 0; i < 9; i++) {
    const isBar = i % 2 === 0;
    const width = pattern[i] ? 3 : 1;
    for (let k = 0; k < width; k++) bars.push(isBar);
  }
}
