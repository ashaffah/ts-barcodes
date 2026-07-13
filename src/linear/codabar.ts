/**
 * Codabar (NW-7) barcode encoder.
 *
 * Encodes digits and `- $ : / . +`. Each character is 7 elements (narrow=1,
 * wide=3). The `A`/`B` start/stop guards are added automatically.
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";

const N = false;
const W = true;

// 7 elements in bar/space order (bar, space, bar, space, bar, space, bar).
const CHARS: Record<string, boolean[]> = {
  "0": [N, N, N, N, N, W, W],
  "1": [N, N, N, N, W, W, N],
  "2": [N, N, N, W, N, N, W],
  "3": [W, W, N, N, N, N, N],
  "4": [N, N, W, N, N, W, N],
  "5": [W, N, N, N, N, W, N],
  "6": [N, W, N, N, N, N, W],
  "7": [N, W, N, N, W, N, N],
  "8": [N, W, W, N, N, N, N],
  "9": [W, N, N, W, N, N, N],
  "-": [N, N, N, W, W, N, N],
  $: [N, N, W, W, N, N, N],
  ":": [W, N, N, N, W, N, W],
  "/": [W, N, W, N, N, N, W],
  ".": [W, N, W, N, W, N, N],
  "+": [N, N, W, N, W, N, W],
};

const GUARDS: Record<string, boolean[]> = {
  A: [N, N, W, W, N, W, N],
  B: [N, N, N, W, N, W, W],
  C: [N, W, N, W, N, N, W],
  D: [N, N, N, W, W, W, N],
};

export class Codabar {
  static readonly symbology = "Codabar";

  /** Encode `input` into a Codabar barcode (`A`/`B` guards added). */
  static encode(input: string): Barcode {
    if (input.length === 0) throw EncodeError.invalidInput("Codabar input must not be empty");
    for (const ch of input) {
      if (!(ch in CHARS)) throw EncodeError.invalidCharacter(ch);
    }
    const bars: boolean[] = [];
    appendPattern(bars, GUARDS["A"]);
    for (const ch of input) {
      bars.push(false); // narrow inter-character gap
      appendPattern(bars, CHARS[ch]);
    }
    bars.push(false);
    appendPattern(bars, GUARDS["B"]);
    return linear(Codabar.symbology, bars, 50);
  }
}

function appendPattern(bars: boolean[], pattern: boolean[]): void {
  for (let i = 0; i < 7; i++) {
    const isBar = i % 2 === 0;
    const width = pattern[i] ? 3 : 1;
    for (let k = 0; k < width; k++) bars.push(isBar);
  }
}
