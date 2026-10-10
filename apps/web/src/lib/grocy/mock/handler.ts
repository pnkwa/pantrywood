import "server-only";
import { z } from "zod";
import {
  NEVER_EXPIRES_DATE,
  toIsoDate,
  type Product,
  type StockEntry,
} from "@pantrywood/shared";
import { buildMockDatabase, currentStock, type MockDatabase } from "./seed";

const json = <T>(data: T, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });

const error = (status: number, message: string) =>
  json({ error_message: message }, status);

type EntityName = keyof MockDatabase;

const ENTITY_NAMES: readonly EntityName[] = [
  "locations",
  "product_groups",
  "quantity_units",
  "products",
  "stock",
  "product_barcodes",
  "shopping_list",
];

const isEntityName = (name: string): name is EntityName =>
  ENTITY_NAMES.some((entity) => entity === name);

const JsonBodySchema = z.json();
type JsonBody = z.infer<typeof JsonBodySchema> | undefined;

let database: MockDatabase | undefined;
const getDatabase = () => (database ??= buildMockDatabase());

const ConsumeBodySchema = z.object({
  amount: z.coerce.number().positive(),
  location_id: z.coerce.number().int().optional(),
  stock_entry_id: z.string().optional(),
});

const OpenBodySchema = z.object({
  amount: z.coerce.number().positive(),
  stock_entry_id: z.string().optional(),
});

const AddBodySchema = z.object({
  amount: z.coerce.number().positive(),
  best_before_date: z.string().optional(),
  location_id: z.coerce.number().int().optional(),
  price: z.coerce.number().optional(),
});

const TransferBodySchema = z.object({
  amount: z.coerce.number().positive(),
  location_id_from: z.coerce.number().int(),
  location_id_to: z.coerce.number().int(),
  stock_entry_id: z.string().optional(),
});

const ShoppingListAddBodySchema = z.object({
  product_id: z.coerce.number().int(),
  product_amount: z.coerce.number().positive().default(1),
  list_id: z.coerce.number().int().default(1),
  note: z.string().optional(),
});

const ShoppingListMissingBodySchema = z.object({
  list_id: z.coerce.number().int().default(1),
});

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

/** Grocy's default consume order: opened first, then soonest best-before. */
const byConsumeOrder = (first: StockEntry, second: StockEntry) =>
  second.open - first.open ||
  first.best_before_date.localeCompare(second.best_before_date) ||
  first.id - second.id;

const nextStockId = (current: MockDatabase) =>
  Math.max(0, ...current.stock.map((entry) => entry.id)) + 1;

const totalAmount = (entries: readonly StockEntry[]) =>
  entries.reduce((total, entry) => total + entry.amount, 0);

/** Takes `amount` from the entries in order, splitting the last one if needed. */
const takeFromEntries = (
  current: MockDatabase,
  entries: readonly StockEntry[],
  amount: number,
  onTaken: (entry: StockEntry, taken: number) => void,
) => {
  let remaining = amount;
  for (const entry of [...entries].sort(byConsumeOrder)) {
    if (remaining <= 0) break;
    const taken = Math.min(entry.amount, remaining);
    remaining -= taken;
    entry.amount -= taken;
    onTaken(entry, taken);
  }
  current.stock = current.stock.filter((entry) => entry.amount > 0);
};

const handleConsume = (product: Product, body: JsonBody) => {
  const parsed = ConsumeBodySchema.safeParse(body);
  if (!parsed.success) return error(400, z.prettifyError(parsed.error));
  const current = getDatabase();
  const entries = current.stock.filter(
    (entry) =>
      entry.product_id === product.id &&
      (parsed.data.location_id === undefined ||
        entry.location_id === parsed.data.location_id) &&
      (parsed.data.stock_entry_id === undefined ||
        entry.stock_id === parsed.data.stock_entry_id),
  );
  if (totalAmount(entries) < parsed.data.amount) {
    return error(400, "Amount to be consumed cannot be > current stock amount");
  }
  takeFromEntries(current, entries, parsed.data.amount, () => {});
  return json([]);
};

const handleOpen = (product: Product, body: JsonBody) => {
  const parsed = OpenBodySchema.safeParse(body);
  if (!parsed.success) return error(400, z.prettifyError(parsed.error));
  const current = getDatabase();
  const closedEntries = current.stock.filter(
    (entry) =>
      entry.product_id === product.id &&
      entry.open === 0 &&
      (parsed.data.stock_entry_id === undefined ||
        entry.stock_id === parsed.data.stock_entry_id),
  );
  if (totalAmount(closedEntries) < parsed.data.amount) {
    return error(
      400,
      "Amount to be opened cannot be > current unopened stock amount",
    );
  }
  const openedEntries: StockEntry[] = [];
  takeFromEntries(
    current,
    closedEntries,
    parsed.data.amount,
    (entry, taken) => {
      const daysAfterOpen = product.default_best_before_days_after_open;
      const openedBestBefore =
        daysAfterOpen > 0 && entry.best_before_date !== NEVER_EXPIRES_DATE
          ? [entry.best_before_date, addDays(daysAfterOpen)].sort()[0]
          : entry.best_before_date;
      openedEntries.push({
        ...entry,
        id: nextStockId(current) + openedEntries.length,
        amount: taken,
        open: 1,
        opened_date: toIsoDate(new Date()),
        best_before_date: openedBestBefore ?? entry.best_before_date,
      });
    },
  );
  current.stock.push(...openedEntries);
  return json([]);
};

const handleAdd = (product: Product, body: JsonBody) => {
  const parsed = AddBodySchema.safeParse(body);
  if (!parsed.success) return error(400, z.prettifyError(parsed.error));
  const current = getDatabase();
  const id = nextStockId(current);
  const bestBefore =
    parsed.data.best_before_date ??
    (product.default_best_before_days === -1
      ? NEVER_EXPIRES_DATE
      : addDays(product.default_best_before_days));
  current.stock.push({
    id,
    product_id: product.id,
    amount: parsed.data.amount,
    best_before_date: bestBefore,
    purchased_date: toIsoDate(new Date()),
    stock_id: `mock-added-${id}`,
    price: parsed.data.price ?? null,
    open: 0,
    opened_date: null,
    location_id: parsed.data.location_id ?? product.location_id,
    shopping_location_id: null,
    note: null,
    row_created_timestamp: new Date().toISOString(),
  });
  return json([]);
};

const handleTransfer = (product: Product, body: JsonBody) => {
  const parsed = TransferBodySchema.safeParse(body);
  if (!parsed.success) return error(400, z.prettifyError(parsed.error));
  const current = getDatabase();
  const { amount, location_id_from, location_id_to, stock_entry_id } =
    parsed.data;
  if (!current.locations.some((location) => location.id === location_id_to)) {
    return error(400, "Destination location does not exist");
  }
  const entries = current.stock.filter(
    (entry) =>
      entry.product_id === product.id &&
      entry.location_id === location_id_from &&
      (stock_entry_id === undefined || entry.stock_id === stock_entry_id),
  );
  if (totalAmount(entries) < amount) {
    return error(
      400,
      "Amount to be transfered cannot be > current stock amount",
    );
  }
  const movedEntries: StockEntry[] = [];
  takeFromEntries(current, entries, amount, (entry, taken) => {
    movedEntries.push({
      ...entry,
      id: nextStockId(current) + movedEntries.length,
      amount: taken,
      location_id: location_id_to,
    });
  });
  current.stock.push(...movedEntries);
  return json([]);
};

const addToShoppingList = (
  productId: number,
  amount: number,
  listId: number,
  note?: string,
) => {
  const current = getDatabase();
  const existing = current.shopping_list.find(
    (item) =>
      item.product_id === productId &&
      item.shopping_list_id === listId &&
      item.done !== 1,
  );
  if (existing) {
    existing.amount += amount;
    return;
  }
  current.shopping_list.push({
    id: Math.max(0, ...current.shopping_list.map((item) => item.id)) + 1,
    product_id: productId,
    amount,
    shopping_list_id: listId,
    note: note ?? null,
    done: 0,
    row_created_timestamp: new Date().toISOString(),
  });
};

const handleShoppingListAdd = (body: JsonBody) => {
  const parsed = ShoppingListAddBodySchema.safeParse(body);
  if (!parsed.success) return error(400, z.prettifyError(parsed.error));
  if (
    !getDatabase().products.some(
      (product) => product.id === parsed.data.product_id,
    )
  ) {
    return error(400, "Product does not exist");
  }
  addToShoppingList(
    parsed.data.product_id,
    parsed.data.product_amount,
    parsed.data.list_id,
    parsed.data.note,
  );
  return new Response(null, { status: 204 });
};

const handleShoppingListMissing = (body: JsonBody) => {
  const parsed = ShoppingListMissingBodySchema.safeParse(body ?? {});
  if (!parsed.success) return error(400, z.prettifyError(parsed.error));
  const current = getDatabase();
  for (const product of current.products) {
    const inStock = totalAmount(
      current.stock.filter((entry) => entry.product_id === product.id),
    );
    const missing = product.min_stock_amount - inStock;
    const alreadyListed = current.shopping_list.some(
      (item) =>
        item.product_id === product.id &&
        item.shopping_list_id === parsed.data.list_id &&
        item.done !== 1,
    );
    if (product.active === 1 && missing > 0 && !alreadyListed) {
      addToShoppingList(product.id, missing, parsed.data.list_id);
    }
  }
  return new Response(null, { status: 204 });
};

const PRODUCT_ACTIONS = {
  consume: handleConsume,
  open: handleOpen,
  add: handleAdd,
  transfer: handleTransfer,
};

const isProductAction = (name: string): name is keyof typeof PRODUCT_ACTIONS =>
  Object.keys(PRODUCT_ACTIONS).includes(name);

const handleGet = (path: string[]) => {
  const current = getDatabase();
  const [first, second, third, fourth] = path;

  if (
    first === "objects" &&
    second &&
    isEntityName(second) &&
    path.length <= 3
  ) {
    const rows: { id: number }[] = current[second];
    if (third === undefined) return json(rows);
    const row = rows.find((candidate) => candidate.id === Number(third));
    return row ? json(row) : error(404, `No ${second} with id ${third}.`);
  }

  if (first === "stock" && path.length === 1)
    return json(currentStock(current));

  if (
    first === "stock" &&
    second === "products" &&
    third &&
    fourth === "entries" &&
    path.length === 4
  ) {
    return json(
      current.stock.filter((entry) => entry.product_id === Number(third)),
    );
  }

  return error(404, `/${path.join("/")} is not available in mock mode yet.`);
};

const handlePost = (path: string[], body: JsonBody) => {
  const [first, second, third, fourth] = path;

  if (
    first === "stock" &&
    second === "products" &&
    third &&
    fourth &&
    path.length === 4
  ) {
    const product = getDatabase().products.find(
      (candidate) => candidate.id === Number(third),
    );
    if (!product) return error(400, "Product does not exist or is inactive");
    if (isProductAction(fourth)) return PRODUCT_ACTIONS[fourth](product, body);
  }

  if (first === "stock" && second === "shoppinglist" && path.length === 3) {
    if (third === "add-product") return handleShoppingListAdd(body);
    if (third === "add-missing-products")
      return handleShoppingListMissing(body);
  }

  return error(
    404,
    `POST /${path.join("/")} is not available in mock mode yet.`,
  );
};

const readBody = async (request: Request): Promise<JsonBody> => {
  const text = await request.text();
  if (!text) return undefined;
  try {
    return JsonBodySchema.parse(JSON.parse(text));
  } catch {
    return null;
  }
};

export const handleMockRequest = async (
  request: Request,
  path: string[],
): Promise<Response> => {
  if (request.method === "GET") return handleGet(path);
  if (request.method === "POST")
    return handlePost(path, await readBody(request));
  return error(501, `${request.method} is not available in mock mode yet.`);
};
