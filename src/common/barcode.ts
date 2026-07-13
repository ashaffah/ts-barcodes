/** The object returned by every encoder. */

import type { BarcodeData } from "./types.js";
import { toSVG, type SvgOptions } from "./render.js";

/**
 * An encoded barcode: its module data plus rendering helpers.
 *
 * Inspect {@link Barcode.data} (a discriminated union on `kind`) for the raw
 * modules, or call {@link Barcode.toSVG} to render.
 */
export class Barcode {
  /** Human-readable symbology name, e.g. `"EAN-13"`. */
  readonly symbology: string;
  /** The raw module data (linear bars or a matrix grid). */
  readonly data: BarcodeData;

  constructor(symbology: string, data: BarcodeData) {
    this.symbology = symbology;
    this.data = data;
  }

  /** `"linear"` or `"matrix"`. */
  get kind(): BarcodeData["kind"] {
    return this.data.kind;
  }

  /** Render the barcode as an SVG string. */
  toSVG(options?: SvgOptions): string {
    return toSVG(this.data, options);
  }
}

/** Build a linear {@link Barcode} from a module sequence. */
export function linear(symbology: string, bars: boolean[], height: number): Barcode {
  return new Barcode(symbology, { kind: "linear", bars, height });
}

/** Build a matrix {@link Barcode} from a row-major grid. */
export function matrix(symbology: string, modules: boolean[][]): Barcode {
  const height = modules.length;
  const width = height > 0 ? modules[0].length : 0;
  return new Barcode(symbology, { kind: "matrix", modules, width, height });
}
