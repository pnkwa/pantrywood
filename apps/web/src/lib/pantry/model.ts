import {
  classifyProduct,
  daysUntil,
  foodStatus,
  isRunningLow,
  NEVER_EXPIRES_DATE,
  THAI_NAME_USERFIELD,
  toIsoDate,
  type Location,
  type Product,
  type ProductGroup,
  type ProductKind,
  type QuantityUnit,
  type StockEntry,
} from "@pantrywood/shared";

export type ItemStatus =
  | "fresh"
  | "soon"
  | "expired"
  | "opened"
  | "stocked"
  | "low";

export type PantryItem = {
  key: string;
  productId: number;
  /** The Grocy location the stock is in; actions use this one. */
  locationId: number;
  /** Stocked in a freezer location (shown in the fridge's freezer compartment). */
  inFreezer: boolean;
  name: string;
  thaiName: string | null;
  kind: ProductKind;
  groupName: string;
  unitName: string;
  unitPlural: string;
  amount: number;
  amountOpened: number;
  /** Over every location; min stock is per product. */
  totalAmount: number;
  minStock: number;
  /** Earliest best-before here; null when it never expires. */
  bestBefore: string | null;
  daysLeft: number | null;
  status: ItemStatus;
  isRunningLow: boolean;
  /** In Grocy's consume order: opened first, then soonest best-before. */
  entries: StockEntry[];
};

export type LocationCounts = {
  itemCount: number;
  useSoon: number;
  expired: number;
  opened: number;
  low: number;
};

export type PantryLocation = {
  id: number;
  name: string;
  isFreezer: boolean;
  /** "supply" when everything here is a supply. */
  kind: ProductKind;
  items: PantryItem[];
  counts: LocationCounts;
};

export type StatSummary = { count: number; names: string[] };

export type PantryStats = {
  useSoon: StatSummary;
  runningLow: StatSummary;
  inStock: StatSummary & { spots: number };
  addedThisWeek: StatSummary;
};

export type GrocyPlace = { id: number; name: string; isFreezer: boolean };

export type Pantry = {
  /** Storage pieces; freezer locations are merged into the fridge. */
  locations: PantryLocation[];
  /** Every active Grocy location, e.g. as "Move to…" destinations. */
  places: GrocyPlace[];
  stats: PantryStats;
};

const FRIDGE_NAME = /fridge|refrigerator|ตู้เย็น/i;

export type PantryInput = {
  locations: readonly Location[];
  products: readonly Product[];
  productGroups: readonly ProductGroup[];
  quantityUnits: readonly QuantityUnit[];
  stockEntries: readonly StockEntry[];
  today: Date;
};

const DAYS_IN_A_WEEK = 7;

const STATUS_RANK: Record<ItemStatus, number> = {
  expired: 0,
  soon: 1,
  low: 2,
  opened: 3,
  fresh: 4,
  stocked: 5,
};

const byConsumeOrder = (first: StockEntry, second: StockEntry) =>
  second.open - first.open ||
  first.best_before_date.localeCompare(second.best_before_date);

const sumAmounts = (entries: readonly StockEntry[]) =>
  entries.reduce((total, entry) => total + entry.amount, 0);

const statusFor = (
  kind: ProductKind,
  entries: readonly StockEntry[],
  runningLow: boolean,
  today: Date,
): ItemStatus => {
  if (kind === "supply") return runningLow ? "low" : "stocked";
  if (entries.length === 0) return "low";
  const statuses = entries.map((entry) =>
    foodStatus(entry.best_before_date, today),
  );
  if (statuses.includes("expired")) return "expired";
  if (statuses.includes("soon")) return "soon";
  if (entries.some((entry) => entry.open === 1)) return "opened";
  return "fresh";
};

/** Food by soonest best-before; supplies by lowest stock (DESIGN.md section 9). */
const compareItems = (first: PantryItem, second: PantryItem) => {
  if (first.kind !== second.kind) return first.kind === "food" ? -1 : 1;
  if (first.kind === "food") {
    const firstDate = first.bestBefore ?? NEVER_EXPIRES_DATE;
    const secondDate = second.bestBefore ?? NEVER_EXPIRES_DATE;
    return (
      firstDate.localeCompare(secondDate) ||
      first.name.localeCompare(second.name)
    );
  }
  const stockLevel = (item: PantryItem) =>
    item.minStock > 0 ? item.totalAmount / item.minStock : Infinity;
  return (
    stockLevel(first) - stockLevel(second) ||
    first.amount - second.amount ||
    first.name.localeCompare(second.name)
  );
};

const countItems = (items: readonly PantryItem[]): LocationCounts => ({
  itemCount: items.filter((item) => item.amount > 0).length,
  useSoon: items.filter((item) => item.status === "soon").length,
  expired: items.filter((item) => item.status === "expired").length,
  opened: items.filter((item) => item.amountOpened > 0).length,
  low: items.filter((item) => item.isRunningLow).length,
});

const summarize = (items: readonly PantryItem[]): StatSummary => {
  const names = [...new Set(items.map((item) => item.name))];
  return { count: names.length, names };
};

export const buildPantry = ({
  locations,
  products,
  productGroups,
  quantityUnits,
  stockEntries,
  today,
}: PantryInput): Pantry => {
  const groupById = new Map(productGroups.map((group) => [group.id, group]));
  const activeLocations = locations.filter((location) => location.active !== 0);
  const freezerIds = new Set(
    activeLocations
      .filter((location) => location.is_freezer === 1)
      .map((location) => location.id),
  );
  const fridge = activeLocations.find(
    (location) => location.is_freezer !== 1 && FRIDGE_NAME.test(location.name),
  );
  const unitById = new Map(quantityUnits.map((unit) => [unit.id, unit]));

  const totalByProduct = new Map<number, number>();
  for (const entry of stockEntries) {
    totalByProduct.set(
      entry.product_id,
      (totalByProduct.get(entry.product_id) ?? 0) + entry.amount,
    );
  }

  const makeItem = (
    product: Product,
    locationId: number,
    entries: StockEntry[],
  ): PantryItem => {
    const kind = classifyProduct(product, productGroups);
    const unit = unitById.get(product.qu_id_stock);
    const totalAmount = totalByProduct.get(product.id) ?? 0;
    const runningLow = isRunningLow(totalAmount, product.min_stock_amount);
    const sortedEntries = [...entries].sort(byConsumeOrder);
    const earliest = sortedEntries
      .map((entry) => entry.best_before_date)
      .filter((date) => date !== NEVER_EXPIRES_DATE)
      .sort()[0];
    const bestBefore = kind === "food" ? (earliest ?? null) : null;
    return {
      key: `${locationId}-${product.id}`,
      productId: product.id,
      locationId,
      inFreezer: freezerIds.has(locationId),
      name: product.name,
      thaiName: product.userfields?.[THAI_NAME_USERFIELD] ?? null,
      kind,
      groupName: groupById.get(product.product_group_id ?? -1)?.name ?? "",
      unitName: unit?.name ?? "",
      unitPlural: unit?.name_plural ?? unit?.name ?? "",
      amount: sumAmounts(entries),
      amountOpened: sumAmounts(entries.filter((entry) => entry.open === 1)),
      totalAmount,
      minStock: product.min_stock_amount,
      bestBefore,
      daysLeft: bestBefore === null ? null : daysUntil(bestBefore, today),
      status: statusFor(kind, entries, runningLow, today),
      isRunningLow: runningLow,
      entries: sortedEntries,
    };
  };

  const entriesByLocation = new Map<number, Map<number, StockEntry[]>>();
  const productById = new Map(products.map((product) => [product.id, product]));
  for (const entry of stockEntries) {
    const product = productById.get(entry.product_id);
    if (!product || entry.amount <= 0) continue;
    const locationId = entry.location_id ?? product.location_id;
    const productsHere =
      entriesByLocation.get(locationId) ?? new Map<number, StockEntry[]>();
    productsHere.set(product.id, [
      ...(productsHere.get(product.id) ?? []),
      entry,
    ]);
    entriesByLocation.set(locationId, productsHere);
  }

  const itemsByLocation = new Map<number, PantryItem[]>();
  for (const [locationId, productsHere] of entriesByLocation) {
    const items: PantryItem[] = [];
    for (const [productId, entries] of productsHere) {
      const product = productById.get(productId);
      if (product) items.push(makeItem(product, locationId, entries));
    }
    itemsByLocation.set(locationId, items);
  }

  // Products with nothing left still show where they belong, so "Running low" can be acted on.
  for (const product of products) {
    if (product.active === 0) continue;
    if ((totalByProduct.get(product.id) ?? 0) > 0) continue;
    if (!isRunningLow(0, product.min_stock_amount)) continue;
    const items = itemsByLocation.get(product.location_id) ?? [];
    items.push(makeItem(product, product.location_id, []));
    itemsByLocation.set(product.location_id, items);
  }

  // The freezer lives in the fridge's top compartment, so its stock shows in the fridge.
  const mergedIntoFridge = (locationId: number) =>
    fridge !== undefined && freezerIds.has(locationId);
  const pantryLocations = activeLocations
    .filter((location) => !mergedIntoFridge(location.id))
    .map((location): PantryLocation => {
      const ownItems = itemsByLocation.get(location.id) ?? [];
      const freezerItems =
        location.id === fridge?.id
          ? [...freezerIds].flatMap((freezerId) => itemsByLocation.get(freezerId) ?? [])
          : [];
      const items = [...ownItems, ...freezerItems].sort(compareItems);
      const allSupplies =
        items.length > 0 && items.every((item) => item.kind === "supply");
      return {
        id: location.id,
        name: location.name,
        isFreezer: location.is_freezer === 1,
        kind: allSupplies ? "supply" : "food",
        items,
        counts: countItems(items),
      };
    });

  const allItems = pantryLocations.flatMap((location) => location.items);
  const byUrgency = (first: PantryItem, second: PantryItem) =>
    STATUS_RANK[first.status] - STATUS_RANK[second.status] ||
    (first.daysLeft ?? Infinity) - (second.daysLeft ?? Infinity);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - (DAYS_IN_A_WEEK - 1));
  const weekStartDate = toIsoDate(weekStart);

  return {
    locations: pantryLocations,
    places: activeLocations.map((location) => ({
      id: location.id,
      name: location.name,
      isFreezer: location.is_freezer === 1,
    })),
    stats: {
      useSoon: summarize(
        allItems
          .filter((item) => item.kind === "food" && item.status === "soon")
          .sort(byUrgency),
      ),
      runningLow: summarize(
        allItems.filter((item) => item.isRunningLow).sort(byUrgency),
      ),
      inStock: {
        ...summarize(allItems.filter((item) => item.amount > 0)),
        spots: pantryLocations.length,
      },
      addedThisWeek: summarize(
        allItems.filter((item) =>
          item.entries.some(
            (entry) => (entry.purchased_date ?? "") >= weekStartDate,
          ),
        ),
      ),
    },
  };
};

/** An item in a storage piece, by its key when known (a product can sit in the fridge and its freezer). */
export const findItem = (
  pantry: Pantry,
  storageId: number,
  productId: number,
  itemKey?: string,
): PantryItem | undefined => {
  const items =
    pantry.locations.find((location) => location.id === storageId)?.items ?? [];
  return (
    items.find((item) => item.key === itemKey) ??
    items.find((item) => item.productId === productId)
  );
};
