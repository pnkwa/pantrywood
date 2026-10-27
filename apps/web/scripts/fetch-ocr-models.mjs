// PaddleOCR's PP-OCRv5 models (Apache-2.0) as ONNX, from the oar-ocr project's release.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "https://github.com/GreatV/oar-ocr/releases/download/v0.3.0";
const FILES = {
  "pp-ocrv5_mobile_det.onnx": "1eb7b4f7ab657ebd1c66d5f79bca7497f29768a2e3c15e52daecbba1a8e4a039",
  "th_pp-ocrv5_mobile_rec.onnx": "5f6ee21242691681261fee01bc39867da9cc8ff9b889f2f048b3cb7f74380217",
  "ppocrv5_th_dict.txt": "57f5406f94bb6688fb7077f7be65f08bbd71cecf48c01ea26c522cb5c4836b7a",
};

const folder = join(import.meta.dirname, "..", "public", "ocr");
mkdirSync(folder, { recursive: true });
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

for (const [name, hash] of Object.entries(FILES)) {
  const target = join(folder, name);
  if (existsSync(target) && sha256(readFileSync(target)) === hash) continue;
  const response = await fetch(`${SOURCE}/${name}`);
  if (!response.ok) throw new Error(`Couldn't download ${name}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== hash) throw new Error(`${name} doesn't match its expected hash; not saving it.`);
  writeFileSync(target, bytes);
  console.log(`Downloaded ${name}`);
}
