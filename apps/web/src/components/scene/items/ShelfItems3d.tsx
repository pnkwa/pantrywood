"use client";

import { useMemo } from "react";
import type { SceneItem, SceneShelves } from "../types";
import type { MarkerPlacement, Placement } from "./arrange";
import { ItemInstances } from "./ItemInstances";
import { copyOffsets, groupWidth, ITEM_SIZES } from "./sizes";

const MARKER_GAP = 0.14;

/**
 * Items standing where the inside layout put them. Each spot is as wide as the item's copies (times the size
 * you gave it), so the models fill it exactly, as the item's picture does in the inside view.
 */
const placementsOn = (items: readonly SceneItem[], shelves: SceneShelves) => {
  const placements: Placement[] = [];
  const markers: MarkerPlacement[] = [];
  const itemsByKey = new Map(items.map((item) => [item.key, item]));
  const surfaces = new Map(shelves.surfaces.map((surface) => [surface.sectionId, surface]));
  for (const spot of shelves.spots) {
    const item = itemsByKey.get(spot.key);
    const surface = surfaces.get(spot.sectionId);
    if (!item || !surface) continue;
    const scale = (spot.width * surface.width) / groupWidth(item.shape, item.copies);
    const centerX = surface.x + spot.x * surface.width;
    copyOffsets(item.shape, item.copies).forEach((offset, copy) => {
      placements.push({
        key: `${item.key}-${copy}`,
        productId: item.productId,
        shape: item.shape,
        color: item.color,
        accent: item.accent,
        position: [centerX + offset * scale, surface.y, surface.z],
        rotationY: 0,
        scale,
      });
    });
    if (item.marker) {
      markers.push({
        key: item.key,
        marker: item.marker,
        position: [centerX, surface.y + ITEM_SIZES[item.shape].height * scale + MARKER_GAP, surface.z],
      });
    }
  }
  return { placements, markers };
};

export const ShelfItems3d = ({ items, shelves }: { items: readonly SceneItem[]; shelves: SceneShelves }) => {
  const { placements, markers } = useMemo(() => placementsOn(items, shelves), [items, shelves]);
  return <ItemInstances placements={placements} markers={markers} />;
};
