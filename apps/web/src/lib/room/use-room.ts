import { useMemo } from "react";
import type { SceneStorage } from "@/components/scene/types";
import {
  useLocations,
  useProductGroups,
  useProducts,
  useQuantityUnits,
  useStockEntries,
} from "@/lib/grocy";
import { stockByLocation } from "./items";
import { placeLocations } from "./layout";

export type RoomState =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; storages: SceneStorage[] };

export const useRoom = (): RoomState => {
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

  const storages = useMemo(() => {
    if (
      !locations.data ||
      !products.data ||
      !productGroups.data ||
      !quantityUnits.data ||
      !stockEntries.data
    ) {
      return null;
    }
    const stock = stockByLocation({
      products: products.data,
      productGroups: productGroups.data,
      quantityUnits: quantityUnits.data,
      stockEntries: stockEntries.data,
      today: new Date(),
    });
    const locationById = new Map(
      locations.data.map((location) => [location.id, location]),
    );
    return placeLocations(locations.data).map((placed): SceneStorage => {
      const locationStock = stock.get(placed.locationId);
      return {
        ...placed,
        items: locationStock?.items ?? [],
        tag: {
          name: locationById.get(placed.locationId)?.name ?? "",
          ...(locationStock?.tag ?? {
            itemCount: 0,
            useSoon: 0,
            expired: 0,
            low: 0,
          }),
        },
      };
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
  return storages ? { status: "ready", storages } : { status: "loading" };
};
