/**
 * Code 93 barcode encoder.
 *
 * Variable-length, continuous. 43 data characters (digits, A–Z, space,
 * `- . $ / + %`). Each character is 9 modules; the `*` start/stop and two
 * modulo-47 check characters (C, K) are added automatically, plus a final bar.
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";

/** 9-bit module maps, MSB = leftmost module. Index 47 is `*`. */
const PATTERNS: readonly number[] = [
  0b100010100, 0b101001000, 0b101000100, 0b101000010, 0b100101000, 0b100100100, 0b100100010,
  0b101010000, 0b100010010, 0b100001010, 0b110101000, 0b110100100, 0b110100010, 0b110010100,
  0b110010010, 0b110001010, 0b101101000, 0b101100100, 0b101100010, 0b100110100, 0b100011010,
  0b101011000, 0b101001100, 0b101000110, 0b100101100, 0b100010110, 0b110110100, 0b110110010,
  0b110101100, 0b110100110, 0b110010110, 0b110011010, 0b101101100, 0b101100110, 0b100110110,
  0b100111010, 0b100101110, 0b111010100, 0b111010010, 0b111001010, 0b101101110, 0b101110110,
  0b110101110, 0b100100110, 0b111011010, 0b111010110, 0b100110010, 0b101011110,
];

const START_STOP = 47;

export class Code93 {
  static readonly symbology = "Code 93";

  /** Encode `input` into a Code 93 barcode (`*`, checks, terminator added). */
  static encode(input: string): Barcode {
    if (input.length === 0) throw EncodeError.invalidInput("Code 93 input must not be empty");

    const values: number[] = [];
    for (const ch of input) {
      const v = CHARS.indexOf(ch);
      if (v < 0) throw EncodeError.invalidCharacter(ch);
      values.push(v);
    }

    // Two modulo-47 check characters: C (max weight 20), then K (max weight 15).
    values.push(checkValue(values, 20));
    values.push(checkValue(values, 15));

    const bars: boolean[] = [];
    appendPattern(bars, START_STOP);
    for (const v of values) appendPattern(bars, v);
    appendPattern(bars, START_STOP);
    bars.push(true); // final termination bar

    return linear(Code93.symbology, bars, 50);
  }
}

// Weights run 1..maxWeight from the right, then wrap.
function checkValue(values: number[], maxWeight: number): number {
  let weight = 1;
  let sum = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    sum += weight * values[i];
    weight = weight === maxWeight ? 1 : weight + 1;
  }
  return sum % 47;
}

function appendPattern(bars: boolean[], value: number): void {
  const pattern = PATTERNS[value];
  for (let i = 8; i >= 0; i--) bars.push(((pattern >> i) & 1) === 1);
}
