import assert from "node:assert/strict";
import { test } from "node:test";
import { matchReceiptLine, normalizeReceiptName } from "../src/lib/receipt/match.ts";

const products = [
  { id: 1, name: "Fresh milk", thaiName: "นมสด" },
  { id: 2, name: "Tissue rolls", thaiName: "กระดาษทิชชู่" },
  { id: 3, name: "Jasmine rice", thaiName: "ข้าวหอมมะลิ" },
  { id: 4, name: "Sticky rice", thaiName: "ข้าวเหนียว" },
  { id: 5, name: "Rice", thaiName: "ข้าว" },
];
const nothingRemembered = new Map();

test("pack sizes are ignored", () => {
  assert.equal(normalizeReceiptName("นมสด 1L"), "นมสด");
  assert.equal(normalizeReceiptName("ทิชชู่ 6 ม้วน"), "ทิชชู่");
});

test("a product name inside the printed text matches by name", () => {
  const match = matchReceiptLine("นมสด 1L", null, products, nothingRemembered);
  assert.deepEqual([match.productId, match.how], [1, "name"]);
});

test("the printed text inside a longer product name matches by name", () => {
  const match = matchReceiptLine("ทิชชู่ 6 ม้วน", null, products, nothingRemembered);
  assert.deepEqual([match.productId, match.how], [2, "name"]);
});

test("the longest contained name wins", () => {
  const match = matchReceiptLine("ข้าวหอมมะลิ 5kg", null, products, nothingRemembered);
  assert.equal(match.productId, 3);
});

test("a remembered match beats a name match", () => {
  const remembered = new Map([[normalizeReceiptName("ข้าวหอมมะลิ 5kg"), 4]]);
  const match = matchReceiptLine("ข้าวหอมมะลิ 5kg", null, products, remembered);
  assert.deepEqual([match.productId, match.how], [4, "remembered"]);
});

test("a remembered product that no longer exists is skipped", () => {
  const remembered = new Map([[normalizeReceiptName("นมสด"), 99]]);
  assert.equal(matchReceiptLine("นมสด", null, products, remembered).how, "name");
});

test("an unknown line needs the user", () => {
  const match = matchReceiptLine("น้ำมันพืช 1L", "Vegetable oil", products, nothingRemembered);
  assert.deepEqual([match.productId, match.how], [null, "none"]);
  assert.deepEqual(match.candidateIds, []);
});

test("a near spelling is a best guess", () => {
  const match = matchReceiptLine("Jasmin rise", null, products, nothingRemembered);
  assert.deepEqual([match.productId, match.how], [3, "guess"]);
});

test("a name that's only a small flavour word in the line doesn't match it by name", () => {
  const withShrimp = [...products, { id: 6, name: "Shrimp", thaiName: "กุ้ง" }];
  const match = matchReceiptLine("มาม่า ต้มยำกุ้ง", null, withShrimp, nothingRemembered);
  assert.notEqual(match.productId, 6);
  assert.notEqual(match.how, "name");
});

test("the head word of a Thai line still matches, ahead of a flavour word later in it", () => {
  const withNoodles = [...products, { id: 6, name: "Shrimp", thaiName: "กุ้ง" }, { id: 7, name: "Instant noodles", thaiName: "มาม่า" }];
  const match = matchReceiptLine("มาม่า ต้มยำกุ้ง", null, withNoodles, nothingRemembered);
  assert.equal(match.productId, 7);
  assert.equal(match.how, "name");
});
