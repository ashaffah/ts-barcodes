/**
 * EAN-8 barcode encoder.
 *
 * Encodes 8 digits (7 data + 1 check). Accepts a 7-digit string (check digit
 * appended automatically) or an 8-digit string (check digit validated).
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";
import { L_CODE, R_CODE, GUARD_NORMAL, GUARD_CENTRE, checkDigit, toDigits } from "./tables.js";

export class Ean8 {
  static readonly symbology = "EAN-8";

  /** Encode `input` (7 or 8 digits) into an EAN-8 barcode. */
  static encode(input: string): Barcode {
    const digits = parseAndValidate(input);
    return linear(Ean8.symbology, encodeBars(digits), 69);
  }
}

function parseAndValidate(input: string): number[] {
  const d = toDigits(input, "EAN-8");
  if (d.length === 7) {
    d.push(checkDigit(d.slice(0, 7)));
    return d;
  }
  if (d.length === 8) {
    if (d[7] !== checkDigit(d.slice(0, 7))) {
      throw EncodeError.invalidInput("EAN-8 check digit mismatch");
    }
    return d;
  }
  throw EncodeError.invalidInput("EAN-8 input must be 7 or 8 digits");
}

function encodeBars(digits: number[]): boolean[] {
  const bars: boolean[] = [];
  bars.push(...GUARD_NORMAL);
  for (let i = 0; i < 4; i++) bars.push(...L_CODE[digits[i]]);
  bars.push(...GUARD_CENTRE);
  for (let i = 4; i < 8; i++) bars.push(...R_CODE[digits[i]]);
  bars.push(...GUARD_NORMAL);
  return bars;
}
