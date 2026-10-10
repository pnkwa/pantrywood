import type { ItemMarker, ItemShape, SceneItem } from "../types";
import { SHAPES } from "./shapes";

/*
 * Lines items up on flat surfaces (shelf boards, crate floors). Pure layout math:
 * the front row of every surface first, then the back rows. Items that don't fit are
 * left out of the 3D view (the tag and lists still count them).
 */

export type Surface = {
  /** Height of the surface. */
  y: number;
  /** Left edge (local x) and usable width. */
  x: number;
  width: number;
  /** z of the front row; back rows step towards -z. */
  z: number;
  rows: number;
};

export type Placement = {
  key: string;
  shape: ItemShape;
  color: string;
  accent: string;
  position: [number, number, number];
  rotationY: number;
};

export type MarkerPlacement = { key: string; marker: ItemMarker; position: [number, number, number] };

const GAP = 0.04;
const ROW_DEPTH = 0.36;

export function arrange(items: readonly SceneItem[], surfaces: readonly Surface[]) {
  const placements: Placement[] = [];
  const markers: MarkerPlacement[] = [];
  // Every front row first (bottom to top), then the back rows, so items spread over all shelves.
  const maxRows = Math.max(0, ...surfaces.map((s) => s.rows));
  const slots = Array.from({ length: maxRows }, (_, row) =>
    surfaces.filter((surface) => row < surface.rows).map((surface) => ({ surface, row })),
  ).flat();
  let slotIndex = 0;
  let cursor = 0;

  for (const item of items) {
    const { width, height } = SHAPES[item.shape];
    const groupWidth = item.copies * width + (item.copies - 1) * GAP;

    // Find a row with room for the whole group; otherwise move on.
    while (slotIndex < slots.length && cursor + groupWidth > slots[slotIndex]!.surface.width) {
      slotIndex += 1;
      cursor = 0;
    }
    const slot = slots[slotIndex];
    if (!slot) break;

    const { surface, row } = slot;
    const z = surface.z - row * ROW_DEPTH;
    // Back rows sit a touch higher so they peek over the front row.
    const y = surface.y + row * 0.02;
    for (let copy = 0; copy < item.copies; copy++) {
      const x = surface.x + cursor + width / 2 + copy * (width + GAP);
      placements.push({
        key: `${item.key}-${copy}`,
        shape: item.shape,
        color: item.color,
        accent: item.accent,
        position: [x, y, z],
        // A tiny, stable wobble so rows don't look machine-made.
        rotationY: (((placements.length * 37) % 7) - 3) * 0.06,
      });
    }
    if (item.marker) {
      markers.push({
        key: item.key,
        marker: item.marker,
        position: [surface.x + cursor + groupWidth / 2, y + height + 0.14, z],
      });
    }
    cursor += groupWidth + GAP * 2;
  }

  return { placements, markers };
}
