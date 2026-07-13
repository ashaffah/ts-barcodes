/** Shared EAN/UPC encoding tables and the GS1 check-digit algorithm. */

import { EncodeError } from "../common/types.js";

/** L-code (odd parity) patterns for digits 0–9. 7 modules each. */
export const L_CODE: readonly boolean[][] = [
  [false, false, false, true, true, false, true], // 0
  [false, false, true, true, false, false, true], // 1
  [false, false, true, false, false, true, true], // 2
  [false, true, true, true, true, false, true], // 3
  [false, true, false, false, false, true, true], // 4
  [false, true, true, false, false, false, true], // 5
  [false, true, false, true, true, true, true], // 6
  [false, true, true, true, false, true, true], // 7
  [false, true, true, false, true, true, true], // 8
  [false, false, false, true, false, true, true], // 9
];

/** G-code (even parity) patterns for digits 0–9. 7 modules each. */
export const G_CODE: readonly boolean[][] = [
  [false, true, false, false, true, true, true], // 0
  [false, true, true, false, false, true, true], // 1
  [false, false, true, true, false, true, true], // 2
  [false, true, false, false, false, false, true], // 3
  [false, false, true, true, true, false, true], // 4
  [false, true, true, true, false, false, true], // 5
  [false, false, false, false, true, false, true], // 6
  [false, false, true, false, false, false, true], // 7
  [false, false, false, true, false, false, true], // 8
  [false, false, true, false, true, true, true], // 9
];

/** R-code (right-hand) patterns for digits 0–9. 7 modules each. */
export const R_CODE: readonly boolean[][] = [
  [true, true, true, false, false, true, false], // 0
  [true, true, false, false, true, true, false], // 1
  [true, true, false, true, true, false, false], // 2
  [true, false, false, false, false, true, false], // 3
  [true, false, true, true, true, false, false], // 4
  [true, false, false, true, true, true, false], // 5
  [true, false, true, false, false, false, false], // 6
  [true, false, false, false, true, false, false], // 7
  [true, false, false, true, false, false, false], // 8
  [true, true, true, false, true, false, false], // 9
];

/**
 * EAN-13 parity selection for the left-hand 6 digits, indexed by the system
 * digit 0–9. `false` = L-code, `true` = G-code.
 */
export const PARITY: readonly boolean[][] = [
  [false, false, false, false, false, false], // 0
  [false, false, true, false, true, true], // 1
  [false, false, true, true, false, true], // 2
  [false, false, true, true, true, false], // 3
  [false, true, false, false, true, true], // 4
  [false, true, true, false, false, true], // 5
  [false, true, true, true, false, false], // 6
  [false, true, false, true, false, true], // 7
  [false, true, false, true, true, false], // 8
  [false, true, true, false, true, false], // 9
];

/** Normal guard bar (start / end): 101 */
export const GUARD_NORMAL: readonly boolean[] = [true, false, true];
/** Centre guard bar: 01010 */
export const GUARD_CENTRE: readonly boolean[] = [false, true, false, true, false];

/**
 * Compute the GS1 (EAN-13/EAN-8/UPC) check digit for a slice of digit values.
 *
 * Weighting is defined from the right: the rightmost data digit has weight 3,
 * then 1, alternating — length-independent, so it is correct for EAN-13 (12
 * digits), EAN-8 (7) and UPC-A/UPC-E (11).
 */
export function checkDigit(digits: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = digits[digits.length - 1 - i];
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** Parse a digit string into an array of digit values, validating the charset. */
export function toDigits(input: string, symbology: string): number[] {
  const t = input.trim();
  const out: number[] = [];
  for (const ch of t) {
    if (ch < "0" || ch > "9") {
      throw EncodeError.invalidInput(`${symbology} input must contain digits only`);
    }
    out.push(ch.charCodeAt(0) - 48);
  }
  return out;
}
