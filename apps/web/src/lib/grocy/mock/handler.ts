import "server-only";
import { z } from "zod";
import {
  LocationSchema,
  NEVER_EXPIRES_DATE,
  ProductBarcodeSchema,
  ProductSchema,
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
  "shopping_locations",
];

const isEntityName = (name: string): name is EntityName =>
  ENTITY_NAMES.some((entity) => entity === name);

const JsonBodySchema = z.json();
type JsonBody = z.infer<typeof JsonBodySchema> | undefined;

let database: MockDatabase | undefined;
const getDatabase = () => (database ??= buildMockDatabase());

// Stock as it was before each action, so the action can be undone.
const stockBeforeTransaction = new Map<string, StockEntry[]>();
let nextTransactionNumber = 1;

const ActionAmountSchema = z.object({
  amount: z.coerce.number().optional(),
  new_amount: z.coerce.number().optional(),
});

const ObjectBodySchema = z.record(z.string(), z.json());

const InventoryBodySchema = z.object({
  new_amount: z.coerce.number().min(0),
  best_before_date: z.string().optional(),
  location_id: z.coerce.number().int().optional(),
  price: z.coerce.number().optional(),
});

const UserfieldsBodySchema = z.record(z.string(), z.string().nullable());

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
  shopping_location_id: z.coerce.number().int().optional(),
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
    shopping_location_id: parsed.data.shopping_location_id ?? null,
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

const handleInventory = (product: Product, body: JsonBody) => {
  const parsed = InventoryBodySchema.safeParse(body);
  if (!parsed.success) return error(400, z.prettifyError(parsed.error));
  const current = getDatabase();
  const entries = current.stock.filter(
    (entry) => entry.product_id === product.id,
  );
  const difference = parsed.data.new_amount - totalAmount(entries);
  if (difference > 0) {
    const { best_before_date, location_id, price } = parsed.data;
    return handleAdd(product, {
      amount: difference,
      ...(best_before_date !== undefined && { best_before_date }),
      ...(location_id !== undefined && { location_id }),
      ...(price !== undefined && { price }),
    });
  }
  if (difference < 0) takeFromEntries(current, entries, -difference, () => {});
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
  inventory: handleInventory,
};

const runAsTransaction = (
  product: Product,
  body: JsonBody,
  action: (product: Product, body: JsonBody) => Response,
) => {
  const current = getDatabase();
  const before = current.stock.map((entry) => ({ ...entry }));
  const response = action(product, body);
  if (!response.ok) return response;
  const transactionId = `mock-transaction-${nextTransactionNumber++}`;
  stockBeforeTransaction.set(transactionId, before);
  const firstEntry = before.filter((entry) => entry.product_id === product.id).sort(byConsumeOrder)[0];
  const amounts = ActionAmountSchema.safeParse(body);
  const amount = amounts.success
    ? (amounts.data.amount ?? amounts.data.new_amount ?? 0)
    : 0;
  return json([
    {
      id: nextTransactionNumber,
      product_id: product.id,
      amount,
      transaction_id: transactionId,
      best_before_date: firstEntry?.best_before_date ?? null,
    },
  ]);
};

const handleUndo = (transactionId: string) => {
  const before = stockBeforeTransaction.get(transactionId);
  if (!before) return error(400, "This transaction can't be undone");
  getDatabase().stock = before;
  stockBeforeTransaction.delete(transactionId);
  return new Response(null, { status: 204 });
};

const productDetails = (current: MockDatabase, product: Product) => {
  const entries = current.stock.filter(
    (entry) => entry.product_id === product.id,
  );
  const latest = [...entries].sort((first, second) => second.id - first.id)[0];
  return {
    product,
    product_barcodes: current.product_barcodes.filter(
      (barcode) => barcode.product_id === product.id,
    ),
    stock_amount: totalAmount(entries),
    stock_amount_opened: totalAmount(
      entries.filter((entry) => entry.open === 1),
    ),
    next_due_date:
      entries.map((entry) => entry.best_before_date).sort()[0] ?? null,
    last_price: latest?.price ?? null,
    last_shopping_location_id: latest?.shopping_location_id ?? null,
    default_shopping_location_id: product.shopping_location_id ?? null,
  };
};

const nextId = (rows: readonly { id: number }[]) =>
  Math.max(0, ...rows.map((row) => row.id)) + 1;

const PRODUCT_DEFAULTS = {
  active: 1,
  description: null,
  product_group_id: null,
  shopping_location_id: null,
  min_stock_amount: 0,
  default_best_before_days: 0,
  default_best_before_days_after_open: 0,
  picture_file_name: null,
  parent_product_id: null,
  due_type: 1,
  quick_consume_amount: 1,
  quick_open_amount: 1,
  hide_on_stock_overview: 0,
  should_not_be_frozen: 0,
  userfields: null,
};

const handleCreateObject = (entity: string, body: JsonBody) => {
  const fields = ObjectBodySchema.safeParse(body);
  if (!fields.success) return error(400, "Body must be an object");
  const current = getDatabase();
  if (entity === "locations") {
    const parsed = LocationSchema.safeParse({
      is_freezer: 0,
      ...fields.data,
      id: nextId(current.locations),
      row_created_timestamp: new Date().toISOString(),
    });
    if (!parsed.success) return error(400, z.prettifyError(parsed.error));
    current.locations.push(parsed.data);
    return json({ created_object_id: parsed.data.id });
  }
  if (entity === "products") {
    const parsed = ProductSchema.safeParse({
      ...PRODUCT_DEFAULTS,
      ...fields.data,
      id: nextId(current.products),
      row_created_timestamp: new Date().toISOString(),
    });
    if (!parsed.success) return error(400, z.prettifyError(parsed.error));
    current.products.push(parsed.data);
    return json({ created_object_id: parsed.data.id });
  }
  if (entity === "product_barcodes") {
    const parsed = ProductBarcodeSchema.safeParse({
      amount: 1,
      ...fields.data,
      id: nextId(current.product_barcodes),
    });
    if (!parsed.success) return error(400, z.prettifyError(parsed.error));
    if (
      current.product_barcodes.some(
        (row) => row.barcode === parsed.data.barcode,
      )
    ) {
      return error(400, "This barcode is already linked to a product");
    }
    current.product_barcodes.push(parsed.data);
    return json({ created_object_id: parsed.data.id });
  }
  return error(404, `Creating ${entity} is not available in mock mode yet.`);
};

const handleDeleteObject = (entity: string, id: number) => {
  const current = getDatabase();
  if (entity !== "products") {
    return error(404, `Deleting ${entity} is not available in mock mode yet.`);
  }
  current.products = current.products.filter((product) => product.id !== id);
  return new Response(null, { status: 204 });
};

const handleUpdateObject = (entity: string, id: number, body: JsonBody) => {
  const fields = ObjectBodySchema.safeParse(body);
  if (!fields.success) return error(400, "Body must be an object");
  const current = getDatabase();
  if (entity === "products") {
    const index = current.products.findIndex((row) => row.id === id);
    const parsed = ProductSchema.safeParse({ ...current.products[index], ...fields.data, id });
    if (index === -1 || !parsed.success) return error(400, "Object does not exist");
    current.products[index] = parsed.data;
    return new Response(null, { status: 204 });
  }
  if (entity !== "product_barcodes") {
    return error(404, `Editing ${entity} is not available in mock mode yet.`);
  }
  const index = current.product_barcodes.findIndex((row) => row.id === id);
  const parsed = ProductBarcodeSchema.safeParse({
    ...current.product_barcodes[index],
    ...fields.data,
    id,
  });
  if (index === -1 || !parsed.success)
    return error(400, "Object does not exist");
  current.product_barcodes[index] = parsed.data;
  return new Response(null, { status: 204 });
};

const handleSetUserfields = (entity: string, id: number, body: JsonBody) => {
  const parsed = UserfieldsBodySchema.safeParse(body);
  if (!parsed.success) return error(400, z.prettifyError(parsed.error));
  const product = getDatabase().products.find(
    (candidate) => candidate.id === id,
  );
  if (entity !== "products" || !product)
    return error(400, "Object does not exist");
  product.userfields = { ...product.userfields, ...parsed.data };
  return new Response(null, { status: 204 });
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
    third === "by-barcode" &&
    fourth &&
    path.length === 4
  ) {
    const barcode = current.product_barcodes.find(
      (row) => row.barcode === fourth,
    );
    const product = current.products.find(
      (candidate) => candidate.id === barcode?.product_id,
    );
    if (!product) return error(400, `No product with barcode ${fourth} found`);
    return json(productDetails(current, product));
  }

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
    if (isProductAction(fourth)) {
      return runAsTransaction(product, body, PRODUCT_ACTIONS[fourth]);
    }
  }

  if (
    first === "stock" &&
    second === "transactions" &&
    third &&
    fourth === "undo" &&
    path.length === 4
  ) {
    return handleUndo(third);
  }

  if (first === "objects" && second && path.length === 2) {
    return handleCreateObject(second, body);
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

// Uploaded product pictures, by Grocy's base64 file name.
const productPictures = new Map<string, Blob>();

export const handleMockRequest = async (
  request: Request,
  path: string[],
): Promise<Response> => {
  if (path[0] === "files" && path[1] === "productpictures" && path[2]) {
    if (request.method === "PUT") {
      productPictures.set(path[2], new Blob([await request.arrayBuffer()], { type: "image/png" }));
      return new Response(null, { status: 204 });
    }
    const picture = productPictures.get(path[2]);
    return picture
      ? new Response(picture, { headers: { "content-type": picture.type, "cache-control": "no-store" } })
      : error(404, "No such picture");
  }
  if (request.method === "GET") return handleGet(path);
  if (request.method === "POST")
    return handlePost(path, await readBody(request));
  const [first, second, third] = path;
  if (request.method === "PUT" && first === "userfields" && second && third) {
    return handleSetUserfields(second, Number(third), await readBody(request));
  }
  if (request.method === "DELETE" && first === "objects" && second && third) {
    return handleDeleteObject(second, Number(third));
  }
  if (request.method === "PUT" && first === "objects" && second && third) {
    return handleUpdateObject(second, Number(third), await readBody(request));
  }
  return error(501, `${request.method} is not available in mock mode yet.`);
};
