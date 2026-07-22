# @ashaffah/barcodes

A **universal bar/QR code generation library** for TypeScript & JavaScript.
Zero runtime dependencies, works in the browser, Node and Deno. A faithful port
of the Rust [`barcodes`](https://crates.io/crates/barcodes) crate — every
symbology is verified against real decoders (ZXing, zbar, dmtxread) or, for the
4-state postal codes, bit-for-bit against zint.

## Features

- **17 symbologies**: linear, 2D and postal
- Zero runtime dependencies
- SVG output built in (`toSVG()`); raw module data for custom rendering
- ESM + CJS, fully typed
- Universal: browser, Node, Deno

## Install

```sh
npm install @ashaffah/barcodes
```

## Usage

Every encoder exposes a static `encode()` that returns a `Barcode`:

```ts
import { Ean13, QrCode, toSVG } from "@ashaffah/barcodes";

// Linear
const ean = Ean13.encode("5901234123457");
const svg = ean.toSVG(); // -> "<svg ...>...</svg>"
console.log(ean.data.kind); // "linear"

// QR (auto numeric/alphanumeric/byte selection)
const qr = QrCode.encode("https://example.com");
console.log(qr.data.kind); // "matrix"
```

### Raw modules

`Barcode.data` is a discriminated union you can render however you like:

```ts
const qr = QrCode.encode("HELLO");
if (qr.data.kind === "matrix") {
  const { modules, width, height } = qr.data; // modules[y][x] === true → dark
}

const bc = Ean13.encode("5901234123457");
if (bc.data.kind === "linear") {
  const { bars, height } = bc.data; // bars[i] === true → dark bar
}
```

### SVG options

```ts
ean.toSVG({ moduleSize: 6, foreground: "#111", background: "#fff", linearQuiet: 20 });
```

The generated `<svg>` has a `viewBox` and `style="max-width:100%;height:auto"`, so it
keeps its intrinsic size but scales **down** to fit a narrower container while
preserving aspect ratio. To let it grow to fill a wider container, override with
CSS — `svg { width: 100%; height: auto; }`.

### QR options

`QrCode.encode()` uses sensible defaults (ECC Medium, automatic version and
mask). For control, pass options or use the native API:

```ts
import { QrCode, Ecc } from "@ashaffah/barcodes";

QrCode.encode("payload", { ecl: Ecc.HIGH, minVersion: 5, mask: 3 });

// Native API with getModule():
const q = QrCode.encodeText("payload", { ecl: Ecc.QUARTILE });
q.getModule(0, 0); // boolean
q.version; // 1..40
```

## Supported symbologies

| Symbology                   | Class        | Verified with      |
| --------------------------- | ------------ | ------------------ |
| EAN-13                      | `Ean13`      | ZXing + zbar       |
| EAN-8                       | `Ean8`       | ZXing + zbar       |
| UPC-A                       | `UpcA`       | ZXing + zbar       |
| UPC-E                       | `UpcE`       | ZXing + zbar       |
| Code 128 (A/B/C)            | `Code128`    | ZXing + zbar       |
| Code 39                     | `Code39`     | ZXing + zbar       |
| Code 93                     | `Code93`     | ZXing + zbar       |
| Codabar                     | `Codabar`    | ZXing + zbar       |
| ITF (Interleaved 2 of 5)    | `Itf`        | ZXing + zbar       |
| GS1-128                     | `Gs1_128`    | ZXing + zbar       |
| GS1 DataBar Omnidirectional | `DataBar`    | ZXing + zbar       |
| QR Code (Model 2)           | `QrCode`     | ZXing + zbar       |
| Data Matrix (ECC 200)       | `DataMatrix` | ZXing + dmtxread   |
| PDF417                      | `Pdf417`     | ZXing              |
| Aztec Code                  | `Aztec`      | ZXing              |
| USPS Intelligent Mail (IMb) | `Imb`        | zint + USPS vector |
| Royal Mail RM4SCC           | `Rm4scc`     | zint               |

## Input notes

- **EAN/UPC**: pass with or without the trailing check digit — it is computed
  and validated automatically.
- **Codabar**: `A`/`B` start/stop guards are added automatically; pass bare data.
- **GS1-128**: parenthesized AI format, e.g. `Gs1_128.encode("(01)0123...")`.
- **DataBar**: 13- or 14-digit GTIN.
- **IMb**: `Imb.encode("01234567094987654321-01234567891")` (20-digit tracker,
  optional `-` + 0/5/9/11-digit routing code). Postal 4-state codes render as a
  3-row matrix (ascender / tracker / descender).

## Errors

Encoders throw `EncodeError` (with a `.kind` of `"InvalidInput"`,
`"InvalidCharacter"` or `"DataTooLong"`) on invalid input.

## License

MIT
