import assert from "node:assert/strict";
import { test } from "node:test";
import { groupRows, normalize, parseDate, parseReceipt, UNREADABLE_NAME } from "../src/lib/receipt/parse.ts";

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
  assert.equal(scan.store, "7-Eleven");
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
  assert.equal(scan.discount, 20);
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

// A real US receipt photo, as the on-device OCR read it (the logo's "MARKET" came through as "HARKET").
const WHOLE_FOODS = [
  {"text": "HARKET", "x": 156, "y": 72, "width": 42, "height": 14, "score": 0.85},
  {"text": "123 Main Street", "x": 120, "y": 112, "width": 119, "height": 22, "score": 0.96},
  {"text": "City, State ZIP", "x": 118, "y": 138, "width": 121, "height": 22, "score": 0.97},
  {"text": "(555) 555-5555", "x": 123, "y": 164, "width": 112, "height": 22, "score": 0.98},
  {"text": "Store: 3897 | Register: 11", "x": 77, "y": 195, "width": 203, "height": 20, "score": 0.94},
  {"text": "Date: 11/24/2025| Time: 10:09 PM", "x": 51, "y": 225, "width": 257, "height": 20, "score": 0.96},
  {"text": "$5.99", "x": 290, "y": 266, "width": 49, "height": 24, "score": 0.96},
  {"text": "Organic Milk", "x": 20, "y": 268, "width": 98, "height": 19, "score": 0.93},
  {"text": "$3.49", "x": 290, "y": 291, "width": 49, "height": 24, "score": 0.95},
  {"text": "Whole Grain Bread", "x": 19, "y": 291, "width": 139, "height": 24, "score": 0.91},
  {"text": "$3.98", "x": 290, "y": 317, "width": 49, "height": 24, "score": 0.93},
  {"text": "Fresh Bananas", "x": 20, "y": 319, "width": 107, "height": 22, "score": 1},
  {"text": "$13,46", "x": 284, "y": 355, "width": 56, "height": 22, "score": 0.98},
  {"text": "Subtotal", "x": 21, "y": 357, "width": 66, "height": 19, "score": 1},
  {"text": "$1,14", "x": 291, "y": 381, "width": 48, "height": 22, "score": 0.99},
  {"text": "Tax", "x": 19, "y": 382, "width": 33, "height": 22, "score": 0.85},
  {"text": "$14,60", "x": 283, "y": 405, "width": 57, "height": 24, "score": 0.94},
  {"text": "Total", "x": 19, "y": 407, "width": 47, "height": 22, "score": 0.99},
  {"text": "Payment", "x": 19, "y": 445, "width": 61, "height": 21, "score": 1},
  {"text": "Mastercard", "x": 254, "y": 445, "width": 85, "height": 21, "score": 1},
  {"text": "138544324169", "x": 241, "y": 470, "width": 97, "height": 21, "score": 1},
  {"text": "Auth Code", "x": 20, "y": 472, "width": 75, "height": 19, "score": 0.99},
  {"text": "Status", "x": 18, "y": 495, "width": 57, "height": 24, "score": 1},
  {"text": "APPROVED", "x": 270, "y": 497, "width": 68, "height": 21, "score": 1}
];

test("a real US receipt: month/day date, $ prices, no logo misread as the store", () => {
  const scan = parseReceipt(WHOLE_FOODS, { imageHeight: 545, currentYear: 2026 });
  assert.equal(scan.store, null);
  assert.equal(scan.date, "2025-11-24");
  assert.equal(scan.total, 14.6);
  assert.equal(scan.currency, "USD");
  assert.deepEqual(
    scan.lines.map((line) => [line.name, line.line_total]),
    [
      ["Organic Milk", 5.99],
      ["Whole Grain Bread", 3.49],
      ["Fresh Bananas", 3.98],
    ],
  );
});

test("US month/day dates are read when the day can't be a month", () => {
  assert.equal(parseDate("11/24/2025", 2026), "2025-11-24");
  assert.equal(parseDate("05/06/2026", 2026), "2026-06-05");
});

// A real 7-Eleven photo (dot-matrix print, phone camera), as the on-device OCR read it: the Thai names come
// out garbled, but the quantity column, @ unit prices and amounts are exact. "ยอดสุทธิ" wasn't read, so the
// total is only a bare 266.00, followed by a TrueMoney payment line of the same amount.
const SEVEN_ELEVEN = [
  {"text": "CP AL,7-Blen TMak 216183)", "x": 109, "y": 232, "width": 511, "height": 99, "score": 0.64},
  {"text": "TA07542001 (A Inluded)", "x": 113, "y": 281, "width": 507, "height": 91, "score": 0.56},
  {"text": "Vat Cod 130 PoS020700", "x": 88, "y": 326, "width": 553, "height": 91, "score": 0.56},
  {"text": "ไนเรัจับเิน/ใบกำกัภาือ่างสัอ", "x": 145, "y": 392, "width": 425, "height": 78, "score": 0.66},
  {"text": "39.00", "x": 553, "y": 443, "width": 97, "height": 51, "score": 0.92},
  {"text": "ซอทท์เดักหน้ำเนธสล", "x": 129, "y": 456, "width": 234, "height": 53, "score": 0.84},
  {"text": "1", "x": 80, "y": 471, "width": 20, "height": 31, "score": 0.99},
  {"text": "20.00", "x": 555, "y": 488, "width": 95, "height": 48, "score": 1},
  {"text": "มีทาโรเช้มชั้น 25 ก", "x": 132, "y": 499, "width": 235, "height": 49, "score": 0.87},
  {"text": "1", "x": 80, "y": 511, "width": 20, "height": 31, "score": 0.99},
  {"text": "50.00", "x": 554, "y": 535, "width": 97, "height": 48, "score": 0.99},
  {"text": "@25.00", "x": 392, "y": 538, "width": 106, "height": 49, "score": 0.98},
  {"text": "อับเบื้อคร่วชองด์แอยม", "x": 133, "y": 543, "width": 235, "height": 53, "score": 0.93},
  {"text": "2", "x": 80, "y": 554, "width": 24, "height": 36, "score": 0.87},
  {"text": "72.00", "x": 556, "y": 581, "width": 94, "height": 45, "score": 0.99},
  {"text": "@36.00", "x": 392, "y": 583, "width": 106, "height": 49, "score": 0.94},
  {"text": "โปโอน่าธรรมดา", "x": 137, "y": 588, "width": 186, "height": 45, "score": 0.83},
  {"text": "2", "x": 79, "y": 597, "width": 27, "height": 37, "score": 0.9},
  {"text": "26.00", "x": 554, "y": 626, "width": 94, "height": 45, "score": 1},
  {"text": "โซศึกระชับกลางจันมี", "x": 137, "y": 629, "width": 230, "height": 49, "score": 0.86},
  {"text": "1", "x": 84, "y": 641, "width": 21, "height": 33, "score": 0.97},
  {"text": "29.00", "x": 554, "y": 668, "width": 95, "height": 48, "score": 1},
  {"text": "พลัดปูสัดไชกุ้ง Ezyt", "x": 137, "y": 675, "width": 228, "height": 45, "score": 0.93},
  {"text": "1", "x": 83, "y": 684, "width": 25, "height": 31, "score": 0.52},
  {"text": "30.00", "x": 554, "y": 714, "width": 92, "height": 45, "score": 1},
  {"text": "โออิชีน้ำนึ่งมะนาว80", "x": 136, "y": 713, "width": 230, "height": 53, "score": 0.75},
  {"text": "1", "x": 84, "y": 725, "width": 29, "height": 36, "score": 0.94},
  {"text": "0.00", "x": 566, "y": 757, "width": 83, "height": 47, "score": 0.98},
  {"text": "10", "x": 83, "y": 762, "width": 43, "height": 40, "score": 0.97},
  {"text": "ศิทธ์แอกชือุุม", "x": 133, "y": 793, "width": 194, "height": 60, "score": 0.63},
  {"text": "12", "x": 84, "y": 804, "width": 44, "height": 43, "score": 1},
  {"text": "0.00", "x": 568, "y": 801, "width": 79, "height": 47, "score": 1},
  {"text": "1", "x": 81, "y": 845, "width": 62, "height": 44, "score": 0.94},
  {"text": "สิทธิ์จองกาตั้ม/เดาย่างไหฟ้า", "x": 136, "y": 843, "width": 316, "height": 46, "score": 0.85},
  {"text": "0.00", "x": 568, "y": 844, "width": 79, "height": 47, "score": 0.99},
  {"text": "1", "x": 82, "y": 886, "width": 71, "height": 46, "score": 0.77},
  {"text": "โออหรัสดิกเกอร์", "x": 134, "y": 884, "width": 206, "height": 49, "score": 0.74},
  {"text": "0.00", "x": 568, "y": 886, "width": 77, "height": 46, "score": 0.99},
  {"text": "266.00", "x": 394, "y": 929, "width": 104, "height": 46, "score": 1},
  {"text": "266.00", "x": 394, "y": 971, "width": 104, "height": 46, "score": 0.98},
  {"text": "ทรุวละเอ็7App", "x": 86, "y": 972, "width": 186, "height": 48, "score": 0.74},
  {"text": "TID#2020123000000000543999254", "x": 91, "y": 1012, "width": 419, "height": 42, "score": 0.98},
  {"text": "R#000006107P3 :0263342 30/12/63 20:37", "x": 90, "y": 1048, "width": 579, "height": 51, "score": 0.94},
  {"text": "*ศูนธับริการหมาชึก A11 Member 0-2826-7777", "x": 89, "y": 1084, "width": 586, "height": 59, "score": 0.82},
  {"text": "*Payatall by Counter Service **", "x": 116, "y": 1123, "width": 487, "height": 63, "score": 0.76},
  {"text": "ซั้อมูอสมาชิก คุณศุภชัจ", "x": 99, "y": 1213, "width": 231, "height": 45, "score": 0.84},
  {"text": "ไปไป องเหลล", "x": 477, "y": 1238, "width": 190, "height": 52, "score": 0.83},
  {"text": "ได้รับ", "x": 373, "y": 1244, "width": 80, "height": 50, "score": 0.86},
  {"text": "1628", "x": 588, "y": 1278, "width": 76, "height": 43, "score": 0.97},
  {"text": "0", "x": 524, "y": 1286, "width": 28, "height": 34, "score": 0.81},
  {"text": "+78", "x": 385, "y": 1286, "width": 61, "height": 41, "score": 0.94},
  {"text": "แต้มสมาริก", "x": 100, "y": 1285, "width": 127, "height": 47, "score": 0.81}
];

test("a real 7-Eleven receipt: quantity column, @ prices, a total without its label, a payment line after it", () => {
  const scan = parseReceipt(SEVEN_ELEVEN, { imageHeight: 1600, currentYear: 2026 });
  assert.equal(scan.store, "7-Eleven");
  assert.equal(scan.date, "2020-12-30");
  assert.equal(scan.total, 266);
  assert.deepEqual(
    scan.lines.map((line) => [line.quantity, line.unit_price, line.line_total]),
    [
      [1, 39, 39],
      [1, 20, 20],
      [2, 25, 50],
      [2, 36, 72],
      [1, 26, 26],
      [1, 29, 29],
      [1, 30, 30],
    ],
  );
  assert.ok(scan.lines.every((line) => !line.name.includes("@") && !/^\d+\s/.test(line.name)));
});

test("short Thai words like โอน (transfer) only skip a line when they start it", () => {
  const scan = parseReceipt(
    [
      { text: "2 โบโอน่าธรรมดา @36.00 72.00", x: 0, y: 0, width: 300, height: 20, score: 0.9 },
      { text: "โอนเงิน 72.00", x: 0, y: 40, width: 300, height: 20, score: 0.9 },
    ],
    { imageHeight: 100, currentYear: 2026 },
  );
  assert.deepEqual(scan.lines.map((line) => line.name), ["โบโอน่าธรรมดา"]);
});

test("a short year that would be in the future is a Buddhist-era year", () => {
  assert.equal(parseDate("30/12/63", 2026), "2020-12-30");
  assert.equal(parseDate("26/10/69", 2026), "2026-10-26");
  assert.equal(parseDate("26/10/26", 2026), "2026-10-26");
});

// Another real 7-Eleven photo: the OCR missed most of the quantity column and one item's whole name.
const SEVEN_ELEVEN_2013 = [
  {"text": "TAX#0107542000011(VAT Included)", "x": 178, "y": 0, "width": 753, "height": 48, "score": 0.98},
  {"text": "Vat 05634 P0S# :0200176", "x": 268, "y": 44, "width": 580, "height": 61, "score": 0.99},
  {"text": "ไปเสร็จรับเจิน/ไบกำกับภาษีอย่างฮ่อ", "x": 216, "y": 112, "width": 684, "height": 85, "score": 0.81},
  {"text": "โอเกร์ตเมจิ รสจิจ", "x": 191, "y": 177, "width": 373, "height": 79, "score": 0.86},
  {"text": "@14.00", "x": 581, "y": 192, "width": 166, "height": 63, "score": 0.94},
  {"text": "28.00", "x": 855, "y": 193, "width": 140, "height": 65, "score": 0.99},
  {"text": "สบุวิตามินอ์เบนเนท", "x": 186, "y": 250, "width": 371, "height": 75, "score": 0.83},
  {"text": "48.00", "x": 857, "y": 263, "width": 137, "height": 62, "score": 1},
  {"text": "พิปโก้หรุนล จุน1008", "x": 184, "y": 313, "width": 371, "height": 86, "score": 0.68},
  {"text": "18.00", "x": 857, "y": 332, "width": 138, "height": 68, "score": 1},
  {"text": "ทิปโก้หรุนองุ่น1008", "x": 184, "y": 386, "width": 371, "height": 82, "score": 0.71},
  {"text": "1", "x": 92, "y": 409, "width": 29, "height": 40, "score": 0.94},
  {"text": "18.00", "x": 860, "y": 405, "width": 135, "height": 65, "score": 1},
  {"text": "ทิปโกรุนอง่1008", "x": 187, "y": 462, "width": 365, "height": 79, "score": 0.83},
  {"text": "18.00", "x": 857, "y": 476, "width": 138, "height": 68, "score": 1},
  {"text": "ทิปโก้หรุนอง่น1008", "x": 189, "y": 537, "width": 363, "height": 75, "score": 0.75},
  {"text": "18.00", "x": 859, "y": 552, "width": 135, "height": 62, "score": 0.94},
  {"text": "18.00", "x": 858, "y": 621, "width": 137, "height": 65, "score": 1},
  {"text": "พิปโกเซอร์ร์เบอร์รี", "x": 185, "y": 670, "width": 375, "height": 90, "score": 0.85},
  {"text": "18.00", "x": 858, "y": 693, "width": 137, "height": 65, "score": 0.99},
  {"text": "ศิงโชรสบาร์บีดิว 3", "x": 186, "y": 750, "width": 372, "height": 79, "score": 0.88},
  {"text": "1", "x": 94, "y": 769, "width": 32, "height": 43, "score": 0.99},
  {"text": "20.00", "x": 857, "y": 766, "width": 135, "height": 65, "score": 1},
  {"text": "ชิชโชรสาร์บีดิว 3", "x": 186, "y": 824, "width": 370, "height": 79, "score": 0.9},
  {"text": "1", "x": 97, "y": 840, "width": 44, "height": 48, "score": 0.98},
  {"text": "20.00", "x": 857, "y": 838, "width": 137, "height": 65, "score": 1},
  {"text": "31", "x": 99, "y": 907, "width": 59, "height": 56, "score": 1},
  {"text": "แสดมปรักเมืองไทย", "x": 192, "y": 901, "width": 360, "height": 75, "score": 0.94},
  {"text": "00.00", "x": 613, "y": 908, "width": 135, "height": 65, "score": 0.82},
  {"text": "0.0ONP", "x": 875, "y": 910, "width": 167, "height": 67, "score": 0.87},
  {"text": "Sub Total", "x": 197, "y": 977, "width": 232, "height": 65, "score": 1},
  {"text": "224.00", "x": 831, "y": 982, "width": 161, "height": 63, "score": 1},
  {"text": "2", "x": 97, "y": 1052, "width": 42, "height": 56, "score": 0.97},
  {"text": "ส่วนลดโอเกิร์ตเมจี", "x": 196, "y": 1042, "width": 362, "height": 75, "score": 0.91},
  {"text": "4.00", "x": 877, "y": 1053, "width": 114, "height": 63, "score": 0.94},
  {"text": "1", "x": 102, "y": 1123, "width": 41, "height": 52, "score": 0.93},
  {"text": "ส่วนลด10บ.ศบุ่เบนเนทรัม", "x": 199, "y": 1117, "width": 477, "height": 68, "score": 0.82},
  {"text": "10.00", "x": 853, "y": 1123, "width": 139, "height": 65, "score": 0.99},
  {"text": "Total", "x": 101, "y": 1187, "width": 137, "height": 65, "score": 1},
  {"text": "(42)", "x": 374, "y": 1189, "width": 104, "height": 64, "score": 0.97},
  {"text": "210.00", "x": 586, "y": 1190, "width": 161, "height": 63, "score": 1},
  {"text": "210.00", "x": 582, "y": 1253, "width": 166, "height": 67, "score": 0.98},
  {"text": "Purse", "x": 96, "y": 1256, "width": 142, "height": 65, "score": 1},
  {"text": "TID #10030208", "x": 94, "y": 1325, "width": 332, "height": 60, "score": 0.99},
  {"text": "TRACE #067888", "x": 481, "y": 1325, "width": 337, "height": 63, "score": 1},
  {"text": "R#0000872886 P1:0453397 11/11/56 18:03", "x": 86, "y": 1390, "width": 957, "height": 70, "score": 0.98},
  {"text": "ศุนธ์สมาชิกบัตร7-11 Value Card 0-2711-7777", "x": 80, "y": 1461, "width": 965, "height": 70, "score": 0.96}
];

test("a 7-Eleven receipt with missed quantity digits, an unreadable name and the store only in its tax ID", () => {
  const scan = parseReceipt(SEVEN_ELEVEN_2013, { imageHeight: 1538, currentYear: 2026 });
  assert.equal(scan.store, "7-Eleven");
  assert.equal(scan.date, "2013-11-11");
  assert.equal(scan.total, 210);
  assert.deepEqual(scan.lines[0] && [scan.lines[0].quantity, scan.lines[0].unit_price, scan.lines[0].line_total], [2, 14, 28]);
  assert.equal(scan.lines.length, 10);
  assert.equal(scan.lines.filter((line) => line.name === UNREADABLE_NAME).length, 1);
  assert.equal(scan.lines.reduce((sum, line) => sum + line.line_total, 0), 224);
  assert.equal(scan.discount, 14);
});

test("a percent sign the OCR read as 8 comes back in item names, never in prices", () => {
  const scan = parseReceipt(
    [{ text: "1 ทิปโก้พรุนองุ่น1008 18.00", x: 0, y: 0, width: 400, height: 20, score: 0.9 }],
    { imageHeight: 100, currentYear: 2026 },
  );
  assert.equal(scan.lines[0]?.name, "ทิปโก้พรุนองุ่น100%");
  assert.equal(scan.lines[0]?.line_total, 18);
});

// Go Wholesale, a small strip of a phone photo with keyboard keys around it: each item is a name line over a
// "(barcode)V (1 * 169.00) 169.00" line, and the VAT amount sits on the Total row.
const GO_WHOLESALE = [
  {"text": "Delete", "x": 73, "y": 251, "width": 68, "height": 31, "score": 0.93},
  {"text": "Mch", "x": 797, "y": 312, "width": 78, "height": 63, "score": 0.62},
  {"text": "PgUp", "x": 88, "y": 353, "width": 65, "height": 31, "score": 0.92},
  {"text": "PgDn", "x": 100, "y": 458, "width": 61, "height": 33, "score": 0.89},
  {"text": "WHOLSABE", "x": 392, "y": 647, "width": 108, "height": 26, "score": 0.77},
  {"text": "Central Food Wholesales Limited", "x": 324, "y": 671, "width": 238, "height": 34, "score": 0.97},
  {"text": "Tel 052-079553", "x": 385, "y": 704, "width": 117, "height": 29, "score": 0.53},
  {"text": "TAX INVOICEABB 2 TAX ID # 0125565034662", "x": 274, "y": 717, "width": 353, "height": 42, "score": 0.75},
  {"text": "POS ID # E050004514", "x": 275, "y": 738, "width": 215, "height": 37, "score": 0.62},
  {"text": "** Noma Sls **", "x": 366, "y": 768, "width": 157, "height": 37, "score": 0.69},
  {"text": "Till no. 005", "x": 540, "y": 804, "width": 86, "height": 25, "score": 0.97},
  {"text": "วันที่ 1-10-2026 มล]:21:56", "x": 275, "y": 805, "width": 198, "height": 37, "score": 0.87},
  {"text": "Cashier ID.123014", "x": 486, "y": 819, "width": 142, "height": 33, "score": 0.92},
  {"text": "i 260014509", "x": 274, "y": 824, "width": 177, "height": 37, "score": 0.55},
  {"text": "เลขที่ ใบเสร็จ: 05008412", "x": 275, "y": 842, "width": 178, "height": 33, "score": 0.65},
  {"text": "ปูอัด่าสืนกำรวม VAT", "x": 488, "y": 869, "width": 141, "height": 36, "score": 0.81},
  {"text": "เห็ดหอมลายเล็ก200n", "x": 277, "y": 899, "width": 141, "height": 30, "score": 0.89},
  {"text": "169.00", "x": 573, "y": 911, "width": 56, "height": 24, "score": 0.97},
  {"text": "(1 *169.00)", "x": 421, "y": 916, "width": 92, "height": 25, "score": 0.97},
  {"text": "(885.3768812388)N", "x": 279, "y": 918, "width": 144, "height": 30, "score": 0.96},
  {"text": "บะหมี่เกาหลีนา9000", "x": 278, "y": 936, "width": 143, "height": 26, "score": 0.53},
  {"text": "160.00", "x": 574, "y": 947, "width": 56, "height": 24, "score": 0.98},
  {"text": "(1 * 160.00)", "x": 418, "y": 950, "width": 97, "height": 29, "score": 0.89},
  {"text": "(8801039923993V1", "x": 277, "y": 952, "width": 150, "height": 30, "score": 0.82},
  {"text": "145.00", "x": 576, "y": 981, "width": 56, "height": 24, "score": 1},
  {"text": "(0010047064)V (1 * 145.0)", "x": 275, "y": 983, "width": 243, "height": 38, "score": 0.8},
  {"text": "ส้มคาราคาร่าแพ็คละ", "x": 277, "y": 1006, "width": 139, "height": 30, "score": 0.77},
  {"text": "89.00", "x": 582, "y": 1017, "width": 51, "height": 24, "score": 0.99},
  {"text": "(200100402511)N (1 89.00)", "x": 275, "y": 1019, "width": 237, "height": 38, "score": 0.85},
  {"text": "ปalแท้เส้น 30n", "x": 278, "y": 1042, "width": 134, "height": 29, "score": 0.54},
  {"text": "70.00", "x": 583, "y": 1052, "width": 52, "height": 27, "score": 0.88},
  {"text": "(1*70.00)", "x": 421, "y": 1057, "width": 87, "height": 25, "score": 0.91},
  {"text": "(853724005071)", "x": 276, "y": 1055, "width": 155, "height": 37, "score": 0.7},
  {"text": "48.00", "x": 585, "y": 1091, "width": 49, "height": 24, "score": 0.95},
  {"text": "(85058020060)V (1 * 48.0)", "x": 277, "y": 1088, "width": 236, "height": 41, "score": 0.67},
  {"text": "จืด์แมกน 8004", "x": 280, "y": 1112, "width": 167, "height": 30, "score": 0.6},
  {"text": "47.00", "x": 587, "y": 1127, "width": 47, "height": 24, "score": 1},
  {"text": "(85.3705600894)V (1 * 47.00)", "x": 279, "y": 1124, "width": 236, "height": 41, "score": 0.86},
  {"text": "มันฝรั่งห่อก 1 กก.", "x": 283, "y": 1150, "width": 118, "height": 26, "score": 0.78},
  {"text": "42.00", "x": 587, "y": 1162, "width": 49, "height": 24, "score": 0.96},
  {"text": "(200100072929)N (1 * 42.00)", "x": 282, "y": 1164, "width": 232, "height": 34, "score": 0.73},
  {"text": "39.00", "x": 588, "y": 1198, "width": 47, "height": 24, "score": 0.98},
  {"text": "(2000100075425)N (1 * 39.00)", "x": 284, "y": 1199, "width": 230, "height": 34, "score": 0.94},
  {"text": "809.00", "x": 580, "y": 1234, "width": 57, "height": 24, "score": 0.99},
  {"text": "Su Total", "x": 297, "y": 1241, "width": 76, "height": 25, "score": 0.97},
  {"text": "809.00", "x": 582, "y": 1287, "width": 57, "height": 24, "score": 0.99},
  {"text": "Total", "x": 287, "y": 1295, "width": 44, "height": 26, "score": 0.97},
  {"text": "30.75", "x": 590, "y": 1306, "width": 51, "height": 24, "score": 0.91},
  {"text": "Vat", "x": 287, "y": 1316, "width": 37, "height": 25, "score": 1},
  {"text": "809.00", "x": 584, "y": 1323, "width": 57, "height": 24, "score": 0.99},
  {"text": "MAST", "x": 286, "y": 1330, "width": 54, "height": 27, "score": 0.8},
  {"text": "000525669XXXXXX7786L", "x": 361, "y": 1343, "width": 194, "height": 30, "score": 0.93},
  {"text": "0.00", "x": 600, "y": 1357, "width": 42, "height": 26, "score": 0.95},
  {"text": "ทอน", "x": 290, "y": 1370, "width": 38, "height": 20, "score": 0.99},
  {"text": "VAT INCLUDED)", "x": 395, "y": 1380, "width": 131, "height": 26, "score": 0.98},
  {"text": "DRO", "x": 570, "y": 1415, "width": 76, "height": 37, "score": 0.72},
  {"text": "8", "x": 411, "y": 1439, "width": 19, "height": 21, "score": 0.97},
  {"text": "The 1", "x": 290, "y": 1444, "width": 51, "height": 24, "score": 0.85},
  {"text": "ปน 2.071", "x": 400, "y": 1450, "width": 86, "height": 35, "score": 0.65},
  {"text": "The", "x": 290, "y": 1461, "width": 38, "height": 25, "score": 0.99},
  {"text": "100.", "x": 508, "y": 1470, "width": 42, "height": 23, "score": 0.66},
  {"text": "800", "x": 398, "y": 1472, "width": 65, "height": 28, "score": 0.88},
  {"text": "มุกริเมมเด็กสูตรทารก", "x": 487, "y": 1561, "width": 161, "height": 33, "score": 0.65},
  {"text": "เสรสำหรับเด็กการก", "x": 480, "y": 1585, "width": 135, "height": 26, "score": 0.87},
  {"text": "กล่องากกุปล", "x": 474, "y": 1606, "width": 95, "height": 22, "score": 0.71},
  {"text": "ane Thel", "x": 466, "y": 1617, "width": 132, "height": 33, "score": 0.67},
  {"text": "ฟรีไม่มีบเล็กเกลือน", "x": 453, "y": 1659, "width": 151, "height": 30, "score": 0.65},
  {"text": "0.ส้มกเด็กStickerad", "x": 448, "y": 1681, "width": 159, "height": 26, "score": 0.65},
  {"text": "และสแท้ปูอัดข่ายคุกกี้ารณ์ี", "x": 442, "y": 1698, "width": 162, "height": 30, "score": 0.69},
  {"text": "กรใบกำกับภาษีเค็มรูป", "x": 424, "y": 1733, "width": 150, "height": 37, "score": 0.67},
  {"text": "ดิดต่องุ่นกางบรีสก", "x": 525, "y": 1804, "width": 130, "height": 43, "score": 0.6},
  {"text": "รเปีกลูก", "x": 397, "y": 1827, "width": 75, "height": 25, "score": 0.77},
  {"text": "73", "x": 530, "y": 1837, "width": 54, "height": 27, "score": 0.58},
  {"text": "บริการ -", "x": 497, "y": 1906, "width": 54, "height": 24, "score": 0.74}
];

test("Go Wholesale: names from the line above, codes stripped, total not the VAT beside it, no key as the store", () => {
  const scan = parseReceipt(GO_WHOLESALE, { imageHeight: 2000, currentYear: 2026 });
  assert.equal(scan.store, "Go Wholesale");
  assert.equal(scan.total, 809);
  assert.equal(scan.lines.length, 9);
  assert.equal(scan.lines.reduce((sum, line) => sum + line.line_total, 0), 809);
  assert.ok(scan.lines.filter((line) => line.name !== UNREADABLE_NAME).length >= 6);
  assert.ok(scan.lines.every((line) => line.name === UNREADABLE_NAME || !/\d{8,}|\*|\(/.test(line.name)));
});

test("an item printed on three rows (name, barcode, price) keeps its name and spans all three", () => {
  const scan = reviewParse([["Bread", "40.00"], ["Chicken fillet per kg"], ["(210506000038000003921)N"], ["(0.392 * 97.00)", "38.00"], ["TOTAL", "78.00"]]);
  const chicken = scan.lines[1];
  assert.equal(chicken?.name, "Chicken fillet per kg");
  assert.equal(chicken?.line_total, 38);
  assert.ok(chicken && chicken.top !== null && chicken.bottom !== null && chicken.bottom - chicken.top >= 0.07);
});

test("a quantity row under its item stretches the item's span down to it", () => {
  const scan = reviewParse([["Coke", "25.00"], ["2 x 25.00", "50.00"]]);
  const coke = scan.lines[0];
  assert.ok(coke && coke.y !== null && coke.bottom !== null && coke.bottom > coke.y + 0.03);
});

// Tops: quantity rows "2 * 49.00 / ชิ้น" under the item, and a date that holds "18.10".
const TOPS = [
  {"text": "MDh", "x": 999, "y": 27, "width": 109, "height": 95, "score": 0.64},
  {"text": "Up", "x": 0, "y": 153, "width": 45, "height": 40, "score": 0.96},
  {"text": "gDn", "x": 0, "y": 312, "width": 75, "height": 49, "score": 0.81},
  {"text": "Tops Chotana", "x": 393, "y": 437, "width": 151, "height": 36, "score": 1},
  {"text": "Tel.053-410645-8 (VAT INCLUDED)", "x": 233, "y": 456, "width": 362, "height": 42, "score": 0.91},
  {"text": "TAX INVOICE(ABB TAX IDH 0105535134278", "x": 233, "y": 479, "width": 458, "height": 42, "score": 0.71},
  {"text": "POS PERMIT E085000002A4601", "x": 242, "y": 504, "width": 310, "height": 42, "score": 0.79},
  {"text": "18.10.2026 21:42", "x": 244, "y": 533, "width": 197, "height": 36, "score": 0.96},
  {"text": "Ropt 051", "x": 454, "y": 533, "width": 109, "height": 39, "score": 0.74},
  {"text": "100132", "x": 583, "y": 535, "width": 81, "height": 29, "score": 1},
  {"text": "105404", "x": 582, "y": 557, "width": 83, "height": 34, "score": 1},
  {"text": "TP", "x": 460, "y": 561, "width": 39, "height": 29, "score": 0.96},
  {"text": "051", "x": 513, "y": 561, "width": 47, "height": 30, "score": 0.95},
  {"text": "78.00", "x": 583, "y": 584, "width": 70, "height": 29, "score": 0.99},
  {"text": "เคิยวไน้ำดื่ม", "x": 279, "y": 583, "width": 136, "height": 35, "score": 0.68},
  {"text": "2x", "x": 286, "y": 609, "width": 50, "height": 27, "score": 0.63},
  {"text": "39.00 /น", "x": 422, "y": 606, "width": 130, "height": 35, "score": 0.87},
  {"text": "1 คิคโคแมนซอสถั่ว", "x": 252, "y": 629, "width": 174, "height": 36, "score": 0.87},
  {"text": "188.00", "x": 572, "y": 630, "width": 81, "height": 34, "score": 1},
  {"text": "98.00", "x": 580, "y": 655, "width": 72, "height": 33, "score": 1},
  {"text": "มอนสเตอร์อัลตร้า", "x": 274, "y": 657, "width": 161, "height": 31, "score": 0.8},
  {"text": "2*", "x": 283, "y": 679, "width": 52, "height": 31, "score": 0.67},
  {"text": "49.00/ ชิ้น", "x": 420, "y": 679, "width": 130, "height": 35, "score": 0.78},
  {"text": "P", "x": 673, "y": 705, "width": 23, "height": 25, "score": 0.94},
  {"text": "1 บอมเทสพริกป่น", "x": 250, "y": 702, "width": 164, "height": 36, "score": 0.89},
  {"text": "159.00", "x": 572, "y": 703, "width": 81, "height": 34, "score": 0.92},
  {"text": "90.00", "x": 577, "y": 725, "width": 76, "height": 37, "score": 0.74},
  {"text": "1 ชองจองวอนสาหร่าย", "x": 248, "y": 725, "width": 210, "height": 41, "score": 0.86},
  {"text": "P", "x": 673, "y": 753, "width": 23, "height": 25, "score": 0.93},
  {"text": "98.00", "x": 580, "y": 751, "width": 72, "height": 33, "score": 0.8},
  {"text": "มDนศ:ตอร์ 330A", "x": 272, "y": 755, "width": 176, "height": 31, "score": 0.79},
  {"text": "2*", "x": 281, "y": 777, "width": 49, "height": 31, "score": 0.93},
  {"text": "49.00/ รน", "x": 420, "y": 777, "width": 128, "height": 35, "score": 0.82},
  {"text": "-18.00", "x": 546, "y": 798, "width": 83, "height": 38, "score": 1},
  {"text": "Mix&Match", "x": 269, "y": 800, "width": 117, "height": 35, "score": 0.87},
  {"text": "NP_3923973260901", "x": 268, "y": 825, "width": 197, "height": 36, "score": 0.94},
  {"text": "Total", "x": 225, "y": 874, "width": 63, "height": 32, "score": 0.99},
  {"text": "693.00", "x": 565, "y": 876, "width": 85, "height": 34, "score": 1},
  {"text": "VISA 462665 XXXX8180 BHT", "x": 219, "y": 896, "width": 304, "height": 42, "score": 0.85},
  {"text": "693.00", "x": 565, "y": 901, "width": 85, "height": 34, "score": 0.99},
  {"text": "Vat", "x": 220, "y": 922, "width": 50, "height": 38, "score": 0.97},
  {"text": "45.33", "x": 577, "y": 925, "width": 74, "height": 37, "score": 0.99},
  {"text": "T1C#8065486418 พายะ", "x": 215, "y": 971, "width": 240, "height": 41, "score": 0.92},
  {"text": "ประหยัดวันนี้", "x": 215, "y": 998, "width": 119, "height": 35, "score": 0.83},
  {"text": "39.00 บาท", "x": 552, "y": 1000, "width": 129, "height": 44, "score": 0.88},
  {"text": "ตEแผ่นสะสม:", "x": 214, "y": 1026, "width": 127, "height": 30, "score": 0.64},
  {"text": "2,038", "x": 624, "y": 1030, "width": 74, "height": 33, "score": 0.99},
  {"text": "Cashier", "x": 213, "y": 1050, "width": 94, "height": 30, "score": 0.99},
  {"text": ": sc0003", "x": 354, "y": 1050, "width": 109, "height": 35, "score": 0.91},
  {"text": "#EveryDayDISCOVERY", "x": 337, "y": 1100, "width": 231, "height": 36, "score": 0.85},
  {"text": "อบอ่อนไก่นไโดนัท ww.tops.Co. th", "x": 239, "y": 1143, "width": 381, "height": 52, "score": 0.56},
  {"text": "นดร ส้มAด 200 บาท เนื้อซองรงแรก", "x": 208, "y": 1168, "width": 404, "height": 52, "score": 0.54},
  {"text": "รวมตอมแบบสอปลามที่", "x": 216, "y": 1222, "width": 205, "height": 31, "score": 0.9},
  {"text": "ขอบคุณต่ะ", "x": 401, "y": 1250, "width": 91, "height": 30, "score": 0.82},
  {"text": "เริ่มแล้ววันนี้! ส้มัครสมาชิก", "x": 219, "y": 1268, "width": 247, "height": 37, "score": 0.89},
  {"text": "Tops Prime Plus ม้วน E-Sticker", "x": 214, "y": 1286, "width": 404, "height": 52, "score": 0.62},
  {"text": "Aดงศด 20% ทุกเส้น พร้อมเพย์ิย", "x": 215, "y": 1314, "width": 352, "height": 42, "score": 0.56},
  {"text": "องุ่นๆมาม่ายชีสฟรีไดทิชชู่บหน้าราน", "x": 216, "y": 1339, "width": 341, "height": 37, "score": 0.76},
  {"text": "Prime PlusTops", "x": 390, "y": 1474, "width": 173, "height": 31, "score": 0.91},
  {"text": "18:10.2026 21:42", "x": 389, "y": 1521, "width": 202, "height": 41, "score": 0.91},
  {"text": "Iesued Date:", "x": 226, "y": 1530, "width": 158, "height": 40, "score": 0.87},
  {"text": "01.10. 2026 f0 31.12.2026", "x": 386, "y": 1541, "width": 300, "height": 52, "score": 0.75},
  {"text": "Valid from:", "x": 227, "y": 1560, "width": 143, "height": 35, "score": 0.89},
  {"text": "Prime PlusTops", "x": 331, "y": 1605, "width": 181, "height": 41, "score": 0.92},
  {"text": "Serial:", "x": 225, "y": 1612, "width": 103, "height": 39, "score": 0.91},
  {"text": "sco003", "x": 390, "y": 1632, "width": 87, "height": 34, "score": 0.68},
  {"text": "Cashier", "x": 225, "y": 1639, "width": 98, "height": 39, "score": 0.83}
];

test("Tops: quantity rows with a unit, and no date or store header read as an item", () => {
  const scan = parseReceipt(TOPS, { imageHeight: 2000, currentYear: 2026 });
  assert.equal(scan.store, "Tops");
  assert.equal(scan.date, "2026-10-18");
  assert.equal(scan.total, 693);
  assert.deepEqual(scan.lines.map((line) => [line.quantity, line.line_total]), [[2, 78], [1, 188], [2, 98], [1, 159], [1, 90], [2, 98]]);
  assert.equal(scan.discount, 18);
});

test("a weight in grams read as 'n' comes back as ก", () => {
  const scan = parseReceipt(
    [{ text: "เห็ดหอมลายเล็ก200n 169.00", x: 0, y: 0, width: 400, height: 20, score: 0.9 }],
    { imageHeight: 100, currentYear: 2026 },
  );
  assert.equal(scan.lines[0]?.name, "เห็ดหอมลายเล็ก200ก.");
});

// From code review: cases the newer rules broke.
const reviewRows = (list) => list.flatMap((parts, r) => parts.map((text, p) => ({ text, x: 20 + p * 200, y: 40 + r * 30, width: 150, height: 20, score: 0.95 })));
const reviewParse = (list) => parseReceipt(reviewRows(list), { imageHeight: 1000, currentYear: 2026 });

test("a quantity row under a unit-priced item makes it one line with that quantity", () => {
  const scan = reviewParse([["Coke", "25.00"], ["2 x 25.00", "50.00"], ["TOTAL", "50.00"]]);
  assert.deepEqual(scan.lines.map((line) => [line.name, line.quantity, line.line_total]), [["Coke", 2, 50]]);
});

test("a number that starts a product name stays in the name and isn't the quantity", () => {
  const scan = reviewParse([["3 in 1 Coffee", "45.00"], ["2 ply Tissue", "89.00"], ["TOTAL", "134.00"]]);
  assert.deepEqual(scan.lines.map((line) => [line.name, line.quantity]), [["3 in 1 Coffee", 1], ["2 ply Tissue", 1]]);
});

test("an item whose name starts with รวม isn't the total", () => {
  const scan = reviewParse([["ขนมปัง", "25.00"], ["รวมมิตรแช่แข็ง", "45.00"], ["นมสด", "52.00"], ["รวม", "122.00"]]);
  assert.equal(scan.total, 122);
  assert.equal(scan.lines.length, 3);
});

test("savings, membership and card rows are never items", () => {
  assert.deepEqual(reviewParse([["Bread", "40.00"], ["SAVE", "10.00"], ["You saved", "5.00"], ["Membership disc", "3.00"], ["Milk", "52.00"]]).lines.map((line) => line.name), ["Bread", "Milk"]);
  assert.deepEqual(reviewParse([["Bread", "40.00"], ["บัตรเดบิต", "40.00"]]).lines.map((line) => line.name), ["Bread"]);
});

test("a quantity row whose amount equals the items so far is still a quantity, not the total", () => {
  const scan = reviewParse([["Bread", "14.00"], ["Milk", "14.00"], ["2 x 14.00", "28.00"], ["Eggs", "50.00"], ["TOTAL", "92.00"]]);
  assert.deepEqual(scan.lines.map((line) => [line.name, line.quantity, line.line_total]), [["Bread", 1, 14], ["Milk", 2, 28], ["Eggs", 1, 50]]);
  assert.equal(scan.total, 92);
});

test("an @ the OCR read as a digit still gives the unit price when the quantity column confirms it", () => {
  const scan = reviewParse([["2 โยเกิร์ตเมจิ รสจืด", "814.00", "28.00"], ["1 นมสด", "52.00"]]);
  assert.deepEqual(scan.lines.map((line) => [line.name, line.quantity, line.unit_price, line.line_total]), [
    ["โยเกิร์ตเมจิ รสจืด", 2, 14, 28],
    ["นมสด", 1, 52, 52],
  ]);
});

test("a discount after the total, or a savings summary, isn't counted again", () => {
  const scan = reviewParse([["Bread", "40.00"], ["Coupon", "-5.00"], ["TOTAL", "35.00"], ["You saved", "5.00"], ["ส่วนลดสมาชิก", "5.00"]]);
  assert.equal(scan.discount, 5);
  assert.equal(scan.total, 35);
});

test("a bare total after a discount is still the total", () => {
  const scan = reviewParse([["Bread", "40.00"], ["Milk", "60.00"], ["ส่วนลด", "10.00"], ["", "90.00"], ["Gum", "12.00"]]);
  assert.equal(scan.total, 90);
  assert.deepEqual(scan.lines.map((line) => line.name), ["Bread", "Milk"]);
});
