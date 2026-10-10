import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  CurrentStockSchema,
  LocationSchema,
  ProductBarcodeSchema,
  ProductGroupSchema,
  ProductSchema,
  QuantityUnitSchema,
  ShoppingListItemSchema,
  StockEntrySchema,
} from "@pantrywood/shared";
import { grocyFetch } from "./client";

const queryKey = <const Parts extends readonly (string | number)[]>(
  ...parts: Parts
) => parts;

export const grocyKeys = {
  all: queryKey("grocy"),
  locations: () => queryKey("grocy", "locations"),
  productGroups: () => queryKey("grocy", "product_groups"),
  quantityUnits: () => queryKey("grocy", "quantity_units"),
  products: () => queryKey("grocy", "products"),
  productBarcodes: () => queryKey("grocy", "product_barcodes"),
  stock: () => queryKey("grocy", "stock"),
  currentStock: () => queryKey("grocy", "stock", "current"),
  stockEntries: () => queryKey("grocy", "stock", "entries"),
  productStockEntries: (productId: number) =>
    queryKey("grocy", "stock", "entries", productId),
  shoppingList: () => queryKey("grocy", "shopping_list"),
};

const SETUP_STALE_TIME = 5 * 60_000;

export const useLocations = () =>
  useQuery({
    queryKey: grocyKeys.locations(),
    queryFn: () => grocyFetch("objects/locations", z.array(LocationSchema)),
    staleTime: SETUP_STALE_TIME,
  });

export const useProductGroups = () =>
  useQuery({
    queryKey: grocyKeys.productGroups(),
    queryFn: () =>
      grocyFetch("objects/product_groups", z.array(ProductGroupSchema)),
    staleTime: SETUP_STALE_TIME,
  });

export const useQuantityUnits = () =>
  useQuery({
    queryKey: grocyKeys.quantityUnits(),
    queryFn: () =>
      grocyFetch("objects/quantity_units", z.array(QuantityUnitSchema)),
    staleTime: SETUP_STALE_TIME,
  });

export const useProducts = () =>
  useQuery({
    queryKey: grocyKeys.products(),
    queryFn: () => grocyFetch("objects/products", z.array(ProductSchema)),
    staleTime: SETUP_STALE_TIME,
  });

export const useProductBarcodes = () =>
  useQuery({
    queryKey: grocyKeys.productBarcodes(),
    queryFn: () =>
      grocyFetch("objects/product_barcodes", z.array(ProductBarcodeSchema)),
    staleTime: SETUP_STALE_TIME,
  });

export const useCurrentStock = () =>
  useQuery({
    queryKey: grocyKeys.currentStock(),
    queryFn: () => grocyFetch("stock", z.array(CurrentStockSchema)),
  });

export const useStockEntries = () =>
  useQuery({
    queryKey: grocyKeys.stockEntries(),
    queryFn: () => grocyFetch("objects/stock", z.array(StockEntrySchema)),
  });

export const useProductStockEntries = (productId: number) =>
  useQuery({
    queryKey: grocyKeys.productStockEntries(productId),
    queryFn: () =>
      grocyFetch(
        `stock/products/${productId}/entries`,
        z.array(StockEntrySchema),
      ),
  });

export const useShoppingList = () =>
  useQuery({
    queryKey: grocyKeys.shoppingList(),
    queryFn: () =>
      grocyFetch("objects/shopping_list", z.array(ShoppingListItemSchema)),
  });
