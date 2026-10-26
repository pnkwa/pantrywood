import assert from "node:assert/strict";
import { test } from "node:test";
import { groupRows, normalize, parseDate, parseReceipt } from "../src/lib/receipt/parse.ts";

/** Receipt rows as OCR boxes: each row 30 px apart, its parts left to right, slightly wobbly like a photo. */
const boxes = (rows) =>
  rows.flatMap((parts, rowIndex) =>
    parts.map((text, partIndex) => ({ text, x: 20 + partIndex * 200, y: 40 + rowIndex * 30 + (partIndex % 2) * 3, width: 150, height: 20, score: 0.95 })),
  );

const options = { imageHeight: 1000, currentYear: 2026 };

test("a Thai convenience-store receipt: store, Buddhist-era date, items, total; no tax, cash or change", () => {
  const scan = parseReceipt(
    boxes([
      ["เซเว่น อีเลฟเว่น"],
      ["สาขา 01234"],
      ["26/10/69", "14:32"],
      ["นมสด 1L", "52.00"],
      ["ทิชชู่ 6 ม้วน", "89.00"],
      ["มาม่า", "2 x 7.00", "14.00"],
      ["รวม 3 ชิ้น", "155.00"],
      ["ยอดสุทธิ", "155.00"],
      ["VAT 7%", "10.14"],
      ["เงินสด", "200.00"],
      ["เงินทอน", "45.00"],
    ]),
    options,
  );
  assert.equal(scan.store, "เซเว่น อีเลฟเว่น");
  assert.equal(scan.date, "2026-10-26");
  assert.equal(scan.total, 155);
  assert.equal(scan.currency, "THB");
  assert.deepEqual(
    scan.lines.map((line) => [line.name, line.quantity, line.unit_price, line.line_total, line.kind]),
    [
      ["นมสด 1L", 1, 52, 52, "food"],
      ["ทิชชู่ 6 ม้วน", 1, 89, 89, "supply"],
      ["มาม่า", 2, 7, 14, "food"],
    ],
  );
});

test("an English supermarket receipt with a quantity line under its item and a discount", () => {
  const scan = parseReceipt(
    boxes([
      ["FRESH MART"],
      ["2026-10-20"],
      ["Jasmine Rice 5kg", "189.00"],
      ["Bananas", "45.00"],
      ["3 @ 15.00", "45.00"],
      ["Shampoo 400ml", "129.00"],
      ["Member discount", "-20.00"],
      ["SUBTOTAL", "363.00"],
      ["TOTAL", "343.00"],
      ["CASH", "500.00"],
      ["CHANGE", "157.00"],
    ]),
    options,
  );
  assert.equal(scan.store, "FRESH MART");
  assert.equal(scan.date, "2026-10-20");
  assert.equal(scan.total, 343);
  assert.deepEqual(
    scan.lines.map((line) => [line.name, line.quantity, line.unit_price, line.line_total, line.kind]),
    [
      ["Jasmine Rice 5kg", 1, 189, 189, "food"],
      ["Bananas", 3, 15, 45, "food"],
      ["Shampoo 400ml", 1, 129, 129, "supply"],
    ],
  );
  assert.ok(scan.lines.every((line) => line.y !== null && line.y > 0 && line.y < 1));
});

test("Thai digits and OCR's letter-for-digit slips are read as numbers", () => {
  assert.equal(normalize("ไข่ไก่ ๑๐ ฟอง ๔๕.๐๐"), "ไข่ไก่ 10 ฟอง 45.00");
  assert.equal(normalize("Milk 5O.0O"), "Milk 50.00");
  assert.equal(normalize("Bread 2l.50"), "Bread 21.50");
});

test("dates in every common receipt shape", () => {
  assert.equal(parseDate("26/10/2569 14:02", 2026), "2026-10-26");
  assert.equal(parseDate("26-10-26", 2026), "2026-10-26");
  assert.equal(parseDate("2026.10.05", 2026), "2026-10-05");
  assert.equal(parseDate("Tel 02-123-4567", 2026), null);
  assert.equal(parseDate("31/13/2026", 2026), null);
});

test("boxes on one printed line join left to right, even when the photo is a little tilted", () => {
  const rows = groupRows([
    { text: "52.00", x: 300, y: 103, width: 60, height: 20, score: 1 },
    { text: "นมสด", x: 20, y: 100, width: 60, height: 20, score: 1 },
    { text: "ขนมปัง", x: 20, y: 132, width: 60, height: 20, score: 1 },
  ]);
  assert.deepEqual(rows.map((row) => row.text), ["นมสด 52.00", "ขนมปัง"]);
});
