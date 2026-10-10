"use client";

import { useMemo } from "react";
import type { SceneItem } from "../types";
import { arrange, type Surface } from "../items/arrange";
import { ItemInstances } from "../items/ItemInstances";

/** Items lined up on a storage piece's surfaces (local coordinates). */
export function StoredItems({ items, surfaces }: { items: readonly SceneItem[]; surfaces: readonly Surface[] }) {
  const { placements, markers } = useMemo(() => arrange(items, surfaces), [items, surfaces]);
  return <ItemInstances placements={placements} markers={markers} />;
}
