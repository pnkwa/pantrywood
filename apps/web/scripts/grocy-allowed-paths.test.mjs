import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedGrocyPath } from "../src/lib/grocy/allowed-paths.ts";

test("every Grocy call Pantrywood makes goes through", () => {
  for (const [method, path] of [
    ["GET", "objects/locations"],
    ["GET", "objects/stock"],
    ["GET", "stock"],
    ["GET", "stock/products/by-barcode/8851234567890"],
    ["POST", "objects/products"],
    ["POST", "objects/product_barcodes"],
    ["POST", "stock/products/12/consume"],
    ["POST", "stock/transactions/mock-transaction-3/undo"],
    ["POST", "stock/shoppinglist/add-product"],
    ["PUT", "objects/product_barcodes/9"],
    ["PUT", "userfields/products/4"],
    ["DELETE", "objects/products/4"],
  ]) {
    assert.ok(isAllowedGrocyPath(method, path), `${method} ${path}`);
  }
});

test("the rest of the Grocy API stays closed", () => {
  for (const [method, path] of [
    ["GET", "users"],
    ["GET", "objects/api_keys"],
    ["GET", "system/config"],
    ["POST", "objects/locations"],
    ["PUT", "objects/products/1"],
    ["DELETE", "objects/locations/1"],
    ["DELETE", "objects/products/1/extra"],
    ["PATCH", "objects/products/1"],
  ]) {
    assert.ok(!isAllowedGrocyPath(method, path), `${method} ${path}`);
  }
});
