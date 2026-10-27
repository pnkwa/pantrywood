// No "@/" imports: scripts/receipt-parse.test.mjs runs this file directly with Node.
import type { ReceiptLine, ReceiptScan } from "@pantrywood/shared";

export type OcrText = { text: string; x: number; y: number; width: number; height: number; score: number };

// Thai has no spaces, so short Thai words only count at the start of a line: โอน is also inside โบโอน่า.
const NOT_ITEM = [
  /\b(sub\s*total|total|amount|net|balance|grand|vat|tax|cash|change|card|credit|debit|paid|tendered|qr|promptpay|wallet|discount|save|saved|saving|savings|coupon|promo|points?|members?|membership|tel|phone|pos|receipt|invoice|cashier|thank|branch)\b/i,
  // A short label counts only on its own ("รวม 3 ชิ้น"), not as the start of a name ("รวมมิตร", "ลดา").
  /^(รวม|ยอด|ทอน|โอน|ลด|ชำระ|บัตร)(?![ก-๙])/,
  /^(ยอดรวม|ยอดเงิน|ยอดชำระ|รวมเงิน|รวมทั้ง|ทอนเงิน|โอนเงิน|ชำระเงิน|บัตร)/,
  /สุทธิ|ทั้งหมด|ภาษี|มูลค่าสินค้า|เงินสด|เงินทอน|รับเงิน|บัตรเครดิต|เครดิต|พร้อมเพย์|ส่วนลด|คูปอง|โปรโมชั่น|แต้ม|คะแนน|สมาชิก|โทร|ใบเสร็จ|ใบกำกับ|พนักงาน|ขอบคุณ|เลขประจำตัว|สาขา/,
  /the\s*1|all\s*member/i,
  /\bitems?\s*\d|\d+\s*items?\b|จำนวน\s*\d+|\d+\s*ชิ้น/i,
];

// Most specific first: the first match wins.
const TOTAL = [/grand\s*total|net\s*total|ยอดสุทธิ|^สุทธิ/i, /^total\b|^ยอดรวม|รวมทั้งสิ้น|^รวมเงิน/i, /\btotal\b|^รวม(?![ก-๙])/i];
const SUBTOTAL = /sub\s*total|ก่อนภาษี|\bvat\b|\btax\b|ภาษี/i;
// Not "save"/"you saved": those sum up the discounts again, after the total.
const DISCOUNT = /\bdisc(ount)?\b|mix\s*&?\s*match|coupon|ส่วนลด|คูปอง/i;

// Chains whose name is often a logo or prints garbled.
const KNOWN_STORES: [RegExp, string][] = [
  // 0107542000011 is CP ALL's tax ID, printed on every 7-Eleven slip.
  [/7[-\s]?(eleven|e1even|elev|blen|11)\b|cp\s*al{1,2}\b|เซเว่น|0107542000011/i, "7-Eleven"],
  [/lotus'?s|โลตัส/i, "Lotus's"],
  [/big\s*c\b|บิ๊กซี/i, "Big C"],
  [/\btops\b|ท็อปส์/i, "Tops"],
  [/go\s*wholesale|central\s*food\s*wholesale/i, "Go Wholesale"],
  [/makro|แม็คโคร|แมคโคร/i, "Makro"],
  [/family\s*mart|แฟมิลี่มาร์ท/i, "FamilyMart"],
  [/lawson|ลอว์สัน/i, "Lawson"],
  [/cj\s*(express|more)/i, "CJ"],
  [/villa\s*market/i, "Villa Market"],
  [/gourmet\s*market/i, "Gourmet Market"],
  [/foodland/i, "Foodland"],
  [/max\s*valu|แม็กซ์แวลู/i, "MaxValu"],
];

const SUPPLY_WORDS =
  /tissue|toilet|paper|shampoo|soap|detergent|toothpaste|toothbrush|lotion|wash|cleaner|filament|battery|ทิชชู่|กระดาษ|แชมพู|สบู่|ผงซักฟอก|น้ำยา|ยาสีฟัน|แปรงสีฟัน|โลชั่น|ครีมอาบน้ำ|ถุงขยะ|ถ่าน/i;

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
const PRICE = /(-?\d{1,3}(?:[,]\d{3})*|-?\d+)[.,](\d{2})(?!\d)/;
const QUANTITY = /(?:^|\s)(\d+(?:\.\d+)?)\s*[x×@*]\s*(\d+(?:[.,]\d{2})?)|(?:^|\s)[x×]\s*(\d+)(?:\s|$)/i;
const DATE = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/;
const ISO_DATE = /(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/;
const BUDDHIST_ERA_OFFSET = 543;

export const normalize = (text: string) =>
  text
    .replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)))
    // OCR reads 0 as O and 1 as l; only fixed inside numbers, so "Oil" keeps its letters.
    .replace(/[\doOlI|.,]+/g, (word) =>
      /\d/.test(word) && /^[\doOlI|]+([.,][\doOlI|]{2})?$/.test(word) ? word.replace(/[oO]/g, "0").replace(/[lI|]/g, "1") : word,
    )
    .replace(/\s+/g, " ")
    .trim();

const toNumber = (whole: string, cents: string) => Number(`${whole.replace(/,/g, "")}.${cents}`);

// Dates and times look like prices ("18.10.2026" holds "18.10"); blank them out, keeping positions.
const withoutDates = (text: string) =>
  text.replace(new RegExp(`${ISO_DATE.source}|${DATE.source}|\\d{1,2}:\\d{2}`, "g"), (match) => " ".repeat(match.length));

const pricesIn = (text: string) => [...withoutDates(text).matchAll(new RegExp(PRICE.source, "g"))];

const lastPrice = (text: string) => {
  const last = pricesIn(text).at(-1);
  if (!last || last.index === undefined) return null;
  return { value: toNumber(last[1] ?? "0", last[2] ?? "00"), before: text.slice(0, last.index).trim() };
};

// A total row can also carry the VAT printed beside it ("Total 809.00 30.75"); the total comes first.
const firstPrice = (text: string) => {
  const first = pricesIn(text)[0];
  return first ? toNumber(first[1] ?? "0", first[2] ?? "00") : null;
};

const TEXT_SHARE = 0.6;

type Row = { text: string; y: number; top: number; bottom: number; score: number };

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
  // The text finder pads every box (unclip 1.5); the printed letters fill about the middle 60% of it.
  const textHalfHeight = (row: OcrText[]) => (Math.max(...row.map((part) => part.height)) * TEXT_SHARE) / 2;
  return rows.map((row) => ({
    text: normalize(
      [...row]
        .sort((first, second) => first.x - second.x)
        .map((part) => part.text)
        .join(" "),
    ),
    y: row.reduce((sum, part) => sum + part.y + part.height / 2, 0) / row.length,
    top: row.reduce((sum, part) => sum + part.y + part.height / 2, 0) / row.length - textHalfHeight(row),
    bottom: row.reduce((sum, part) => sum + part.y + part.height / 2, 0) / row.length + textHalfHeight(row),
    score: Math.min(...row.map((part) => part.score)),
  }));
};

export const parseDate = (text: string, currentYear: number) => {
  const iso = ISO_DATE.exec(text);
  const dated = iso ? [iso[3], iso[2], iso[1]] : DATE.exec(text)?.slice(1, 4);
  if (!dated) return null;
  // Thai receipts print day/month; US ones month/day, which shows when the middle number can't be a month.
  const usOrder = !iso && Number(dated[1]) > 12 && Number(dated[0]) <= 12;
  const day = Number(usOrder ? dated[1] : dated[0]);
  const month = Number(usOrder ? dated[0] : dated[1]);
  let year = Number(dated[2]);
  if (year < 100) {
    // A short year that would be in the future is Buddhist era: 63 → 2563 → 2020.
    year = 2000 + year > currentYear + 1 ? 2500 + year - BUDDHIST_ERA_OFFSET : 2000 + year;
  } else if (year > 2400) year -= BUDDHIST_ERA_OFFSET;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const hasLetters = (text: string) => /[A-Za-z฀-๿]{2,}/.test(text);
const isNotItem = (text: string) => NOT_ITEM.some((pattern) => pattern.test(text));

const NOT_STORE =
  /^\d+\s|street|\bst\.|road|\brd\.|avenue|\bave\b|suite|city|state|zip|\(\d{3}\)|\d{3}[-\s]\d{3,4}|store\s*[:#]|register|ถนน|ซอย|แขวง|เขต|ตำบล|อำเภอ|จังหวัด|ต\.|อ\.|จ\./i;
// Logos read poorly; an unsure store name is left out rather than guessed.
const MIN_STORE_SCORE = 0.9;

// A quantity printed on its own row ("2 x 25.00") belongs to the item above it.
const quantityOnly = (text: string) => {
  const match = QUANTITY.exec(text);
  if (!match) return null;
  // "2 * 49.00 / ชิ้น" (Tops) ends with the unit it's priced per.
  const rest = text.replace(match[0], "").replace(PRICE, "").replace(/\/\s*\S*$/, "").trim();
  return hasLetters(rest) ? null : match;
};

const quantityFrom = (match: RegExpExecArray) => {
  if (match[3]) return { quantity: Number(match[3]), unitPrice: null };
  const unit = match[2] ?? "";
  return { quantity: Number(match[1]), unitPrice: unit.includes(".") || unit.includes(",") ? Number(unit.replace(",", ".")) : Number(unit) };
};

export const UNREADABLE_NAME = "(unreadable)";

/** An item name without the receipt's codes: barcodes, "(1 * 169.00)", prices, VAT flags, currency. */
const cleanName = (text: string) =>
  text
    .replace(/\(?\d[\d.]{7,}\)?\s*[A-Z]?\d?\b/g, " ")
    .replace(/\(\s*\d+\s*[*x×+-]?\s*\d+[.,]?\d*\s*\)?/g, " ")
    .replace(/@\s*\d+[.,]\d{2}/, " ")
    .replace(new RegExp(PRICE.source, "g"), " ")
    .replace(/[$฿€£¥]|\bTHB\b|บาท/g, " ")
    // OCR reads "%" as 8: "100%" comes out as "1008".
    .replace(/(?<![\d.,])(100|[1-9]0)8(?![\d.,])/g, "$1%")
    // Grams: "200n" is "200ก".
    .replace(/(\d)\s*n\.?(?=\s|$)/g, "$1ก.")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type NameAbove = { name: string; top: number };

type ParseOptions = { imageHeight: number; currentYear: number };

export const parseReceipt = (texts: readonly OcrText[], { imageHeight, currentYear }: ParseOptions): ReceiptScan => {
  const rows = groupRows(texts);
  const lines: ReceiptLine[] = [];
  let store: string | null = null;
  let date: string | null = null;
  let total: number | null = null;
  let totalRank = TOTAL.length;
  let discount = 0;
  // Nothing below the totals is an item: payment, change, points.
  let itemsDone = false;
  let knownStore: string | null = null;
  let nameAbove: NameAbove | null = null;
  const fullText = rows.map((row) => row.text).join("\n");

  const fraction = (pixels: number) => (imageHeight > 0 ? Math.min(1, Math.max(0, pixels / imageHeight)) : null);
  // top is where the item starts: its own row, or the name row above it.
  const lineFor = (name: string, quantity: number, unitPrice: number | null, total: number, row: Row, top: number): ReceiptLine => ({
    name,
    name_en: null,
    quantity,
    unit_price: unitPrice ?? total / quantity,
    line_total: total,
    kind: SUPPLY_WORDS.test(name) ? "supply" : "food",
    suggested_group: null,
    y: fraction(row.y),
    top: fraction(top),
    bottom: fraction(row.bottom),
  });

  for (const row of rows) {
    const { text } = row;
    // Only the row directly above can be this row's name.
    const above: NameAbove | null = nameAbove;
    nameAbove = null;
    date ??= parseDate(text, currentYear);
    knownStore ??= KNOWN_STORES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
    const price = lastPrice(text);
    const rank = TOTAL.findIndex((pattern) => pattern.test(text));
    if (price && rank !== -1 && rank < totalRank && !SUBTOTAL.test(text)) {
      total = firstPrice(text) ?? price.value;
      totalRank = rank;
    }
    if (price && lines.length > 0 && (rank !== -1 || SUBTOTAL.test(text))) itemsDone = true;
    // Discounts print among the items or between the subtotal and the total ("ส่วนลด 4.00", "Mix&Match -18.00").
    if (price && lines.length > 0 && totalRank === TOTAL.length && rank === -1 && (DISCOUNT.test(text) || price.value < 0)) {
      discount += Math.abs(price.value);
      continue;
    }
    // An amount equal to the items so far, bare or on a non-item row, is the total even when its label was misread.
    const quantity = quantityOnly(text);
    const previous = lines.at(-1);
    const near = (first: number, second: number) => Math.abs(first - second) < 0.01;
    // A row with its own amount is a new item ("(barcode) (1 * 160.00) 160.00"), unless it restates the one above.
    const forPrevious =
      quantity &&
      previous &&
      above === null &&
      (!price ||
        near(price.value, previous.line_total) ||
        near(quantityFrom(quantity).quantity * (quantityFrom(quantity).unitPrice ?? 0), previous.line_total) ||
        // "Coke 25.00" then "2 x 25.00 50.00": the row gives the quantity of the unit price above.
        near(quantityFrom(quantity).unitPrice ?? -1, previous.unit_price ?? -2));
    if (!itemsDone && !isNotItem(text) && quantity && previous && forPrevious) {
      const { quantity: count, unitPrice } = quantityFrom(quantity);
      previous.quantity = count;
      previous.unit_price = unitPrice ?? (price ? price.value / count : previous.unit_price);
      if (price && unitPrice !== null && Math.abs(price.value - count * unitPrice) < 0.01) previous.line_total = price.value;
      previous.bottom = fraction(row.bottom);
      continue;
    }

    const itemsSum = lines.reduce((sum, line) => sum + line.line_total, 0);
    const sumSoFar = (amount: number) => [itemsSum, itemsSum - discount].some((sum) => Math.abs(amount - sum) < 0.01);
    if (price && (!hasLetters(price.before) || isNotItem(text)) && lines.length > 1 && sumSoFar(price.value)) {
      total ??= price.value;
      itemsDone = true;
    }
    if (itemsDone || isNotItem(text)) continue;


    if (!price || price.value <= 0) {
      const storeLike = !price && hasLetters(text) && !DATE.test(text) && !NOT_STORE.test(text) && row.score >= MIN_STORE_SCORE;
      if (lines.length === 0 && store === null && storeLike) store = text;
      nameAbove = !price && hasLetters(text) ? { name: cleanName(text), top: row.top } : null;
      // A barcode row between a name and its price ("(2105060000380000003921)N") passes the name on.
      if (!price && !hasLetters(cleanName(text))) nameAbove = above;
      continue;
    }

    // Either "2 x 25.00" inline, or a quantity column with "@25.00" (7-Eleven).
    const inline = QUANTITY.exec(price.before);
    const leading = /^(\d{1,2})\s+(?=\D)/.exec(price.before);
    const at = /@\s*(\d+[.,]\d{2})/.exec(price.before);
    // With a quantity column, a middle amount is the unit price when count × it = the total, also when the OCR
    // read the "@" before it as a digit ("2 โยเกิร์ต 814.00 28.00" is 2 × 14.00).
    const columnCount = Number(leading?.[1] ?? 0);
    const misreadAt =
      !at && columnCount > 1
        ? pricesIn(price.before)
            .flatMap((match) => [toNumber(match[1] ?? "0", match[2] ?? "00"), toNumber((match[1] ?? "0").slice(1) || "0", match[2] ?? "00")])
            .find((value) => value > 0 && near(columnCount * value, price.value))
        : undefined;
    const unitPrice = inline
      ? quantityFrom(inline).unitPrice
      : at
        ? Number((at[1] ?? "").replace(",", "."))
        : (misreadAt ?? null);
    // The small quantity digit is easy to miss; "@14.00 … 28.00" says it was 2.
    const fromPrices = unitPrice ? price.value / unitPrice : 0;
    // A leading number is a quantity column (7-Eleven, Tops) only if it's 1 or the prices confirm it;
    // otherwise it belongs to the name ("3 in 1 Coffee", "2 ply Tissue").
    const leadingCount = Number(leading?.[1] ?? 0);
    const quantityColumn = leadingCount === 1 || (leadingCount > 1 && near(fromPrices, leadingCount));
    const count = inline
      ? quantityFrom(inline).quantity
      : Number.isInteger(fromPrices) && fromPrices > 0
        ? fromPrices
        : 1;
    const named = inline ? price.before.replace(inline[0], " ") : price.before;
    const ownName = cleanName(quantityColumn ? named.replace(/^\d+\s+/, "") : named);
    // Wholesale slips print the name on its own line above "(barcode) (1 * 169.00) 169.00".
    const name = hasLetters(ownName) ? ownName : (above?.name ?? null);
    const top = !hasLetters(ownName) && above ? above.top : row.top;
    if (name) lines.push(lineFor(name, count, unitPrice, price.value, row, top));
    // A price among the items whose name the OCR couldn't read stays a line, so it can be picked by hand.
    else if (lines.length > 0) lines.push(lineFor(UNREADABLE_NAME, count, unitPrice, price.value, row, row.top));
  }

  const currency = /\$|usd/i.test(fullText) && !/บาท|฿|thb/i.test(fullText) ? "USD" : "THB";
  return { store: knownStore ?? store, date, total, discount, currency, lines };
};
