import {
  classifyProduct,
  foodStatus,
  isRunningLow,
  type Product,
  type ProductGroup,
  type ProductKind,
  type QuantityUnit,
  type StockEntry,
} from "@pantrywood/shared";
import type { ItemMarker, ItemShape, SceneItem, StorageTag } from "@/components/scene/types";

/* Turns Grocy stock into the little shapes and tags the room shows. */

const GROUP_COLORS: [RegExp, string][] = [
  [/dairy|egg|milk/, "#A9C9DA"],
  [/produce|veg|fruit|herb/, "#8FA67A"],
  [/meat|fish|seafood/, "#E9A9A9"],
  [/rice|grain|flour|bread|bakery/, "#D9BC93"],
  [/sauce|season|condiment|spice/, "#C8755A"],
  [/pantry|staple|canned|noodle/, "#E2B25C"],
  [/snack|sweet|candy/, "#F2D27A"],
  [/frozen/, "#C9DCE0"],
  [/drink|beverage/, "#A9C4C9"],
  [/bath|personal|beauty/, "#A9C9DA"],
  [/clean/, "#A9BC95"],
  [/laundry/, "#8FB3CC"],
  [/paper/, "#FBF6EC"],
];
const DEFAULT_COLOR = "#D9C9AE";

const FILAMENT_COLORS: [RegExp, string][] = [
  [/sage|green|เขียว/, "#8FA67A"],
  [/cream|ครีม/, "#F3E9D6"],
  [/terracotta|orange|ส้ม/, "#C8755A"],
  [/honey|yellow|เหลือง/, "#E2B25C"],
  [/blue|ฟ้า|น้ำเงิน/, "#A9C9DA"],
  [/pink|ชมพู/, "#E9A9A9"],
  [/red|แดง/, "#D9604A"],
  [/white|ขาว/, "#FFFBF3"],
  [/black|ดำ/, "#4A3B2E"],
  [/brown|wood|น้ำตาล/, "#A47551"],
];

const LID_COLORS = ["#F2D27A", "#E9A9A9", "#A9C9DA", "#8FA67A", "#FFFBF3"];

function match(table: [RegExp, string][], text: string, fallback: string): string {
  return table.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
}

function shapeFor(kind: ProductKind, productName: string, unitName: string, groupName: string): ItemShape {
  const name = productName.toLowerCase();
  const unit = unitName.toLowerCase();
  if (kind === "supply") {
    if (/filament|spool/.test(name) || unit === "spool") return "spool";
    if (/tissue|towel|paper|toilet/.test(name) || unit === "roll") return "roll";
    if (/detergent|powder/.test(name)) return "box";
    return "bottle";
  }
  if (unit === "carton") return "carton";
  if (unit === "can") return "can";
  if (unit === "jar" || unit === "cup" || unit === "bottle") return "jar";
  if (unit === "bag") return "bag";
  if (unit === "pack" || unit === "box") return "box";
  if (/produce|veg|fruit|herb/.test(groupName.toLowerCase())) return "bag";
  return "box";
}

const COUNTABLE_UNITS = /^(pcs|piece|carton|cup|tube|jar|pack|bag|bottle|can|roll|refill|spool|box|bunch)/;

export type LocationStock = { items: SceneItem[]; tag: Omit<StorageTag, "name"> };

export type StockInput = {
  products: readonly Product[];
  productGroups: readonly ProductGroup[];
  quantityUnits: readonly QuantityUnit[];
  stockEntries: readonly StockEntry[];
  today: Date;
};

/** Items and tag numbers for every location id. */
export function stockByLocation({
  products,
  productGroups,
  quantityUnits,
  stockEntries,
  today,
}: StockInput): Map<number, LocationStock> {
  const productById = new Map(products.map((p) => [p.id, p]));
  const groupName = (product: Product) => productGroups.find((g) => g.id === product.product_group_id)?.name ?? "";
  const unitName = (product: Product) => quantityUnits.find((u) => u.id === product.qu_id_stock)?.name ?? "";

  // Total stock per product, over every location (min stock is per product).
  const totalAmount = new Map<number, number>();
  for (const entry of stockEntries) {
    totalAmount.set(entry.product_id, (totalAmount.get(entry.product_id) ?? 0) + entry.amount);
  }

  // Batches per location → per product.
  const batches = new Map<number, Map<number, StockEntry[]>>();
  for (const entry of stockEntries) {
    const product = productById.get(entry.product_id);
    if (!product || entry.amount <= 0) continue;
    const locationId = entry.location_id ?? product.location_id;
    const perProduct = batches.get(locationId) ?? new Map<number, StockEntry[]>();
    perProduct.set(entry.product_id, [...(perProduct.get(entry.product_id) ?? []), entry]);
    batches.set(locationId, perProduct);
  }

  const result = new Map<number, LocationStock>();
  const ensure = (locationId: number) => {
    let stock = result.get(locationId);
    if (!stock) {
      stock = { items: [], tag: { itemCount: 0, useSoon: 0, expired: 0, low: 0 } };
      result.set(locationId, stock);
    }
    return stock;
  };

  for (const [locationId, perProduct] of batches) {
    const stock = ensure(locationId);
    for (const [productId, entries] of perProduct) {
      const product = productById.get(productId)!;
      const kind = classifyProduct(product, productGroups);
      const group = groupName(product);
      const unit = unitName(product);
      const amount = entries.reduce((sum, e) => sum + e.amount, 0);

      let marker: ItemMarker | null = null;
      if (kind === "food") {
        const statuses = entries.map((e) => foodStatus(e.best_before_date, today));
        if (statuses.includes("expired")) marker = "expired";
        else if (statuses.includes("soon")) marker = "soon";
      }
      if (isRunningLow(totalAmount.get(productId) ?? 0, product.min_stock_amount)) marker ??= "low";

      stock.tag.itemCount += 1;
      if (marker === "soon") stock.tag.useSoon += 1;
      if (marker === "expired") stock.tag.expired += 1;

      const shape = shapeFor(kind, product.name, unit, group);
      stock.items.push({
        key: `${locationId}-${productId}`,
        shape,
        color:
          shape === "spool"
            ? match(FILAMENT_COLORS, product.name.toLowerCase(), DEFAULT_COLOR)
            : match(GROUP_COLORS, group.toLowerCase(), DEFAULT_COLOR),
        accent: LID_COLORS[productId % LID_COLORS.length]!,
        copies: COUNTABLE_UNITS.test(unit.toLowerCase()) ? Math.min(3, Math.max(1, Math.round(amount))) : 1,
        marker,
      });
    }
  }

  // Running low counts every product below its min stock, including ones with none left,
  // at the location they belong to.
  for (const product of products) {
    if (product.active === 0) continue;
    if (!isRunningLow(totalAmount.get(product.id) ?? 0, product.min_stock_amount)) continue;
    const locationId = [...batches].find(([, perProduct]) => perProduct.has(product.id))?.[0] ?? product.location_id;
    ensure(locationId).tag.low += 1;
  }

  // Use-soon and past-its-date items first, so they get the front spots.
  const priority = (item: SceneItem) => (item.marker === "expired" ? 0 : item.marker === "soon" ? 1 : 2);
  for (const stock of result.values()) stock.items.sort((a, b) => priority(a) - priority(b));

  return result;
}
