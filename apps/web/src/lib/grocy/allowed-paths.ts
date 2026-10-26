// No "@/" imports: scripts/grocy-allowed-paths.test.mjs runs this file directly with Node.

// Only what Pantrywood calls, so the proxy never hands the browser the rest of the Grocy API.
const ALLOWED_PATHS: Record<string, RegExp> = {
  GET: /^(objects\/(locations|product_groups|quantity_units|products|product_barcodes|stock|shopping_locations)|stock|stock\/products\/by-barcode\/[^/]+|files\/productpictures\/[^/]+)$/,
  POST: /^(objects\/(products|product_barcodes)|stock\/products\/\d+\/(add|consume|open|transfer|inventory)|stock\/transactions\/[^/]+\/undo|stock\/shoppinglist\/add-product)$/,
  PUT: /^(objects\/(products|product_barcodes)\/\d+|userfields\/products\/\d+|files\/productpictures\/[^/]+)$/,
  DELETE: /^objects\/products\/\d+$/,
};

export const isAllowedGrocyPath = (method: string, path: string) => ALLOWED_PATHS[method]?.test(path) ?? false;
