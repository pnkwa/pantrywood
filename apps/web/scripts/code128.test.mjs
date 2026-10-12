// Printed labels must scan: encode, draw the bars as pixels, decode with zxing, expect the same text.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { encodeCode128, labelCodeFor } from "../src/lib/scan/code128.ts";

const require = createRequire(import.meta.url);
const wasm = readFileSync(require.resolve("zxing-wasm/reader/zxing_reader.wasm"));
prepareZXingModule({ overrides: { wasmBinary: wasm.buffer } });

const MODULE_PIXELS = 3;
const QUIET_MODULES = 12;
const HEIGHT = 60;

const renderBars = (widths) => {
  const totalModules = widths.reduce((sum, width) => sum + width, 0) + QUIET_MODULES * 2;
  const width = totalModules * MODULE_PIXELS;
  const data = new Uint8ClampedArray(width * HEIGHT * 4).fill(255);
  let cursor = QUIET_MODULES * MODULE_PIXELS;
  widths.forEach((barWidth, index) => {
    const isBar = index % 2 === 0;
    for (let x = cursor; x < cursor + barWidth * MODULE_PIXELS; x++) {
      for (let y = 0; y < HEIGHT; y++) {
        const pixel = (y * width + x) * 4;
        if (isBar) data.fill(0, pixel, pixel + 3);
      }
    }
    cursor += barWidth * MODULE_PIXELS;
  });
  return { data, width, height: HEIGHT, colorSpace: "srgb" };
};

for (const text of [labelCodeFor(12), labelCodeFor(987654), "Hello-Pantry 42"]) {
  test(`Code 128 round-trips ${JSON.stringify(text)}`, async () => {
    const results = await readBarcodes(renderBars(encodeCode128(text)), { formats: ["Code128"] });
    assert.equal(results[0]?.text, text);
  });
}
