import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  CurrentStockSchema,
  LocationSchema,
  ProductBarcodeSchema,
  ProductGroupSchema,
  ProductSchema,
  QuantityUnitSchema,
  StockEntrySchema,
} from "@pantrywood/shared";
import { grocyFetch } from "./client";

export const grocyKeys = {
  all: ["grocy"] as const,
  locations: () => [...grocyKeys.all, "locations"] as const,
  productGroups: () => [...grocyKeys.all, "product_groups"] as const,
  quantityUnits: () => [...grocyKeys.all, "quantity_units"] as const,
  products: () => [...grocyKeys.all, "products"] as const,
  productBarcodes: () => [...grocyKeys.all, "product_barcodes"] as const,
  /** Everything that changes when stock changes; invalidate this after an action. */
  stock: () => [...grocyKeys.all, "stock"] as const,
  currentStock: () => [...grocyKeys.stock(), "current"] as const,
  stockEntries: () => [...grocyKeys.stock(), "entries"] as const,
  productStockEntries: (productId: number) => [...grocyKeys.stockEntries(), productId] as const,
};

// Product setup changes rarely; stock changes after every action.
const SETUP_STALE_TIME = 5 * 60_000;

export function useLocations() {
  return useQuery({
    queryKey: grocyKeys.locations(),
    queryFn: () => grocyFetch("objects/locations", z.array(LocationSchema)),
    staleTime: SETUP_STALE_TIME,
  });
}

export function useProductGroups() {
  return useQuery({
    queryKey: grocyKeys.productGroups(),
    queryFn: () => grocyFetch("objects/product_groups", z.array(ProductGroupSchema)),
    staleTime: SETUP_STALE_TIME,
  });
}

export function useQuantityUnits() {
  return useQuery({
    queryKey: grocyKeys.quantityUnits(),
    queryFn: () => grocyFetch("objects/quantity_units", z.array(QuantityUnitSchema)),
    staleTime: SETUP_STALE_TIME,
  });
}

export function useProducts() {
  return useQuery({
    queryKey: grocyKeys.products(),
    queryFn: () => grocyFetch("objects/products", z.array(ProductSchema)),
    staleTime: SETUP_STALE_TIME,
  });
}

export function useProductBarcodes() {
  return useQuery({
    queryKey: grocyKeys.productBarcodes(),
    queryFn: () => grocyFetch("objects/product_barcodes", z.array(ProductBarcodeSchema)),
    staleTime: SETUP_STALE_TIME,
  });
}

/** Current stock per product (GET /stock). */
export function useCurrentStock() {
  return useQuery({
    queryKey: grocyKeys.currentStock(),
    queryFn: () => grocyFetch("stock", z.array(CurrentStockSchema)),
  });
}

/** Every stock batch, with its location and best-before date (GET /objects/stock). */
export function useStockEntries() {
  return useQuery({
    queryKey: grocyKeys.stockEntries(),
    queryFn: () => grocyFetch("objects/stock", z.array(StockEntrySchema)),
  });
}

/** Stock batches of one product, oldest first (GET /stock/products/{id}/entries). */
export function useProductStockEntries(productId: number) {
  return useQuery({
    queryKey: grocyKeys.productStockEntries(productId),
    queryFn: () => grocyFetch(`stock/products/${productId}/entries`, z.array(StockEntrySchema)),
  });
}
