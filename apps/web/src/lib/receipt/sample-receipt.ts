import type { ReceiptScan } from "@pantrywood/shared";

/** What the receipt route answers in mock mode without an API key, so the review flow can be tried. */
export const SAMPLE_RECEIPT: ReceiptScan = {
  store: "Supermarket",
  date: "2026-10-08",
  total: 529,
  currency: "THB",
  lines: [
    { name: "นมสด 1L", name_en: "Fresh milk", quantity: 1, unit_price: 52, line_total: 52, kind: "food", suggested_group: "Dairy & eggs", y: 0.22 },
    { name: "ทิชชู่ 6 ม้วน", name_en: "Tissue, 6 rolls", quantity: 1, unit_price: 89, line_total: 89, kind: "supply", suggested_group: "Paper goods", y: 0.29 },
    { name: "โหระพา", name_en: "Thai basil", quantity: 1, unit_price: 15, line_total: 15, kind: "food", suggested_group: "Produce", y: 0.36 },
    { name: "แชมพู", name_en: "Shampoo", quantity: 1, unit_price: 129, line_total: 129, kind: "supply", suggested_group: "Bathroom", y: 0.43 },
    { name: "ข้าวหอมมะลิ 5kg", name_en: "Jasmine rice 5 kg", quantity: 1, unit_price: 189, line_total: 189, kind: "food", suggested_group: "Rice & grains", y: 0.5 },
    { name: "น้ำมันพืช 1L", name_en: "Vegetable oil", quantity: 1, unit_price: 55, line_total: 55, kind: "food", suggested_group: "Pantry staples", y: 0.57 },
  ],
};
