import { useMemo } from "react";
import type { SceneStorage } from "@/components/scene/types";
import type { Pantry } from "@/lib/pantry/model";
import { sceneItemsFor } from "./items";
import { placeLocations } from "./layout";

export const useRoomStorages = (pantry: Pantry | null): SceneStorage[] =>
  useMemo(() => {
    if (!pantry) return [];
    const locationById = new Map(
      pantry.locations.map((location) => [location.id, location]),
    );
    return placeLocations(
      pantry.locations.map((location) => ({
        id: location.id,
        name: location.name,
        isFreezer: location.isFreezer,
      })),
    ).flatMap((placed): SceneStorage[] => {
      const location = locationById.get(placed.locationId);
      if (!location) return [];
      return [
        {
          ...placed,
          items: sceneItemsFor(location.items),
          tag: {
            name: location.name,
            itemCount: location.counts.itemCount,
            useSoon: location.counts.useSoon,
            expired: location.counts.expired,
            low: location.counts.low,
          },
        },
      ];
    });
  }, [pantry]);
