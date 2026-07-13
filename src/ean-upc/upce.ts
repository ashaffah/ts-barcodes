/**
 * UPC-E barcode encoder.
 *
 * A zero-suppressed form of UPC-A. Accepts 6 digits (data only), 7 digits
 * (with check digit) or 8 digits (number system 0/1 + 6 data + check).
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";
import { L_CODE, G_CODE, GUARD_NORMAL, checkDigit, toDigits } from "./tables.js";

/** UPC-E end guard: 010101 */
const GUARD_END: readonly boolean[] = [false, true, false, true, false, true];

/** Parity pattern indexed by check digit (0–9): `false` = L, `true` = G. */
const UPCE_PARITY: readonly boolean[][] = [
  [true, true, true, false, false, false], // 0
  [true, true, false, true, false, false], // 1
  [true, true, false, false, true, false], // 2
  [true, true, false, false, false, true], // 3
  [true, false, true, true, false, false], // 4
  [true, false, false, true, true, false], // 5
  [true, false, false, false, true, true], // 6
  [true, false, true, false, true, false], // 7
  [true, false, true, false, false, true], // 8
  [true, false, false, true, false, true], // 9
];

export class UpcE {
  static readonly symbology = "UPC-E";

  /** Encode `input` (6, 7 or 8 digits) into a UPC-E barcode. */
  static encode(input: string): Barcode {
    const { numberSystem, six, check } = parseAndValidate(input);
    return linear(UpcE.symbology, encodeBars(numberSystem, six, check), 69);
  }
}

interface Parsed {
  numberSystem: number;
  six: number[];
  check: number;
}

function parseAndValidate(input: string): Parsed {
  const d = toDigits(input, "UPC-E");
  switch (d.length) {
    case 6: {
      const six = d.slice(0, 6);
      const check = checkDigit(expandToUpcA(0, six).slice(0, 11));
      return { numberSystem: 0, six, check };
    }
    case 7: {
      const six = d.slice(0, 6);
      const expected = checkDigit(expandToUpcA(0, six).slice(0, 11));
      if (d[6] !== expected) throw EncodeError.invalidInput("UPC-E check digit mismatch");
      return { numberSystem: 0, six, check: expected };
    }
    case 8: {
      const ns = d[0];
      if (ns > 1) throw EncodeError.invalidInput("UPC-E number system must be 0 or 1");
      const six = d.slice(1, 7);
      const expected = checkDigit(expandToUpcA(ns, six).slice(0, 11));
      if (d[7] !== expected) throw EncodeError.invalidInput("UPC-E check digit mismatch");
      return { numberSystem: ns, six, check: expected };
    }
    default:
      throw EncodeError.invalidInput("UPC-E input must be 6, 7, or 8 digits");
  }
}

/** Expand a UPC-E number to the equivalent 12-digit UPC-A number. */
export function expandToUpcA(numberSystem: number, six: number[]): number[] {
  const u = new Array<number>(12).fill(0);
  u[0] = numberSystem;
  const last = six[5];
  if (last <= 2) {
    u[1] = six[0];
    u[2] = six[1];
    u[3] = six[5];
    u[8] = six[2];
    u[9] = six[3];
    u[10] = six[4];
  } else if (last === 3) {
    u[1] = six[0];
    u[2] = six[1];
    u[3] = six[2];
    u[9] = six[3];
    u[10] = six[4];
  } else if (last === 4) {
    u[1] = six[0];
    u[2] = six[1];
    u[3] = six[2];
    u[4] = six[3];
    u[10] = six[4];
  } else {
    u[1] = six[0];
    u[2] = six[1];
    u[3] = six[2];
    u[4] = six[3];
    u[5] = six[4];
    u[10] = last;
  }
  return u;
}

function encodeBars(numberSystem: number, six: number[], check: number): boolean[] {
  const parity = UPCE_PARITY[check];
  const bars: boolean[] = [];
  bars.push(...GUARD_NORMAL);
  for (let pos = 0; pos < 6; pos++) {
    const useG = numberSystem === 0 ? parity[pos] : !parity[pos];
    bars.push(...(useG ? G_CODE[six[pos]] : L_CODE[six[pos]]));
  }
  bars.push(...GUARD_END);
  return bars;
}
