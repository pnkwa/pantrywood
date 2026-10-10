import type { ItemMarker, ItemShape, SceneItem } from "../types";
import { SHAPES } from "./shapes";

export type Surface = {
  y: number;
  /** Left edge in local x. */
  x: number;
  width: number;
  /** Front row z; back rows step towards -z. */
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

export type MarkerPlacement = {
  key: string;
  marker: ItemMarker;
  position: [number, number, number];
};

const GAP = 0.04;
const ROW_DEPTH = 0.36;
const BACK_ROW_RAISE = 0.02;
const MARKER_GAP = 0.14;

/** Fills the front row of every surface first, then the back rows. Items that don't fit are left out. */
export const arrange = (
  items: readonly SceneItem[],
  surfaces: readonly Surface[],
) => {
  const placements: Placement[] = [];
  const markers: MarkerPlacement[] = [];
  const maxRows = Math.max(0, ...surfaces.map((surface) => surface.rows));
  const rows = Array.from({ length: maxRows }, (_, row) =>
    surfaces
      .filter((surface) => row < surface.rows)
      .map((surface) => ({ surface, row })),
  ).flat();
  let rowIndex = 0;
  let cursor = 0;

  for (const item of items) {
    const { width, height } = SHAPES[item.shape];
    const groupWidth = item.copies * width + (item.copies - 1) * GAP;

    while (
      rowIndex < rows.length &&
      cursor + groupWidth > (rows[rowIndex]?.surface.width ?? 0)
    ) {
      rowIndex += 1;
      cursor = 0;
    }
    const currentRow = rows[rowIndex];
    if (!currentRow) break;

    const { surface, row } = currentRow;
    const z = surface.z - row * ROW_DEPTH;
    const y = surface.y + row * BACK_ROW_RAISE;
    for (let copy = 0; copy < item.copies; copy++) {
      placements.push({
        key: `${item.key}-${copy}`,
        shape: item.shape,
        color: item.color,
        accent: item.accent,
        position: [surface.x + cursor + width / 2 + copy * (width + GAP), y, z],
        rotationY: (((placements.length * 37) % 7) - 3) * 0.06,
      });
    }
    if (item.marker) {
      markers.push({
        key: item.key,
        marker: item.marker,
        position: [
          surface.x + cursor + groupWidth / 2,
          y + height + MARKER_GAP,
          z,
        ],
      });
    }
    cursor += groupWidth + GAP * 2;
  }

  return { placements, markers };
};
