/**
 * Render every implemented symbology to a PNG under `gen/` so an external
 * decoder (ZXing/zbar) can verify scannability. Run: `node scripts/gen.ts`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { barcodeToPNG } from "./png.js";
import type { Barcode } from "../src/common/barcode.js";

import { Ean13 } from "../src/ean-upc/ean13.js";
import { Ean8 } from "../src/ean-upc/ean8.js";
import { UpcA } from "../src/ean-upc/upca.js";
import { UpcE } from "../src/ean-upc/upce.js";
import { Code128 } from "../src/linear/code128.js";
import { Code39 } from "../src/linear/code39.js";
import { Code93 } from "../src/linear/code93.js";
import { Codabar } from "../src/linear/codabar.js";
import { Itf } from "../src/linear/itf.js";
import { Gs1_128 } from "../src/gs1/gs1-128.js";
import { DataBar } from "../src/gs1/databar.js";
import { QrCode } from "../src/twod/qrcode.js";
import { DataMatrix } from "../src/twod/datamatrix.js";
import { Pdf417 } from "../src/twod/pdf417.js";
import { Aztec } from "../src/twod/aztec.js";

const OUT = new URL("../gen/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

interface Case {
  name: string;
  make: () => Barcode;
  scale?: number;
}

const cases: Case[] = [
  { name: "ean13", make: () => Ean13.encode("5901234123457") },
  { name: "ean8", make: () => Ean8.encode("96385074") },
  { name: "upca", make: () => UpcA.encode("03600029145") },
  { name: "upce", make: () => UpcE.encode("01234505") },
  { name: "code128", make: () => Code128.encode("Hello128"), scale: 2 },
  { name: "code39", make: () => Code39.encode("CODE39"), scale: 2 },
  { name: "code93", make: () => Code93.encode("CODE93"), scale: 2 },
  { name: "codabar", make: () => Codabar.encode("40156"), scale: 2 },
  { name: "itf", make: () => Itf.encode("1234567890"), scale: 2 },
  { name: "gs1_128", make: () => Gs1_128.encode("(01)01234567890128"), scale: 2 },
  { name: "databar", make: () => DataBar.encode("2001234567890"), scale: 3 },
  {
    name: "qr_url",
    make: () => QrCode.encode("https://www.npmjs.com/package/@ashaffah/barcodes"),
    scale: 4,
  },
  { name: "qr_numeric", make: () => QrCode.encode("8675309"), scale: 4 },
  { name: "qr_alnum", make: () => QrCode.encode("HELLO WORLD 123"), scale: 4 },
  { name: "datamatrix", make: () => DataMatrix.encode("Hello DataMatrix 2026"), scale: 5 },
  { name: "datamatrix_num", make: () => DataMatrix.encode("123456"), scale: 5 },
  {
    name: "pdf417",
    make: () => Pdf417.encode("PDF417 test payload — larger data works too!"),
    scale: 2,
  },
  { name: "aztec", make: () => Aztec.encode("HELLO AZTEC 2026"), scale: 5 },
  { name: "aztec_long", make: () => Aztec.encode("Hello, Aztec Code! 1234567890"), scale: 5 },
];

for (const c of cases) {
  try {
    const bc = c.make();
    const png = barcodeToPNG(bc.data, c.scale ?? 3);
    writeFileSync(`${OUT}${c.name}.png`, png);
    const dims =
      bc.data.kind === "linear"
        ? `${bc.data.bars.length} bars`
        : `${bc.data.width}x${bc.data.height}`;
    console.log(`OK   ${c.name.padEnd(12)} ${bc.symbology.padEnd(10)} ${dims}`);
  } catch (e) {
    console.log(`FAIL ${c.name.padEnd(12)} ${(e as Error).message}`);
  }
}
console.log(`\nwrote PNGs to ${OUT}`);
