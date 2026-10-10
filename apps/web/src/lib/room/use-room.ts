import { useMemo } from "react";
import type { SceneStorage } from "@/components/scene/types";
import { useLocations, useProductGroups, useProducts, useQuantityUnits, useStockEntries } from "@/lib/grocy";
import { stockByLocation } from "./items";
import { placeLocations } from "./layout";

export type RoomState =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; storages: SceneStorage[] };

/** Everything the storage room needs, from Grocy through the proxy. */
export function useRoom(): RoomState {
  const locations = useLocations();
  const products = useProducts();
  const productGroups = useProductGroups();
  const quantityUnits = useQuantityUnits();
  const stockEntries = useStockEntries();
  const queries = [locations, products, productGroups, quantityUnits, stockEntries];

  const storages = useMemo(() => {
    if (!locations.data || !products.data || !productGroups.data || !quantityUnits.data || !stockEntries.data) {
      return null;
    }
    const stock = stockByLocation({
      products: products.data,
      productGroups: productGroups.data,
      quantityUnits: quantityUnits.data,
      stockEntries: stockEntries.data,
      today: new Date(),
    });
    return placeLocations(locations.data).map((placed): SceneStorage => {
      const location = locations.data.find((l) => l.id === placed.locationId)!;
      const here = stock.get(placed.locationId);
      return {
        ...placed,
        items: here?.items ?? [],
        tag: { name: location.name, ...(here?.tag ?? { itemCount: 0, useSoon: 0, expired: 0, low: 0 }) },
      };
    });
  }, [locations.data, products.data, productGroups.data, quantityUnits.data, stockEntries.data]);

  const failed = queries.find((q) => q.error);
  if (failed?.error) {
    return {
      status: "error",
      message: failed.error.message,
      retry: () => queries.forEach((q) => q.error && q.refetch()),
    };
  }
  return storages ? { status: "ready", storages } : { status: "loading" };
}
