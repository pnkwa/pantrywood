import "server-only";
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
];

const isEntityName = (name: string): name is EntityName =>
  ENTITY_NAMES.some((entity) => entity === name);

export const handleMockRequest = (method: string, path: string[]): Response => {
  if (method !== "GET") return error(501, "Mock mode is read-only for now.");

  const database = buildMockDatabase();
  const [first, second, third, fourth] = path;

  if (
    first === "objects" &&
    second &&
    isEntityName(second) &&
    path.length <= 3
  ) {
    const rows: { id: number }[] = database[second];
    if (third === undefined) return json(rows);
    const row = rows.find((candidate) => candidate.id === Number(third));
    return row ? json(row) : error(404, `No ${second} with id ${third}.`);
  }

  if (first === "stock" && path.length === 1)
    return json(currentStock(database));

  if (
    first === "stock" &&
    second === "products" &&
    third &&
    fourth === "entries" &&
    path.length === 4
  ) {
    return json(
      database.stock.filter((entry) => entry.product_id === Number(third)),
    );
  }

  return error(404, `/${path.join("/")} is not available in mock mode yet.`);
};
