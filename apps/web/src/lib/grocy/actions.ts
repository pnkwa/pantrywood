import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { StockLogEntrySchema, THAI_NAME_USERFIELD } from "@pantrywood/shared";
import { grocyDelete, grocyPost, grocyPostFor, grocyPut } from "./client";
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

const postStockAction = async (
  path: string,
  body: Parameters<typeof grocyPostFor>[1],
): Promise<string | null> => {
  const log = await grocyPostFor(path, body, StockLogSchema);
  return log[0]?.transaction_id ?? null;
};

const runStockAction = async (action: StockAction): Promise<string | null> => {
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
      return null;
    case "addToShoppingList":
      await grocyPost("stock/shoppinglist/add-product", {
        product_id: action.productId,
        product_amount: action.amount,
        list_id: SHOPPING_LIST_ID,
      });
      return null;
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
      return null;
  }
};

const useRefreshGrocy = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: grocyKeys.all });
};

/** Every action refreshes Grocy data afterwards so the room, panels and stats stay in sync. */
export const useStockAction = () => {
  const refresh = useRefreshGrocy();
  return useMutation({ mutationFn: runStockAction, onSettled: refresh });
};

const CreatedSchema = z.object({ created_object_id: z.coerce.number().int() });

export type NewProduct = {
  name: string;
  thaiName: string;
  productGroupId: number | null;
  locationId: number;
  quantityUnitId: number;
  bestBeforeDays: number;
  minStock: number;
  barcode: string;
};

const createProduct = async (product: NewProduct) => {
  const { created_object_id: productId } = await grocyPostFor(
    "objects/products",
    {
      name: product.name,
      product_group_id: product.productGroupId,
      location_id: product.locationId,
      qu_id_purchase: product.quantityUnitId,
      qu_id_stock: product.quantityUnitId,
      qu_id_consume: product.quantityUnitId,
      qu_id_price: product.quantityUnitId,
      default_best_before_days: product.bestBeforeDays,
      min_stock_amount: product.minStock,
    },
    CreatedSchema,
  );
  try {
    await grocyPost("objects/product_barcodes", {
      product_id: productId,
      barcode: product.barcode,
      amount: 1,
    });
  } catch (error) {
    await grocyDelete(`objects/products/${productId}`).catch(() => undefined);
    throw error;
  }
  if (product.thaiName) {
    await grocyPut(`userfields/products/${productId}`, {
      [THAI_NAME_USERFIELD]: product.thaiName,
    });
  }
  return productId;
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
