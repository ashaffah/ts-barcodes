/**
 * UPC-A barcode encoder.
 *
 * Encodes 12 digits (11 data + 1 check). Accepts an 11-digit string (check
 * digit computed automatically) or a 12-digit string (check digit validated).
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";
import { L_CODE, R_CODE, GUARD_NORMAL, GUARD_CENTRE, checkDigit, toDigits } from "./tables.js";

export class UpcA {
  static readonly symbology = "UPC-A";

  /** Encode `input` (11 or 12 digits) into a UPC-A barcode. */
  static encode(input: string): Barcode {
    const digits = parseAndValidate(input);
    return linear(UpcA.symbology, encodeBars(digits), 69);
  }
}

function parseAndValidate(input: string): number[] {
  const d = toDigits(input, "UPC-A");
  if (d.length === 11) {
    d.push(checkDigit(d.slice(0, 11)));
    return d;
  }
  if (d.length === 12) {
    if (d[11] !== checkDigit(d.slice(0, 11))) {
      throw EncodeError.invalidInput("UPC-A check digit mismatch");
    }
    return d;
  }
  throw EncodeError.invalidInput("UPC-A input must be 11 or 12 digits");
}

function encodeBars(digits: number[]): boolean[] {
  const bars: boolean[] = [];
  bars.push(...GUARD_NORMAL);
  // Left 6 digits — all L-code.
  for (let i = 0; i < 6; i++) bars.push(...L_CODE[digits[i]]);
  bars.push(...GUARD_CENTRE);
  // Right 6 digits — all R-code.
  for (let i = 6; i < 12; i++) bars.push(...R_CODE[digits[i]]);
  bars.push(...GUARD_NORMAL);
  return bars;
}
