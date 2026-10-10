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
import type {
  ItemMarker,
  ItemShape,
  SceneItem,
  StorageTag,
} from "@/components/scene/types";

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

const COUNTABLE_UNITS =
  /^(pcs|piece|carton|cup|tube|jar|pack|bag|bottle|can|roll|refill|spool|box|bunch)/;

const MARKER_PRIORITY: Record<ItemMarker, number> = {
  expired: 0,
  soon: 1,
  low: 2,
};

const colorFor = (table: [RegExp, string][], text: string): string =>
  table.find(([pattern]) => pattern.test(text))?.[1] ?? DEFAULT_COLOR;

const lidColorFor = (productId: number): string =>
  LID_COLORS[productId % LID_COLORS.length] ?? DEFAULT_COLOR;

const shapeFor = (
  kind: ProductKind,
  productName: string,
  unitName: string,
  groupName: string,
): ItemShape => {
  const name = productName.toLowerCase();
  const unit = unitName.toLowerCase();
  if (kind === "supply") {
    if (/filament|spool/.test(name) || unit === "spool") return "spool";
    if (/tissue|towel|paper|toilet/.test(name) || unit === "roll")
      return "roll";
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
};

const markerFor = (
  kind: ProductKind,
  entries: readonly StockEntry[],
  totalInStock: number,
  product: Product,
  today: Date,
): ItemMarker | null => {
  if (kind === "food") {
    const statuses = entries.map((entry) =>
      foodStatus(entry.best_before_date, today),
    );
    if (statuses.includes("expired")) return "expired";
    if (statuses.includes("soon")) return "soon";
  }
  return isRunningLow(totalInStock, product.min_stock_amount) ? "low" : null;
};

export type LocationStock = {
  items: SceneItem[];
  tag: Omit<StorageTag, "name">;
};

export type StockInput = {
  products: readonly Product[];
  productGroups: readonly ProductGroup[];
  quantityUnits: readonly QuantityUnit[];
  stockEntries: readonly StockEntry[];
  today: Date;
};

type ProductStock = { product: Product; entries: StockEntry[] };

const emptyLocationStock = (): LocationStock => ({
  items: [],
  tag: { itemCount: 0, useSoon: 0, expired: 0, low: 0 },
});

export const stockByLocation = ({
  products,
  productGroups,
  quantityUnits,
  stockEntries,
  today,
}: StockInput): Map<number, LocationStock> => {
  const productById = new Map(products.map((product) => [product.id, product]));
  const groupNameOf = (product: Product) =>
    productGroups.find((group) => group.id === product.product_group_id)
      ?.name ?? "";
  const unitNameOf = (product: Product) =>
    quantityUnits.find((unit) => unit.id === product.qu_id_stock)?.name ?? "";

  const totalInStock = new Map<number, number>();
  for (const entry of stockEntries) {
    totalInStock.set(
      entry.product_id,
      (totalInStock.get(entry.product_id) ?? 0) + entry.amount,
    );
  }

  const stockPerLocation = new Map<number, Map<number, ProductStock>>();
  for (const entry of stockEntries) {
    const product = productById.get(entry.product_id);
    if (!product || entry.amount <= 0) continue;
    const locationId = entry.location_id ?? product.location_id;
    const productsHere =
      stockPerLocation.get(locationId) ?? new Map<number, ProductStock>();
    const productStock = productsHere.get(product.id) ?? {
      product,
      entries: [],
    };
    productStock.entries.push(entry);
    productsHere.set(product.id, productStock);
    stockPerLocation.set(locationId, productsHere);
  }

  const result = new Map<number, LocationStock>();
  const locationStockFor = (locationId: number) => {
    const existing = result.get(locationId);
    if (existing) return existing;
    const created = emptyLocationStock();
    result.set(locationId, created);
    return created;
  };

  for (const [locationId, productsHere] of stockPerLocation) {
    const locationStock = locationStockFor(locationId);
    for (const { product, entries } of productsHere.values()) {
      const kind = classifyProduct(product, productGroups);
      const unitName = unitNameOf(product);
      const amount = entries.reduce((total, entry) => total + entry.amount, 0);
      const marker = markerFor(
        kind,
        entries,
        totalInStock.get(product.id) ?? 0,
        product,
        today,
      );
      const shape = shapeFor(
        kind,
        product.name,
        unitName,
        groupNameOf(product),
      );

      locationStock.tag.itemCount += 1;
      if (marker === "soon") locationStock.tag.useSoon += 1;
      if (marker === "expired") locationStock.tag.expired += 1;

      locationStock.items.push({
        key: `${locationId}-${product.id}`,
        shape,
        color:
          shape === "spool"
            ? colorFor(FILAMENT_COLORS, product.name.toLowerCase())
            : colorFor(GROUP_COLORS, groupNameOf(product).toLowerCase()),
        accent: lidColorFor(product.id),
        copies: COUNTABLE_UNITS.test(unitName.toLowerCase())
          ? Math.min(3, Math.max(1, Math.round(amount)))
          : 1,
        marker,
      });
    }
  }

  // Counted where the product is stocked, or at its default location when none is left.
  for (const product of products) {
    if (product.active === 0) continue;
    if (
      !isRunningLow(totalInStock.get(product.id) ?? 0, product.min_stock_amount)
    )
      continue;
    const stockedAt = [...stockPerLocation].find(([, productsHere]) =>
      productsHere.has(product.id),
    )?.[0];
    locationStockFor(stockedAt ?? product.location_id).tag.low += 1;
  }

  const priorityOf = (item: SceneItem) =>
    item.marker ? MARKER_PRIORITY[item.marker] : 3;
  for (const locationStock of result.values()) {
    locationStock.items.sort(
      (first, second) => priorityOf(first) - priorityOf(second),
    );
  }

  return result;
};
