/**
 * ts-barcodes — universal bar/QR code generation for TypeScript & JavaScript.
 *
 * Every encoder exposes a static `encode()` returning a {@link Barcode} with
 * `.data` (raw modules) and `.toSVG()`. Zero runtime dependencies.
 */

// Core types & rendering
export { Barcode } from "./common/barcode.js";
export { EncodeError } from "./common/types.js";
export type { BarcodeData, LinearBarcode, MatrixBarcode, EncodeErrorKind } from "./common/types.js";
export { toSVG } from "./common/render.js";
export type { SvgOptions } from "./common/render.js";

// EAN / UPC
export { Ean13 } from "./ean-upc/ean13.js";
export { Ean8 } from "./ean-upc/ean8.js";
export { UpcA } from "./ean-upc/upca.js";
export { UpcE } from "./ean-upc/upce.js";

// Linear
export { Code128 } from "./linear/code128.js";
export { Code39 } from "./linear/code39.js";
export { Code93 } from "./linear/code93.js";
export { Codabar } from "./linear/codabar.js";
export { Itf } from "./linear/itf.js";

// GS1
export { Gs1_128 } from "./gs1/gs1-128.js";
export { DataBar } from "./gs1/databar.js";

// 2D
export { QrCode, Ecc } from "./twod/qrcode.js";
export type { QrOptions } from "./twod/qrcode.js";
export { DataMatrix } from "./twod/datamatrix.js";
export { Pdf417 } from "./twod/pdf417.js";
export { Aztec } from "./twod/aztec.js";

// Postal
export { Imb } from "./postal/imb.js";
export { Rm4scc } from "./postal/rm4scc.js";
