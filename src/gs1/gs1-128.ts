/**
 * GS1-128 barcode encoder.
 *
 * A Code 128 variant that begins with FNC1 to signal GS1 data. Accepts
 * parenthesized Application Identifier format, e.g.
 * `"(01)12345678901231(10)ABC123"`. The whole message is encoded in Code Set B
 * with FNC1 separators after variable-length AIs.
 */

import { Barcode, linear } from "../common/barcode.js";
import { EncodeError } from "../common/types.js";
import { FNC1, START_B, STOP, computeCheck, symbolsToBars } from "../linear/code128.js";

/** Fixed-length AIs (no FNC1 separator needed). GS1 General Specifications. */
const FIXED_LENGTH_AIS = new Set([
  "00",
  "01",
  "02",
  "03",
  "04",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "41",
]);

interface AiSegment {
  ai: string;
  data: string;
}

export class Gs1_128 {
  static readonly symbology = "GS1-128";

  /** Encode parenthesized AI input into a GS1-128 barcode. */
  static encode(input: string): Barcode {
    const t = input.trim();
    if (t.length === 0) throw EncodeError.invalidInput("GS1-128 input must not be empty");
    const segments = parseGs1(t);
    return linear(Gs1_128.symbology, buildBarcode(segments), 50);
  }
}

function parseGs1(input: string): AiSegment[] {
  const out: AiSegment[] = [];
  let pos = 0;
  while (pos < input.length) {
    if (input[pos] !== "(") throw EncodeError.invalidInput("expected '(' at start of AI");
    pos++; // skip '('
    const aiStart = pos;
    while (pos < input.length && input[pos] !== ")") {
      if (input[pos] < "0" || input[pos] > "9") {
        throw EncodeError.invalidInput("AI must contain only digits");
      }
      pos++;
    }
    if (pos >= input.length) throw EncodeError.invalidInput("unclosed '(' in AI specification");
    const ai = input.slice(aiStart, pos);
    pos++; // skip ')'
    const dataStart = pos;
    while (pos < input.length && input[pos] !== "(") pos++;
    const data = input.slice(dataStart, pos);
    if (data.length === 0) throw EncodeError.invalidInput("AI has no data");
    out.push({ ai, data });
  }
  if (out.length === 0) throw EncodeError.invalidInput("no valid AIs found in input");
  return out;
}

function buildBarcode(segments: AiSegment[]): boolean[] {
  const symbols: number[] = [];
  symbols.push(START_B, FNC1); // Start Code B + GS1 indicator.

  segments.forEach((seg, i) => {
    for (const ch of seg.ai) symbols.push(ch.charCodeAt(0) - 0x20);
    for (const ch of seg.data) {
      const b = ch.charCodeAt(0);
      if (b >= 0x20 && b <= 0x7e) symbols.push(b - 0x20);
    }
    // FNC1 separator after a variable-length AI (not after the last one).
    if (i + 1 < segments.length && !FIXED_LENGTH_AIS.has(seg.ai)) symbols.push(FNC1);
  });

  symbols.push(computeCheck(symbols));
  symbols.push(STOP);
  return symbolsToBars(symbols);
}
