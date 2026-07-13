import { Imb } from "../src/postal/imb.js";
import { Rm4scc } from "../src/postal/rm4scc.js";
import type { BarcodeData } from "../src/common/types.js";

function daft(data: BarcodeData): string {
  if (data.kind !== "matrix") throw new Error("expected matrix");
  const { modules, width } = data;
  const nbars = (width + 1) / 2;
  let s = "";
  for (let i = 0; i < nbars; i++) {
    const col = i * 2;
    const top = modules[0][col];
    const bot = modules[2][col];
    s += top && bot ? "F" : top ? "A" : bot ? "D" : "T";
  }
  return s;
}

const imb = daft(Imb.encode("01234567094987654321-01234567891").data);
const rm = daft(Rm4scc.encode("SN34RD1A").data);
const IMB_REF = "AADTFFDFTDADTAADAATFDTDDAAADDTDTTDAFADADDDTFFFDDTTTADFAAADFTDAADA";
const RM_REF = "AFTFTFDTADTAFDTFAFTADTFADTDAFDADAADDAF";
console.log("IMb   :", imb);
console.log("  ref :", IMB_REF, imb === IMB_REF ? "✅ MATCH" : "❌ DIFF");
console.log("RM4SCC:", rm);
console.log("  ref :", RM_REF, rm === RM_REF ? "✅ MATCH" : "❌ DIFF");
