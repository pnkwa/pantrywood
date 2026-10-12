import { z } from "zod";

// Also the structured-output format the vision model fills in, so it stays plain JSON types.
export const ReceiptLineSchema = z.object({
  name: z.string().describe("Item text exactly as printed, in the receipt's language"),
  name_en: z.string().nullable().describe("Short English product name, or null if unclear"),
  quantity: z.number().describe("How many units were bought; 1 when not printed"),
  unit_price: z.number().nullable().describe("Price of one unit, or null if not printed"),
  line_total: z.number().describe("Total price of this line"),
  kind: z.enum(["food", "supply"]).describe("food = eaten or drunk; supply = household, personal care, hobby"),
  suggested_group: z.string().nullable().describe("Best product group from the given list, or null"),
  y: z.number().nullable().describe("Vertical center of the line as a fraction of the image height, 0 = top, 1 = bottom"),
});

export const ReceiptScanSchema = z.object({
  store: z.string().nullable(),
  date: z.string().nullable().describe("Purchase date as YYYY-MM-DD in the Gregorian calendar"),
  total: z.number().nullable().describe("Grand total printed on the receipt"),
  currency: z.string().describe("ISO 4217 code, e.g. THB"),
  lines: z.array(ReceiptLineSchema).describe("Purchased items only: no totals, tax, change or discounts"),
});

export type ReceiptLine = z.infer<typeof ReceiptLineSchema>;
export type ReceiptScan = z.infer<typeof ReceiptScanSchema>;

/** A kept receipt, shown as a polaroid on the Receipts page. Pantrywood's own data. */
export const ReceiptMemorySchema = z.object({
  id: z.string(),
  store: z.string().nullable(),
  date: z.string().nullable(),
  total: z.number().nullable(),
  currency: z.string(),
  lineCount: z.number(),
  /** Downscaled JPEG data URL; null when storage was too full to keep it. */
  image: z.string().nullable(),
  savedAt: z.string(),
});

export type ReceiptMemory = z.infer<typeof ReceiptMemorySchema>;

/** "Remember matches": a printed receipt name mapped to a Grocy product. */
export const ReceiptMatchSchema = z.object({
  receiptName: z.string(),
  productId: z.number(),
});

export type ReceiptMatch = z.infer<typeof ReceiptMatchSchema>;
