import assert from "node:assert/strict";
import { test } from "node:test";
import { boxesFromMap, ctcDecode, detectSize, recognizeWidth, toTensor } from "../src/lib/ocr/ocr.ts";

test("the detector sees the photo scaled to its limit, each side a multiple of 32", () => {
  assert.deepEqual(detectSize(3000, 4000), { width: 960, height: 1280 });
  assert.deepEqual(detectSize(500, 300), { width: 512, height: 288 });
  assert.deepEqual(detectSize(10, 10), { width: 32, height: 32 });
  assert.equal(recognizeWidth(200, 20), 480);
  assert.equal(recognizeWidth(100000, 20), 1280);
});

test("pixels become a BGR tensor, normalized per channel", () => {
  // One pure red pixel: red lands in the last plane.
  const tensor = toTensor([255, 0, 0, 255], 1, 1, [0.5, 0.5, 0.5], [0.5, 0.5, 0.5]);
  assert.deepEqual([...tensor], [-1, -1, 1]);
});

test("each strong region of the probability map becomes a slightly grown box; weak ones are dropped", () => {
  const width = 40;
  const height = 20;
  const map = new Float32Array(width * height);
  const paint = (x0, y0, x1, y1, value) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) map[y * width + x] = value;
  };
  paint(2, 2, 17, 6, 0.9);
  paint(22, 12, 37, 16, 0.9);
  paint(2, 14, 8, 17, 0.4);
  const boxes = boxesFromMap(map, width, height).sort((first, second) => first.y - second.y);
  assert.equal(boxes.length, 2);
  const [first] = boxes;
  assert.ok(first.x < 2 && first.y < 2 && first.x + first.width > 18 && first.y + first.height > 7);
  assert.ok(first.score > 0.85);
});

test("CTC: repeats collapse, blanks split doubled letters, the last class is a space", () => {
  const dictionary = ["a", "b", "ก"];
  const classes = dictionary.length + 2;
  const step = (index) => Array.from({ length: classes }, (_, candidate) => (candidate === index ? 0.9 : 0.025));
  // a a _ a b _ space ก
  const scores = [1, 1, 0, 1, 2, 0, 4, 3].flatMap(step);
  const { text, score } = ctcDecode(scores, 8, classes, dictionary);
  assert.equal(text, "aab ก");
  assert.ok(Math.abs(score - 0.9) < 1e-6);
});

test("CTC keeps the letters the model also considered at each step", () => {
  const dictionary = ["ด", "อ", "ก"];
  const classes = dictionary.length + 2;
  // Step 1: อ 0.6, ด 0.35 (a real alternative), ก 0.01 (not).
  const scores = [[0.04, 0.35, 0.6, 0.01, 0]].flat();
  const { text, alternatives } = ctcDecode(scores, 1, classes, dictionary);
  assert.equal(text, "อ");
  assert.deepEqual(alternatives, [["ด"]]);
});
