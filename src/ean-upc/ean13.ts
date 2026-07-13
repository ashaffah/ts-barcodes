/**
 * EAN-13 barcode encoder.
 *
 * Encodes 13 digits (12 data + 1 check). Accepts a 12-digit string (check
 * digit appended automatically) or a 13-digit string (check digit validated).
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";
import {
  L_CODE,
  G_CODE,
  R_CODE,
  PARITY,
  GUARD_NORMAL,
  GUARD_CENTRE,
  checkDigit,
  toDigits,
} from "./tables.js";

export class Ean13 {
  static readonly symbology = "EAN-13";

  /** Encode `input` (12 or 13 digits) into an EAN-13 barcode. */
  static encode(input: string): Barcode {
    const digits = parseAndValidate(input);
    return linear(Ean13.symbology, encodeBars(digits), 69);
  }
}

function parseAndValidate(input: string): number[] {
  const d = toDigits(input, "EAN-13");
  if (d.length === 12) {
    d.push(checkDigit(d.slice(0, 12)));
    return d;
  }
  if (d.length === 13) {
    if (d[12] !== checkDigit(d.slice(0, 12))) {
      throw EncodeError.invalidInput("EAN-13 check digit mismatch");
    }
    return d;
  }
  throw EncodeError.invalidInput("EAN-13 input must be 12 or 13 digits");
}

function encodeBars(digits: number[]): boolean[] {
  const parity = PARITY[digits[0]];
  const bars: boolean[] = [];
  bars.push(...GUARD_NORMAL);
  // Left 6 digits (digits[1..7]) — L or G by parity.
  for (let pos = 0; pos < 6; pos++) {
    const d = digits[pos + 1];
    bars.push(...(parity[pos] ? G_CODE[d] : L_CODE[d]));
  }
  bars.push(...GUARD_CENTRE);
  // Right 6 digits (digits[7..13]) — all R-code.
  for (let i = 7; i < 13; i++) bars.push(...R_CODE[digits[i]]);
  bars.push(...GUARD_NORMAL);
  return bars;
}
