/**
 * USPS Intelligent Mail Barcode (IMb / OneCode) encoder.
 *
 * Encodes a 20-digit tracking code and an optional routing (ZIP) code of 0, 5,
 * 9 or 11 digits into the 65-bar 4-state Intelligent Mail Barcode
 * (USPS-B-3200). Output is a 3-row matrix (ascender / tracker / descender).
 */

import { Barcode, matrix } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";
import { APPX_D_I, APPX_D_II, APPX_D_IV } from "./imb-table.js";
import { renderStates } from "./rm4scc.js";

/** 11-bit CRC frame check sequence (USPS-B-3200) over a 13-byte array. */
function crc11(bytes: number[]): number {
  const GEN = 0x0f35;
  let fcs = 0x07ff;
  // Most-significant byte, skipping the 2 unused top bits.
  let data = bytes[0] << 5;
  for (let i = 2; i < 8; i++) {
    if ((fcs ^ data) & 0x400) fcs = (fcs << 1) ^ GEN;
    else fcs <<= 1;
    fcs &= 0x7ff;
    data <<= 1;
  }
  for (let b = 1; b < 13; b++) {
    let d = bytes[b] << 3;
    for (let i = 0; i < 8; i++) {
      if ((fcs ^ d) & 0x400) fcs = (fcs << 1) ^ GEN;
      else fcs <<= 1;
      fcs &= 0x7ff;
      d <<= 1;
    }
  }
  return fcs;
}

export class Imb {
  static readonly symbology = "USPS IMb";

  /**
   * Encode the 20-digit tracking code optionally followed by `-` and a
   * 0/5/9/11-digit routing code, e.g. `"01234567094987654321-01234567891"`.
   */
  static encode(input: string): Barcode {
    const dash = input.indexOf("-");
    const tracker = dash < 0 ? input : input.slice(0, dash);
    const zip = dash < 0 ? "" : input.slice(dash + 1);

    if (tracker.length !== 20 || !/^[0-9]{20}$/.test(tracker)) {
      throw EncodeError.invalidInput("IMb tracking code must be 20 digits");
    }
    if (tracker.charCodeAt(1) > 52 /* '4' */) {
      throw EncodeError.invalidInput("IMb barcode identifier (2nd digit) must be 0-4");
    }
    if (![0, 5, 9, 11].includes(zip.length) || !/^[0-9]*$/.test(zip)) {
      throw EncodeError.invalidInput("IMb routing code must be 0, 5, 9 or 11 digits");
    }

    const d = (ch: string) => BigInt(ch.charCodeAt(0) - 48);

    // Step 1: data fields -> a single (up to 102-bit) integer.
    let accum = 0n;
    for (const ch of zip) accum = accum * 10n + d(ch);
    accum +=
      zip.length === 11 ? 1000100001n : zip.length === 9 ? 100001n : zip.length === 5 ? 1n : 0n;
    accum = accum * 10n + d(tracker[0]);
    accum = accum * 5n + d(tracker[1]);
    for (let i = 2; i < 20; i++) accum = accum * 10n + d(tracker[i]);

    // Step 2: 11-bit CRC over the 13-byte (104-bit) big-endian form.
    const reg = accum & ~(1n << 102n) & ~(1n << 103n);
    const byteArray: number[] = [];
    for (let i = 0; i < 13; i++) {
      byteArray.push(Number((reg >> BigInt(8 * (12 - i))) & 0xffn));
    }
    const crc = crc11(byteArray);

    // Step 3: integer -> codewords (base 636 then base 1365).
    const cw = new Array<number>(10).fill(0);
    cw[9] = Number(accum % 636n);
    accum /= 636n;
    for (let j = 8; j >= 1; j--) {
      cw[j] = Number(accum % 1365n);
      accum /= 1365n;
    }
    cw[0] = Number(accum);

    // Step 4: fold in the CRC / orientation.
    cw[9] *= 2;
    if (crc >= 1024) cw[0] += 659;

    // Step 5: codewords -> 13-bit characters (with CRC bit inversion).
    const chars = new Array<number>(10).fill(0);
    for (let i = 0; i < 10; i++) {
      const v = cw[i];
      let c = v < 1287 ? APPX_D_I[v] : APPX_D_II[v - 1287];
      if (crc & (1 << i)) c = 0x1fff - c;
      chars[i] = c;
    }

    // Step 6: characters -> 65 four-state bars.
    const barMap = new Array<number>(130).fill(0);
    for (let i = 0; i < 10; i++) {
      const c = chars[i];
      for (let j = 0; j < 13; j++) barMap[APPX_D_IV[13 * i + j] - 1] = (c >> j) & 1;
    }

    // state: 0 = full, 1 = ascender, 2 = descender, 3 = tracker.
    const states: number[] = [];
    for (let i = 0; i < 65; i++) {
      let state = 0;
      if (barMap[i] === 0) state += 1;
      if (barMap[i + 65] === 0) state += 2;
      states.push(state);
    }

    return matrix(Imb.symbology, renderStates(states));
  }
}
