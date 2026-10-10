import "server-only";
import { buildMockDatabase, currentStock, type MockDatabase } from "./seed";

/*
 * Answers the proxy's requests from seed data when MOCK_GROCY=true.
 * Read-only for now: write requests return 501 until the actions arrive (Prompt 3).
 */

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

function error(status: number, message: string) {
  return json({ error_message: message }, status);
}

const entities = new Set<keyof MockDatabase>([
  "locations",
  "product_groups",
  "quantity_units",
  "products",
  "stock",
  "product_barcodes",
]);

function isEntity(name: string): name is keyof MockDatabase {
  return entities.has(name as keyof MockDatabase);
}

export function handleMockRequest(method: string, path: string[]): Response {
  if (method !== "GET") {
    return error(501, "Mock mode is read-only for now.");
  }

  const db = buildMockDatabase();
  const [first, second, third, fourth] = path;

  // GET /objects/{entity} and /objects/{entity}/{id}
  if (first === "objects" && second && isEntity(second) && path.length <= 3) {
    const rows: { id: number }[] = db[second];
    if (third === undefined) return json(rows);
    const row = rows.find((r) => r.id === Number(third));
    return row ? json(row) : error(404, `No ${second} with id ${third}.`);
  }

  // GET /stock
  if (first === "stock" && path.length === 1) {
    return json(currentStock(db));
  }

  // GET /stock/products/{productId}/entries
  if (first === "stock" && second === "products" && third && fourth === "entries" && path.length === 4) {
    return json(db.stock.filter((entry) => entry.product_id === Number(third)));
  }

  return error(404, `/${path.join("/")} is not available in mock mode yet.`);
}
