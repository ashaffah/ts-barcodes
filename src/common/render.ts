/** SVG rendering for encoded barcodes. */

import type { BarcodeData } from "./types.js";

/** Options for {@link toSVG}. */
export interface SvgOptions {
  /** Pixels per module width for linear bars (default 2). */
  barWidth?: number;
  /** Pixels per module for 2-D symbols (default 4). */
  moduleSize?: number;
  /** Quiet-zone width, in pixels, for linear barcodes (default 20). */
  linearQuiet?: number;
  /** Quiet-zone width, in modules, for 2-D symbols (default 4). */
  matrixQuiet?: number;
  /** Foreground (dark module) colour (default "black"). */
  foreground?: string;
  /** Background colour (default "white"). */
  background?: string;
}

const DEFAULTS = {
  barWidth: 2,
  moduleSize: 4,
  linearQuiet: 20,
  matrixQuiet: 4,
  foreground: "black",
  background: "white",
};

/** Render an encoded barcode as an SVG string. */
export function toSVG(data: BarcodeData, options: SvgOptions = {}): string {
  const o = { ...DEFAULTS, ...options };
  return data.kind === "linear" ? renderLinear(data, o) : renderMatrix(data, o);
}

function renderLinear(data: Extract<BarcodeData, { kind: "linear" }>, o: typeof DEFAULTS): string {
  const { bars, height } = data;
  const bw = o.barWidth;
  const quiet = o.linearQuiet;
  const totalWidth = bars.length * bw + 2 * quiet;
  const totalHeight = height + 2 * quiet;

  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" ` +
    `viewBox="0 0 ${totalWidth} ${totalHeight}">` +
    `<rect width="${totalWidth}" height="${totalHeight}" fill="${o.background}"/>`;

  // Merge consecutive dark modules into a single rect for compact output.
  let run = 0;
  for (let i = 0; i <= bars.length; i++) {
    if (i < bars.length && bars[i]) {
      run++;
    } else if (run > 0) {
      const x = quiet + (i - run) * bw;
      s += `<rect x="${x}" y="${quiet}" width="${run * bw}" height="${height}" fill="${o.foreground}"/>`;
      run = 0;
    }
  }
  return s + "</svg>";
}

function renderMatrix(data: Extract<BarcodeData, { kind: "matrix" }>, o: typeof DEFAULTS): string {
  const { modules, width, height } = data;
  const m = o.moduleSize;
  const quiet = o.matrixQuiet * m;
  const pxWidth = width * m + 2 * quiet;
  const pxHeight = height * m + 2 * quiet;

  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pxWidth}" height="${pxHeight}" ` +
    `viewBox="0 0 ${pxWidth} ${pxHeight}">` +
    `<rect width="${pxWidth}" height="${pxHeight}" fill="${o.background}"/>`;

  for (let row = 0; row < height; row++) {
    const cells = modules[row];
    // Merge horizontal runs of dark modules per row.
    let run = 0;
    for (let col = 0; col <= width; col++) {
      if (col < width && cells[col]) {
        run++;
      } else if (run > 0) {
        const x = quiet + (col - run) * m;
        const y = quiet + row * m;
        s += `<rect x="${x}" y="${y}" width="${run * m}" height="${m}" fill="${o.foreground}"/>`;
        run = 0;
      }
    }
  }
  return s + "</svg>";
}
