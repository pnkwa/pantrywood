import assert from "node:assert/strict";
import { test } from "node:test";
import { correctThai } from "../src/lib/receipt/correct.ts";
import { THAI_RECEIPT_WORDS } from "../src/lib/receipt/thai-words.ts";

const fix = (text) => correctThai(text, THAI_RECEIPT_WORDS);

test("look-alike letters and slipped marks become the real words", () => {
  // As the OCR read real 7-Eleven dot-matrix receipts.
  assert.equal(fix("โปโอน่าธรรมดา"), "โบโลน่าธรรมดา");
  assert.equal(fix("โออิชีน้ำนึ่งมะนาว80"), "โออิชิน้ำผึ้งมะนาว80");
  assert.equal(fix("พลัดปูสัดไชกุ้ง Ezyt"), "สลัดปูอัดไข่กุ้ง Ezyt");
  assert.equal(fix("พิปโกเซอร์ร์เบอร์รี"), "ทิปโก้เชอร์รี่เบอร์รี่");
  assert.equal(fix("ศิงโชรสบาร์บีดิว 3"), "ฟิชโชรสบาร์บีคิว 3");
  // "อี" read as one letter "ธ", and "อ" with its mark dropped.
  assert.equal(fix("สบู่วิตามินธเบนเนท"), "สบู่วิตามินอีเบนเนท");
  assert.equal(fix("สบุวิตามินอ์เบนเนท"), "สบู่วิตามินอีเบนเนท");
});

test("names read correctly stay exactly as they were", () => {
  for (const name of ["นมสด 1L", "ทิชชู่ 6 ม้วน", "มาม่า ต้มยำกุ้ง", "ข้าวหอมมะลิ 5kg", "แชมพู 400ml", "น้ำมันพืช 1L", "กระเทียมโทน", "หมูยอ"]) {
    assert.equal(fix(name), name);
  }
});

test("Latin letters, digits and prices are never touched", () => {
  assert.equal(fix("Jasmine Rice 5kg 189.00"), "Jasmine Rice 5kg 189.00");
  assert.equal(fix("@25.00 50.00"), "@25.00 50.00");
});

test("a letter the model itself considered wins over the one it printed", () => {
  // น for ม isn't a known look-alike, so only the model's own second guess can fix "หนู" to "หมู".
  assert.equal(correctThai("หนู", ["หมู"], { alternatives: [[], ["ม"], []] }), "หมู");
  assert.equal(correctThai("หนู", ["หมู"]), "หนู");
});

test("your own product names are the first choice, even when they aren't in the word list", () => {
  assert.notEqual(fix("ซอทท์เดักหน้ำเนธสล"), "ซอฟท์เค้กหน้าเนยสด");
  assert.equal(correctThai("ซอทท์เดักหน้ำเนธสล", THAI_RECEIPT_WORDS, { preferred: ["ซอฟท์เค้กหน้าเนยสด"] }), "ซอฟท์เค้กหน้าเนยสด");
});

test("everyday names already on the receipt stay put with the bigger word list", () => {
  for (const name of ["ไข่ไก่ เบอร์ 2", "ปลาทูนึ่ง", "ส้มสายน้ำผึ้ง", "ผงซักฟอก บรีส", "นมถั่วเหลือง", "ขนมปังโฮลวีท", "อกไก่ สด"]) {
    assert.equal(fix(name), name);
  }
});

test("Latin letters the OCR put inside a Thai word are read back as the Thai letters they stand for", () => {
  assert.equal(fix("มDนศ:ตอร์ 330"), "มอนสเตอร์ 330");
  assert.equal(fix("มOนสเตอร์"), "มอนสเตอร์");
  // Latin words and codes beside Thai stay as they are.
  assert.equal(fix("สลัดปูอัดไข่กุ้ง Ezyt"), "สลัดปูอัดไข่กุ้ง Ezyt");
  assert.equal(fix("ORG ต้นหอม"), "ORG ต้นหอม");
});

test("a stray mark with a space after it, and two Latin letters in a row, still belong to the Thai word", () => {
  assert.equal(fix("มDนศ: ตอร์"), "มอนสเตอร์");
  assert.equal(fix("ปalแห้ง"), "ปลาแห้ง");
});
