import { useMemo } from "react";
import {
  useLocations,
  useProductGroups,
  useProducts,
  useQuantityUnits,
  useStockEntries,
} from "@/lib/grocy";
import { buildPantry, type Pantry } from "./model";

export type PantryState =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; pantry: Pantry };

export const usePantry = (): PantryState => {
  const locations = useLocations();
  const products = useProducts();
  const productGroups = useProductGroups();
  const quantityUnits = useQuantityUnits();
  const stockEntries = useStockEntries();
  const queries = [
    locations,
    products,
    productGroups,
    quantityUnits,
    stockEntries,
  ];

  const pantry = useMemo(() => {
    if (
      !locations.data ||
      !products.data ||
      !productGroups.data ||
      !quantityUnits.data ||
      !stockEntries.data
    ) {
      return null;
    }
    return buildPantry({
      locations: locations.data,
      products: products.data,
      productGroups: productGroups.data,
      quantityUnits: quantityUnits.data,
      stockEntries: stockEntries.data,
      today: new Date(),
    });
  }, [
    locations.data,
    products.data,
    productGroups.data,
    quantityUnits.data,
    stockEntries.data,
  ]);

  const failedQuery = queries.find((query) => query.error);
  if (failedQuery?.error) {
    return {
      status: "error",
      message: failedQuery.error.message,
      retry: () => queries.forEach((query) => query.error && query.refetch()),
    };
  }
  return pantry ? { status: "ready", pantry } : { status: "loading" };
};
