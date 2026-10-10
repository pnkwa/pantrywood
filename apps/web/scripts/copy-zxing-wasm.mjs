// Serves zxing-wasm's reader binary from /public so camera scanning works offline, without a CDN.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const source = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
const target = join(import.meta.dirname, "..", "public", "zxing");
mkdirSync(target, { recursive: true });
copyFileSync(source, join(target, "zxing_reader.wasm"));
