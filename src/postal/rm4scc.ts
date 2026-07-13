/**
 * Royal Mail 4-State Customer Code (RM4SCC) encoder.
 *
 * Encodes alphanumeric data into the Royal Mail 4-state barcode (start bar,
 * one four-bar character per input character, a check character and a stop
 * bar). Output is a 3-row matrix: row 0 ascender, row 1 tracker (always
 * present), row 2 descender.
 */

import { Barcode, matrix } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";

// Bar states per value (0–35): 0 = Full, 1 = Ascender, 2 = Descender, 3 = Tracker.
const RM4KIX: readonly number[][] = [
  [3, 3, 0, 0],
  [3, 2, 1, 0],
  [3, 2, 0, 1],
  [2, 3, 1, 0],
  [2, 3, 0, 1],
  [2, 2, 1, 1],
  [3, 1, 2, 0],
  [3, 0, 3, 0],
  [3, 0, 2, 1],
  [2, 1, 3, 0],
  [2, 1, 2, 1],
  [2, 0, 3, 1],
  [3, 1, 0, 2],
  [3, 0, 1, 2],
  [3, 0, 0, 3],
  [2, 1, 1, 2],
  [2, 1, 0, 3],
  [2, 0, 1, 3],
  [1, 3, 2, 0],
  [1, 2, 3, 0],
  [1, 2, 2, 1],
  [0, 3, 3, 0],
  [0, 3, 2, 1],
  [0, 2, 3, 1],
  [1, 3, 0, 2],
  [1, 2, 1, 2],
  [1, 2, 0, 3],
  [0, 3, 1, 2],
  [0, 3, 0, 3],
  [0, 2, 1, 3],
  [1, 1, 2, 2],
  [1, 0, 3, 2],
  [1, 0, 2, 3],
  [0, 1, 3, 2],
  [0, 1, 2, 3],
  [0, 0, 3, 3],
];

// (top, bottom) contribution for the check-character sum.
const CHECK_TOP_BOTTOM: readonly number[][] = [
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [1, 0],
  [2, 1],
  [2, 2],
  [2, 3],
  [2, 4],
  [2, 5],
  [2, 0],
  [3, 1],
  [3, 2],
  [3, 3],
  [3, 4],
  [3, 5],
  [3, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
  [4, 5],
  [4, 0],
  [5, 1],
  [5, 2],
  [5, 3],
  [5, 4],
  [5, 5],
  [5, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 0],
];

function charValue(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 65 + 10;
  if (ch >= "a" && ch <= "z") return ch.charCodeAt(0) - 97 + 10;
  return -1;
}

export class Rm4scc {
  static readonly symbology = "RM4SCC";

  /** Encode `input` (0–9, A–Z; whitespace ignored) into an RM4SCC barcode. */
  static encode(input: string): Barcode {
    const posns: number[] = [];
    for (const ch of input) {
      if (/\s/.test(ch)) continue;
      const v = charValue(ch);
      if (v < 0) throw EncodeError.invalidCharacter(ch);
      posns.push(v);
    }
    if (posns.length === 0) throw EncodeError.invalidInput("RM4SCC input must not be empty");

    const states: number[] = [1]; // start bar: ascender
    let top = 0;
    let bottom = 0;
    for (const p of posns) {
      states.push(...RM4KIX[p]);
      top += CHECK_TOP_BOTTOM[p][0];
      bottom += CHECK_TOP_BOTTOM[p][1];
    }

    const row = (top % 6) - 1 < 0 ? 5 : (top % 6) - 1;
    const column = (bottom % 6) - 1 < 0 ? 5 : (bottom % 6) - 1;
    states.push(...RM4KIX[6 * row + column]);
    states.push(0); // stop bar: full

    return matrix(Rm4scc.symbology, renderStates(states));
  }
}

/** Render 4-state bars into a 3-row matrix (bar every 2 columns). */
export function renderStates(states: number[]): boolean[][] {
  const width = states.length * 2 - 1;
  const rows = [
    new Array<boolean>(width).fill(false),
    new Array<boolean>(width).fill(false),
    new Array<boolean>(width).fill(false),
  ];
  states.forEach((state, i) => {
    const col = i * 2;
    if (state === 0 || state === 1) rows[0][col] = true; // ascender
    rows[1][col] = true; // tracker (always)
    if (state === 0 || state === 2) rows[2][col] = true; // descender
  });
  return rows;
}
