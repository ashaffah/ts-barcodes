/**
 * Output types shared by every barcode symbology.
 *
 * A module is a single cell of the symbol: `true` = dark, `false` = light.
 * Linear barcodes expose a 1-D `bars` array; 2-D symbols expose a row-major
 * `modules` grid.
 */

/** The kind of error raised while encoding. */
export type EncodeErrorKind = "InvalidInput" | "InvalidCharacter" | "DataTooLong";

/** Error thrown when an input cannot be encoded. */
export class EncodeError extends Error {
  readonly kind: EncodeErrorKind;

  constructor(kind: EncodeErrorKind, message: string) {
    super(message);
    this.name = "EncodeError";
    this.kind = kind;
  }

  static invalidInput(message: string): EncodeError {
    return new EncodeError("InvalidInput", message);
  }

  static invalidCharacter(ch: string): EncodeError {
    return new EncodeError("InvalidCharacter", `invalid character: ${JSON.stringify(ch)}`);
  }

  static dataTooLong(): EncodeError {
    return new EncodeError("DataTooLong", "data too long for this symbology");
  }
}

/** A one-dimensional (linear) barcode. */
export interface LinearBarcode {
  readonly kind: "linear";
  /** Module sequence: `true` = dark bar, `false` = light space. */
  readonly bars: boolean[];
  /** Recommended render height in modules (display hint only). */
  readonly height: number;
}

/** A two-dimensional (matrix) barcode. */
export interface MatrixBarcode {
  readonly kind: "matrix";
  /** Row-major grid of modules: `modules[row][col]`, `true` = dark. */
  readonly modules: boolean[][];
  /** Number of columns. */
  readonly width: number;
  /** Number of rows. */
  readonly height: number;
}

/** The encoded representation of any barcode. */
export type BarcodeData = LinearBarcode | MatrixBarcode;
