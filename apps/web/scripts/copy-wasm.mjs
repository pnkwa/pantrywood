// Served from /public so barcode and receipt reading work offline, without a CDN.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const publicDir = join(import.meta.dirname, "..", "public");

const copy = (source, folder, name) => {
  mkdirSync(join(publicDir, folder), { recursive: true });
  copyFileSync(source, join(publicDir, folder, name));
};

copy(require.resolve("zxing-wasm/reader/zxing_reader.wasm"), "zxing", "zxing_reader.wasm");
const ortDist = dirname(require.resolve("onnxruntime-web/ort-wasm-simd-threaded.wasm"));
for (const name of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) copy(join(ortDist, name), "ocr/ort", name);
