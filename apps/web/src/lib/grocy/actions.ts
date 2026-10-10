import { useMutation, useQueryClient } from "@tanstack/react-query";
import { grocyPost } from "./client";
import { grocyKeys } from "./queries";

const SHOPPING_LIST_ID = 1;

export type StockAction =
  | { type: "consume"; productId: number; amount: number; locationId: number }
  | { type: "open"; productId: number; amount: number; stockEntryId?: string }
  | { type: "add"; productId: number; amount: number; locationId: number }
  | {
      type: "transfer";
      productId: number;
      amount: number;
      fromLocationId: number;
      toLocationId: number;
    }
  | { type: "addToShoppingList"; productId: number; amount: number }
  | {
      type: "addItemsToShoppingList";
      items: { productId: number; amount: number }[];
    };

const runStockAction = (action: StockAction) => {
  switch (action.type) {
    case "consume":
      return grocyPost(`stock/products/${action.productId}/consume`, {
        amount: action.amount,
        transaction_type: "consume",
        spoiled: false,
        location_id: action.locationId,
      });
    case "open":
      return grocyPost(`stock/products/${action.productId}/open`, {
        amount: action.amount,
        stock_entry_id: action.stockEntryId,
      });
    case "add":
      return grocyPost(`stock/products/${action.productId}/add`, {
        amount: action.amount,
        transaction_type: "purchase",
        location_id: action.locationId,
      });
    case "transfer":
      return grocyPost(`stock/products/${action.productId}/transfer`, {
        amount: action.amount,
        location_id_from: action.fromLocationId,
        location_id_to: action.toLocationId,
      });
    case "addToShoppingList":
      return grocyPost("stock/shoppinglist/add-product", {
        product_id: action.productId,
        product_amount: action.amount,
        list_id: SHOPPING_LIST_ID,
      });
    case "addItemsToShoppingList":
      return Promise.all(
        action.items.map((item) =>
          grocyPost("stock/shoppinglist/add-product", {
            product_id: item.productId,
            product_amount: item.amount,
            list_id: SHOPPING_LIST_ID,
          }),
        ),
      ).then(() => undefined);
  }
};

/** Every action refreshes stock afterwards so the room, panels and stats stay in sync. */
export const useStockAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runStockAction,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: grocyKeys.stock() }),
        queryClient.invalidateQueries({ queryKey: grocyKeys.shoppingList() }),
      ]),
  });
};
