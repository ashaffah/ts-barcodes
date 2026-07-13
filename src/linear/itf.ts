/**
 * ITF (Interleaved 2 of 5) barcode encoder.
 *
 * Numeric only. Digit pairs are interleaved: the first digit is carried by the
 * bars, the second by the spaces. Odd-length input gets a leading zero.
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";

// Per digit: 5 booleans, `true` = wide.
const TABLE: readonly boolean[][] = [
  [false, false, true, true, false], // 0
  [true, false, false, false, true], // 1
  [false, true, false, false, true], // 2
  [true, true, false, false, false], // 3
  [false, false, true, false, true], // 4
  [true, false, true, false, false], // 5
  [false, true, true, false, false], // 6
  [false, false, false, true, true], // 7
  [true, false, false, true, false], // 8
  [false, true, false, true, false], // 9
];

export class Itf {
  static readonly symbology = "ITF";

  /** Encode `input` (numeric) into an ITF barcode. */
  static encode(input: string): Barcode {
    const t = input.trim();
    if (t.length === 0) throw EncodeError.invalidInput("ITF input must not be empty");
    if (!/^[0-9]+$/.test(t)) throw EncodeError.invalidInput("ITF input must contain digits only");

    const digits = (t.length % 2 === 1 ? "0" + t : t).split("").map((c) => c.charCodeAt(0) - 48);

    const bars: boolean[] = [];
    // Start pattern NNNN: dark, light, dark, light.
    bars.push(true, false, true, false);

    for (let i = 0; i + 1 < digits.length; i += 2) {
      const p1 = TABLE[digits[i]];
      const p2 = TABLE[digits[i + 1]];
      for (let j = 0; j < 5; j++) {
        pushRun(bars, true, p1[j] ? 3 : 1); // bar
        pushRun(bars, false, p2[j] ? 3 : 1); // space
      }
    }

    // Stop pattern WNN: wide bar, narrow space, narrow bar.
    pushRun(bars, true, 3);
    bars.push(false, true);

    return linear(Itf.symbology, bars, 50);
  }
}

function pushRun(bars: boolean[], dark: boolean, n: number): void {
  for (let k = 0; k < n; k++) bars.push(dark);
}
