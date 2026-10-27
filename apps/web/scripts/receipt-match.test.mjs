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

test("a remembered line read with slightly different OCR slips is offered as the best guess", () => {
  // Saved in Grocy under an English name, so only the remembered receipt text can find it.
  const snacks = [...products, { id: 8, name: "Honey lemon drink", thaiName: "" }];
  const remembered = new Map([[normalizeReceiptName("โออิชีน้ำนึ่งมะนาว80"), 8]]);
  const match = matchReceiptLine("โออิช์น้ำนึ่งมะนาว80", null, snacks, remembered);
  assert.equal(match.productId, 8);
  assert.equal(match.how, "guess");
});

test("a remembered line doesn't pull in a different product that only shares a brand", () => {
  const remembered = new Map([[normalizeReceiptName("โออิชีน้ำนึ่งมะนาว80"), 1]]);
  const match = matchReceiptLine("โออิชีกรีนทีต้นตำรับ", null, products, remembered);
  assert.notEqual(match.productId, 1);
});

test("lines printed alike (same price, close reading) share one reading: the one closest to the rest", async () => {
  const { unifyRepeats } = await import("../src/lib/receipt/match.ts");
  const names = unifyRepeats([
    { name: "ทิปโก้พรุน จุ่น100%", line_total: 18 },
    { name: "ทิปโก้พรุนองุ่น100%", line_total: 18 },
    { name: "ทิปโก้พรุนอง100%", line_total: 18 },
    { name: "ทิปโก้พรุนองุ่น100%", line_total: 18 },
    { name: "ทิปโก้เชอร์รี่เบอร์รี่", line_total: 18 },
    { name: "ทิปโก้พรุนองุ่น100%", line_total: 20 },
  ]);
  assert.deepEqual(names.slice(0, 4), Array(4).fill("ทิปโก้พรุนองุ่น100%"));
  assert.equal(names[4], "ทิปโก้เชอร์รี่เบอร์รี่");
  assert.equal(names[5], "ทิปโก้พรุนองุ่น100%");
});

test("a name you corrected before replaces the same misreading, or a close one", async () => {
  const { correctedName } = await import("../src/lib/receipt/match.ts");
  const corrections = new Map([[normalizeReceiptName("โอเกร์ตเมจิ รสจิจ"), "โยเกิร์ตเมจิ รสจืด"]]);
  assert.equal(correctedName("โอเกร์ตเมจิ รสจิจ", corrections), "โยเกิร์ตเมจิ รสจืด");
  assert.equal(correctedName("โอเกิร์ตเมจิ รสจิด", corrections), "โยเกิร์ตเมจิ รสจืด");
  assert.equal(correctedName("ทิปโก้พรุนองุ่น100%", corrections), "ทิปโก้พรุนองุ่น100%");
});

test("two flavours of one brand at one price stay two different lines", async () => {
  const { unifyRepeats } = await import("../src/lib/receipt/match.ts");
  const names = unifyRepeats([
    { name: "โยเกิร์ตเมจิ รสสตรอเบอร์รี่", line_total: 15 },
    { name: "โยเกิร์ตเมจิ รสบลูเบอร์รี่", line_total: 15 },
  ]);
  assert.deepEqual(names, ["โยเกิร์ตเมจิ รสสตรอเบอร์รี่", "โยเกิร์ตเมจิ รสบลูเบอร์รี่"]);
});

test("an earlier fix isn't applied to a different flavour of the same product", async () => {
  const { correctedName } = await import("../src/lib/receipt/match.ts");
  const corrections = new Map([[normalizeReceiptName("โอเกร์ตเมจิ รสจิจ"), "โยเกิร์ตเมจิ รสจืด"]]);
  assert.equal(correctedName("โยเกิร์ตเมจิ รสสตรอเบอร์รี่", corrections), "โยเกิร์ตเมจิ รสสตรอเบอร์รี่");
});
