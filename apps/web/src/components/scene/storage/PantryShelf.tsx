"use client";

import { STORAGE_FRONTS } from "@/lib/storage/dimensions";
import { Matte } from "../materials";
import type { SceneItem, SceneShelves } from "../types";
import { ShelfItems3d } from "../items/ShelfItems3d";
import type { Surface } from "../items/arrange";
import { Brass, KIT, ShelfLip, Soft } from "../kit";
import { StoredItems } from "./StoredItems";
import type { StoragePalette } from "../types";

// Shared with the inside view, so the piece keeps its proportions there.
const WIDTH = STORAGE_FRONTS.pantryShelf.width;
const DEPTH = 1.2;
const FRONT_Z = DEPTH / 2;
const BOARD_HEIGHTS = [0.06, 1.14, 2.34, 3.54];
const POST_WIDTH = 0.18;
/** From a board's middle to its top, where things stand. */
const BOARD_TOP = 0.06;
/** A brass rail with cup hooks under the top board, like a café shelf. */
const RAIL_Y = 3.32;
const HOOK_XS = [-0.9, -0.3, 0.3, 0.9];

const SURFACES: Surface[] = BOARD_HEIGHTS.map((boardY) => ({
  y: boardY + 0.06,
  x: -1.32,
  width: 2.64,
  z: 0.25,
  rows: 2,
}));

const DEFAULT_PALETTE: StoragePalette = { body: "#A47551", trim: "#A47551", accent: "#6E4E33" };

/** An open framed shelf: rounded posts to the floor, a lip on each board and a crown on top. */
export const PantryShelf = ({
  items,
  palette = DEFAULT_PALETTE,
  shelves,
}: {
  items: readonly SceneItem[];
  palette?: StoragePalette;
  /** Tiers where the inside layout put them, with items at their saved spots. */
  shelves?: SceneShelves;
}) => {
  // The base board always stays; the tiers above it follow the layout's rail notches.
  const boardHeights = shelves
    ? [BOARD_HEIGHTS[0] ?? 0.06, ...shelves.surfaces.map((surface) => surface.y - BOARD_TOP).filter((boardY) => boardY > 0.3)]
    : BOARD_HEIGHTS;
  return (
  <group>
    <mesh position={[0, 2.5, -DEPTH / 2 + 0.04]} receiveShadow>
      <boxGeometry args={[WIDTH - 0.1, 4.9, 0.06]} />
      <Matte color={palette.accent} />
    </mesh>
    {[-WIDTH / 2 + POST_WIDTH / 2, WIDTH / 2 - POST_WIDTH / 2].map((postX) => (
      <Soft key={postX} size={[POST_WIDTH, 5.05, DEPTH]} position={[postX, 2.52, 0]} color={palette.body} radius={0.07} />
    ))}
    {boardHeights.map((boardY, index) => (
      <group key={boardY}>
        <Soft size={[WIDTH - 0.12, 0.12, DEPTH - 0.04]} position={[0, boardY, 0]} color={palette.body} radius={0.04} />
        {index > 0 && <ShelfLip y={boardY} width={WIDTH - 0.3} frontZ={FRONT_Z} color={palette.trim} />}
      </group>
    ))}
    <Soft size={[WIDTH + 0.24, 0.2, DEPTH + 0.12]} position={[0, 4.98, 0]} color={palette.body} radius={0.08} />
    <Soft size={[WIDTH - 0.2, 0.12, 0.08]} position={[0, 4.82, FRONT_Z - 0.04]} color={palette.trim} radius={0.03} />
    <mesh position={[0, RAIL_Y, FRONT_Z - 0.12]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <capsuleGeometry args={[0.025, WIDTH - 0.5, 4, 8]} />
      <Brass />
    </mesh>
    {HOOK_XS.map((hookX) => (
      <mesh key={hookX} position={[hookX, RAIL_Y - 0.07, FRONT_Z - 0.12]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} />
        <Brass />
      </mesh>
    ))}
    <Soft size={[WIDTH - 0.1, 0.1, 0.06]} position={[0, 0.16, FRONT_Z - 0.03]} color={KIT.shadowWood} radius={0.02} shadows={false} />
    {shelves ? <ShelfItems3d items={items} shelves={shelves} /> : <StoredItems items={items} surfaces={SURFACES} />}
  </group>
  );
};
