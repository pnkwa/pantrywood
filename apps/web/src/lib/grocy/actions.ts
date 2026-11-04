import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { LocationSchema, StockLogEntrySchema, THAI_NAME_USERFIELD } from "@pantrywood/shared";
import { grocyDelete, grocyFetch, grocyPost, grocyPostFor, grocyPut } from "./client";
import { isPutAwayName, PUT_AWAY_NAME } from "@/lib/pantry/put-away";
import { useBoardStore } from "@/lib/board/board-store";
import { grocyKeys } from "./queries";

const SHOPPING_LIST_ID = 1;

export type StockAction =
  | { type: "consume"; productId: number; amount: number; locationId?: number }
  | { type: "open"; productId: number; amount: number; stockEntryId?: string }
  | {
      type: "add";
      productId: number;
      amount: number;
      locationId: number;
      bestBeforeDate?: string;
      price?: number;
      shoppingLocationId?: number;
    }
  | {
      type: "transfer";
      productId: number;
      amount: number;
      fromLocationId: number;
      toLocationId: number;
    }
  | {
      type: "inventory";
      productId: number;
      newAmount: number;
      locationId?: number;
      bestBeforeDate?: string;
    }
  | { type: "undo"; transactionId: string }
  | { type: "addToShoppingList"; productId: number; amount: number }
  | {
      type: "addItemsToShoppingList";
      items: { productId: number; amount: number }[];
    };

const StockLogSchema = z.array(StockLogEntrySchema);

/** What Grocy logged: the transaction (for Undo) and the best-before date of the stock it touched. */
export type StockResult = { transactionId: string | null; bestBeforeDate: string | null };

const NOTHING_LOGGED: StockResult = { transactionId: null, bestBeforeDate: null };

const postStockAction = async (path: string, body: Parameters<typeof grocyPostFor>[1]): Promise<StockResult> => {
  const [entry] = await grocyPostFor(path, body, StockLogSchema);
  return entry ? { transactionId: entry.transaction_id, bestBeforeDate: entry.best_before_date ?? null } : NOTHING_LOGGED;
};

const runStockAction = async (action: StockAction): Promise<StockResult> => {
  switch (action.type) {
    case "consume":
      return postStockAction(`stock/products/${action.productId}/consume`, {
        amount: action.amount,
        transaction_type: "consume",
        spoiled: false,
        location_id: action.locationId,
      });
    case "open":
      return postStockAction(`stock/products/${action.productId}/open`, {
        amount: action.amount,
        stock_entry_id: action.stockEntryId,
      });
    case "add":
      return postStockAction(`stock/products/${action.productId}/add`, {
        amount: action.amount,
        transaction_type: "purchase",
        location_id: action.locationId,
        best_before_date: action.bestBeforeDate,
        price: action.price,
        shopping_location_id: action.shoppingLocationId,
      });
    case "transfer":
      return postStockAction(`stock/products/${action.productId}/transfer`, {
        amount: action.amount,
        location_id_from: action.fromLocationId,
        location_id_to: action.toLocationId,
      });
    case "inventory":
      return postStockAction(`stock/products/${action.productId}/inventory`, {
        new_amount: action.newAmount,
        location_id: action.locationId,
        best_before_date: action.bestBeforeDate,
      });
    case "undo":
      await grocyPost(`stock/transactions/${action.transactionId}/undo`, {});
      return NOTHING_LOGGED;
    case "addToShoppingList":
      await grocyPost("stock/shoppinglist/add-product", {
        product_id: action.productId,
        product_amount: action.amount,
        list_id: SHOPPING_LIST_ID,
      });
      return NOTHING_LOGGED;
    case "addItemsToShoppingList":
      await Promise.all(
        action.items.map((item) =>
          grocyPost("stock/shoppinglist/add-product", {
            product_id: item.productId,
            product_amount: item.amount,
            list_id: SHOPPING_LIST_ID,
          }),
        ),
      );
      return NOTHING_LOGGED;
  }
};

const useRefreshGrocy = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: grocyKeys.all });
};

/** Resolves to the transaction id, for Undo. */
export const useStockAction = () => {
  const refresh = useRefreshGrocy();
  return useMutation({
    mutationFn: async (action: StockAction) => {
      const result = await runStockAction(action);
      // shortcut: undoing a restock doesn't untick the notes it ticked; track it per transaction if that matters.
      if (action.type === "add") useBoardStore.getState().restocked(action.productId);
      return result.transactionId;
    },
    onSettled: refresh,
  });
};

const CreatedSchema = z.object({ created_object_id: z.coerce.number().int() });

export type NewProduct = {
  name: string;
  thaiName: string;
  productGroupId: number | null;
  /** null: it waits in "To put away" until it's placed. */
  locationId: number | null;
  quantityUnitId: number;
  bestBeforeDays: number;
  minStock: number;
  /** Empty when the product comes from a receipt line rather than a scan. */
  barcode: string;
};

/** The "To put away" location's id, creating it the first time. */
const putAwayLocationId = async () => {
  const locations = await grocyFetch("objects/locations", z.array(LocationSchema));
  const existing = locations.find((location) => location.active !== 0 && isPutAwayName(location.name));
  if (existing) return existing.id;
  const { created_object_id: locationId } = await grocyPostFor(
    "objects/locations",
    { name: PUT_AWAY_NAME, description: "New stock waits here until it's put away (Pantrywood)", is_freezer: 0 },
    CreatedSchema,
  );
  return locationId;
};

const createProduct = async (product: NewProduct) => {
  const { created_object_id: productId } = await grocyPostFor(
    "objects/products",
    {
      name: product.name,
      product_group_id: product.productGroupId,
      location_id: product.locationId ?? (await putAwayLocationId()),
      qu_id_purchase: product.quantityUnitId,
      qu_id_stock: product.quantityUnitId,
      qu_id_consume: product.quantityUnitId,
      qu_id_price: product.quantityUnitId,
      default_best_before_days: product.bestBeforeDays,
      min_stock_amount: product.minStock,
    },
    CreatedSchema,
  );
  if (product.barcode) {
    try {
      await grocyPost("objects/product_barcodes", {
        product_id: productId,
        barcode: product.barcode,
        amount: 1,
      });
    } catch (error) {
      // A product without its barcode invites a duplicate on the next try, so undo it.
      await grocyDelete(`objects/products/${productId}`).catch(() => undefined);
      throw error;
    }
  }
  if (product.thaiName) {
    await grocyPut(`userfields/products/${productId}`, {
      [THAI_NAME_USERFIELD]: product.thaiName,
    });
  }
  return productId;
};

/** A new storage spot from Decorate. Resolves to the new location id once the room has refetched. */
export const useCreateLocation = () => {
  const refresh = useRefreshGrocy();
  return useMutation({
    mutationFn: async (name: string) => {
      const { created_object_id: locationId } = await grocyPostFor(
        "objects/locations",
        { name, description: "Added in Pantrywood", is_freezer: 0 },
        CreatedSchema,
      );
      return locationId;
    },
    onSettled: refresh,
  });
};

export const useCreateProduct = () => {
  const refresh = useRefreshGrocy();
  return useMutation({ mutationFn: createProduct, onSettled: refresh });
};

type BarcodeLink = {
  productId: number;
  barcode: string;
  replaceBarcodeId?: number;
};

const linkBarcode = async ({
  productId,
  barcode,
  replaceBarcodeId,
}: BarcodeLink) => {
  if (replaceBarcodeId !== undefined) {
    await grocyPut(`objects/product_barcodes/${replaceBarcodeId}`, {
      product_id: productId,
    });
    return;
  }
  await grocyPost("objects/product_barcodes", {
    product_id: productId,
    barcode,
    amount: 1,
  });
};

export const useLinkBarcode = () => {
  const refresh = useRefreshGrocy();
  return useMutation({ mutationFn: linkBarcode, onSettled: refresh });
};

export const useLinkLabelBarcodes = () => {
  const refresh = useRefreshGrocy();
  return useMutation({
    mutationFn: async (links: { productId: number; barcode: string }[]) => {
      for (const link of links) {
        await linkBarcode(link);
      }
    },
    onSettled: refresh,
  });
};
