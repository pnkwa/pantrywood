"use client";

import { useMemo } from "react";
import type { SceneItem } from "../types";
import { arrange, type Surface } from "../items/arrange";
import { ItemInstances } from "../items/ItemInstances";

type StoredItemsProps = {
  items: readonly SceneItem[];
  surfaces: readonly Surface[];
};

export const StoredItems = ({ items, surfaces }: StoredItemsProps) => {
  const { placements, markers } = useMemo(
    () => arrange(items, surfaces),
    [items, surfaces],
  );
  return <ItemInstances placements={placements} markers={markers} />;
};
