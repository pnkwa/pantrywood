// No "@/" imports: scripts/receipt-parse.test.mjs runs this file directly with Node.
import type { ReceiptLine, ReceiptScan } from "@pantrywood/shared";

// Turns OCR text boxes from a receipt photo into a ReceiptScan, for Thai and English receipts.
// The OCR engine only finds text; everything receipt-shaped (rows, prices, totals, dates) happens here.

/** One piece of text the OCR found, with its box in image pixels. */
export type OcrText = { text: string; x: number; y: number; width: number; height: number; score: number };

/** Lines that are never items: totals, tax, payment, change, discounts, points, receipt furniture. */
const NOT_ITEM = [
  /total|sub\s*total|amount|net|balance|grand/i,
  /รวม|ยอด|สุทธิ|ทั้งหมด|ชำระ/,
  /vat|tax|ภาษี|มูลค่าสินค้า|ก่อนภาษี/i,
  /cash|change|card|credit|debit|paid|tendered|qr|promptpay|wallet/i,
  /เงินสด|เงินทอน|ทอน|รับเงิน|บัตร|เครดิต|พร้อมเพย์|โอน/,
  /discount|save|saving|coupon|promo|ส่วนลด|ลด|คูปอง|โปรโมชั่น/i,
  /point|member|แต้ม|คะแนน|สมาชิก|the\s*1|all\s*member/i,
  /tel|phone|tax\s*id|pos|receipt|invoice|cashier|thank|โทร|ใบเสร็จ|ใบกำกับ|พนักงาน|ขอบคุณ|เลขประจำตัว|สาขา|branch/i,
  /items?\s*\d|\d+\s*items?|จำนวน\s*\d+|\d+\s*ชิ้น/i,
];

/** Lines that state the amount paid; the first match wins, so the most specific come first. */
const TOTAL = [/grand\s*total|net\s*total|ยอดสุทธิ|สุทธิ/i, /^total\b|ยอดรวม|รวมทั้งสิ้น|รวมเงิน/i, /total|รวม/i];

const SUPPLY_WORDS =
  /tissue|toilet|paper|shampoo|soap|detergent|toothpaste|toothbrush|lotion|wash|cleaner|filament|battery|ทิชชู่|กระดาษ|แชมพู|สบู่|ผงซักฟอก|น้ำยา|ยาสีฟัน|แปรงสีฟัน|โลชั่น|ครีมอาบน้ำ|ถุงขยะ|ถ่าน/i;

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
const PRICE = /(-?\d{1,3}(?:[,]\d{3})*|-?\d+)[.,](\d{2})(?!\d)/;
const QUANTITY = /(?:^|\s)(\d+(?:\.\d+)?)\s*[x×@*]\s*(\d+(?:[.,]\d{2})?)|(?:^|\s)[x×]\s*(\d+)(?:\s|$)/i;
const DATE = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/;
const ISO_DATE = /(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/;
const BUDDHIST_ERA_OFFSET = 543;

/** Thai digits to Arabic, and the letters OCR mistakes for digits when they sit inside a number. */
export const normalize = (text: string) =>
  text
    .replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)))
    // Only inside a word that is otherwise a number, so "Oil" and "Milk" keep their letters.
    .replace(/[\doOlI|.,]+/g, (word) =>
      /\d/.test(word) && /^[\doOlI|]+([.,][\doOlI|]{2})?$/.test(word) ? word.replace(/[oO]/g, "0").replace(/[lI|]/g, "1") : word,
    )
    .replace(/\s+/g, " ")
    .trim();

const toNumber = (whole: string, cents: string) => Number(`${whole.replace(/,/g, "")}.${cents}`);

/** The last price on a row (the line total sits at the right), and the text before it. */
const lastPrice = (text: string) => {
  const matches = [...text.matchAll(new RegExp(PRICE.source, "g"))];
  const last = matches.at(-1);
  if (!last || last.index === undefined) return null;
  return { value: toNumber(last[1] ?? "0", last[2] ?? "00"), before: text.slice(0, last.index).trim() };
};

type Row = { text: string; y: number };

/** Boxes on the same printed line, joined left to right; rows from top to bottom. */
export const groupRows = (texts: readonly OcrText[]): Row[] => {
  const sorted = [...texts].filter((text) => text.text.trim()).sort((first, second) => first.y + first.height / 2 - (second.y + second.height / 2));
  const heights = sorted.map((text) => text.height).sort((first, second) => first - second);
  const typical = heights[Math.floor(heights.length / 2)] ?? 10;
  const rows: OcrText[][] = [];
  for (const text of sorted) {
    const center = text.y + text.height / 2;
    const row = rows.at(-1);
    const rowCenter = row ? row.reduce((sum, part) => sum + part.y + part.height / 2, 0) / row.length : -Infinity;
    if (row && Math.abs(center - rowCenter) < typical * 0.55) row.push(text);
    else rows.push([text]);
  }
  return rows.map((row) => ({
    text: normalize(
      [...row]
        .sort((first, second) => first.x - second.x)
        .map((part) => part.text)
        .join(" "),
    ),
    y: row.reduce((sum, part) => sum + part.y + part.height / 2, 0) / row.length,
  }));
};

/** A date as YYYY-MM-DD; Buddhist-era years (2569, or 69 printed short) become Gregorian. */
export const parseDate = (text: string, currentYear: number) => {
  const iso = ISO_DATE.exec(text);
  const dated = iso ? [iso[3], iso[2], iso[1]] : DATE.exec(text)?.slice(1, 4);
  if (!dated) return null;
  const day = Number(dated[0]);
  const month = Number(dated[1]);
  let year = Number(dated[2]);
  if (year < 100) {
    // A short year that lands near now as Buddhist era (69 → 2569 → 2026) is read that way.
    const asBuddhist = 2500 + year - BUDDHIST_ERA_OFFSET;
    year = Math.abs(asBuddhist - currentYear) <= 1 ? asBuddhist : 2000 + year;
  } else if (year > 2400) year -= BUDDHIST_ERA_OFFSET;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const hasLetters = (text: string) => /[A-Za-z฀-๿]{2,}/.test(text);
const isNotItem = (text: string) => NOT_ITEM.some((pattern) => pattern.test(text));

/** A quantity line on its own ("2 x 25.00", "2 @ 12.50 25.00"), which belongs to the item above it. */
const quantityOnly = (text: string) => {
  const match = QUANTITY.exec(text);
  if (!match) return null;
  const rest = text.replace(match[0], "").replace(PRICE, "").trim();
  return hasLetters(rest) ? null : match;
};

const quantityFrom = (match: RegExpExecArray) => {
  if (match[3]) return { quantity: Number(match[3]), unitPrice: null };
  const unit = match[2] ?? "";
  return { quantity: Number(match[1]), unitPrice: unit.includes(".") || unit.includes(",") ? Number(unit.replace(",", ".")) : Number(unit) };
};

type ParseOptions = { imageHeight: number; currentYear: number };

/** OCR boxes → store, date, total and item lines. Names stay as printed; matching to products happens later. */
export const parseReceipt = (texts: readonly OcrText[], { imageHeight, currentYear }: ParseOptions): ReceiptScan => {
  const rows = groupRows(texts);
  const lines: ReceiptLine[] = [];
  let store: string | null = null;
  let date: string | null = null;
  let total: number | null = null;
  let totalRank = TOTAL.length;
  const fullText = rows.map((row) => row.text).join("\n");

  for (const row of rows) {
    const { text } = row;
    date ??= parseDate(text, currentYear);
    const price = lastPrice(text);
    const rank = TOTAL.findIndex((pattern) => pattern.test(text));
    if (price && rank !== -1 && rank < totalRank && !/sub\s*total|ก่อนภาษี|vat|ภาษี/i.test(text)) {
      total = price.value;
      totalRank = rank;
    }
    if (isNotItem(text)) continue;

    const quantity = quantityOnly(text);
    const previous = lines.at(-1);
    if (quantity && previous) {
      const { quantity: count, unitPrice } = quantityFrom(quantity);
      previous.quantity = count;
      previous.unit_price = unitPrice ?? (price ? price.value / count : previous.unit_price);
      if (price && unitPrice !== null && Math.abs(price.value - count * unitPrice) < 0.01) previous.line_total = price.value;
      continue;
    }

    if (!price || price.value <= 0 || !hasLetters(price.before)) {
      // Before the first item, the first wordy line without a price is the store's name.
      if (lines.length === 0 && store === null && !price && hasLetters(text) && !DATE.test(text)) store = text;
      continue;
    }

    const inline = QUANTITY.exec(price.before);
    const { quantity: count, unitPrice } = inline ? quantityFrom(inline) : { quantity: 1, unitPrice: null };
    const name = (inline ? price.before.replace(inline[0], " ") : price.before)
      .replace(/^\d+\s+/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!hasLetters(name)) continue;
    lines.push({
      name,
      name_en: null,
      quantity: count,
      unit_price: unitPrice ?? price.value / count,
      line_total: price.value,
      kind: SUPPLY_WORDS.test(name) ? "supply" : "food",
      suggested_group: null,
      y: imageHeight > 0 ? Math.min(1, Math.max(0, row.y / imageHeight)) : null,
    });
  }

  const currency = /\$|usd/i.test(fullText) && !/บาท|฿|thb/i.test(fullText) ? "USD" : "THB";
  return { store, date, total, currency, lines };
};
