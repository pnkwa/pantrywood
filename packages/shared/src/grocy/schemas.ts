import { z } from "zod";

/*
 * Grocy API shapes (Grocy 4.x). Grocy stores flags as 0/1 and some setups return numbers as
 * strings, so numeric fields are coerced. Unknown fields are kept (Grocy adds columns over time).
 */

const id = z.coerce.number().int();
const optionalId = z.coerce.number().int().nullish();
const amount = z.coerce.number();
const flag = z.coerce.number().int().pipe(z.union([z.literal(0), z.literal(1)]));
/** "YYYY-MM-DD". Grocy uses 2999-12-31 for "never expires". */
const date = z.string();
const timestamp = z.string();
const userfields = z.record(z.string(), z.string().nullable()).nullish();

export const NEVER_EXPIRES_DATE = "2999-12-31";

/** Product userfield that holds the Thai name. Create it in Grocy (Manage → Userfields). */
export const THAI_NAME_USERFIELD = "name_th";

export const ProductGroupSchema = z.looseObject({
  id,
  name: z.string(),
  description: z.string().nullish(),
  active: flag.optional(),
  row_created_timestamp: timestamp.optional(),
});

export const LocationSchema = z.looseObject({
  id,
  name: z.string(),
  description: z.string().nullish(),
  is_freezer: flag,
  active: flag.optional(),
  row_created_timestamp: timestamp.optional(),
});

export const QuantityUnitSchema = z.looseObject({
  id,
  name: z.string(),
  name_plural: z.string().nullish(),
  description: z.string().nullish(),
  active: flag.optional(),
  row_created_timestamp: timestamp.optional(),
});

export const ProductSchema = z.looseObject({
  id,
  name: z.string(),
  description: z.string().nullish(),
  product_group_id: optionalId,
  active: flag,
  location_id: id,
  shopping_location_id: optionalId,
  qu_id_purchase: id,
  qu_id_stock: id,
  min_stock_amount: amount,
  /** -1 = never expires (Grocy default for supplies). */
  default_best_before_days: z.coerce.number().int(),
  default_best_before_days_after_open: z.coerce.number().int(),
  default_best_before_days_after_freezing: z.coerce.number().int().optional(),
  default_best_before_days_after_thawing: z.coerce.number().int().optional(),
  picture_file_name: z.string().nullish(),
  parent_product_id: optionalId,
  /** 1 = best before, 2 = expiration date. */
  due_type: z.coerce.number().int().optional(),
  quick_consume_amount: amount.optional(),
  quick_open_amount: amount.optional(),
  hide_on_stock_overview: flag.optional(),
  should_not_be_frozen: flag.optional(),
  row_created_timestamp: timestamp.optional(),
  userfields,
});

/** One batch of stock (Grocy table `stock`, from /objects/stock or /stock/products/{id}/entries). */
export const StockEntrySchema = z.looseObject({
  id,
  product_id: id,
  amount,
  best_before_date: date,
  purchased_date: date.nullish(),
  stock_id: z.string(),
  price: amount.nullish(),
  open: flag,
  opened_date: date.nullish(),
  location_id: optionalId,
  shopping_location_id: optionalId,
  note: z.string().nullish(),
  row_created_timestamp: timestamp.optional(),
});

export const ProductBarcodeSchema = z.looseObject({
  id,
  product_id: id,
  barcode: z.string(),
  qu_id: optionalId,
  amount: amount.nullish(),
  shopping_location_id: optionalId,
  last_price: amount.nullish(),
  note: z.string().nullish(),
  row_created_timestamp: timestamp.optional(),
});

/** One row of GET /stock: the current stock of a product, summed over its batches. */
export const CurrentStockSchema = z.looseObject({
  product_id: id,
  amount,
  amount_aggregated: amount,
  amount_opened: amount,
  amount_opened_aggregated: amount,
  best_before_date: date,
  is_aggregated_amount: flag,
  product: ProductSchema,
});

export type ProductGroup = z.infer<typeof ProductGroupSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type QuantityUnit = z.infer<typeof QuantityUnitSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type StockEntry = z.infer<typeof StockEntrySchema>;
export type ProductBarcode = z.infer<typeof ProductBarcodeSchema>;
export type CurrentStock = z.infer<typeof CurrentStockSchema>;
