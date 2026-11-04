"use client";

import { useEffect, useMemo } from "react";
import { STORAGE_FRONTS } from "@/lib/storage/dimensions";
import { Matte } from "../materials";
import type { SceneItem, SceneShelves } from "../types";
import { ShelfItems3d } from "../items/ShelfItems3d";
import type { Surface } from "../items/arrange";
import { BarHandle, KIT, ShelfLip, Soft } from "../kit";
import { ginghamTexture } from "../textures";
import { StoredItems } from "./StoredItems";
import type { StoragePalette } from "../types";

// Shared with the inside view, so the piece keeps its proportions there.
const WIDTH = STORAGE_FRONTS.suppliesCabinet.width;
const HEIGHT = STORAGE_FRONTS.suppliesCabinet.height;
const DEPTH = 1.3;
const FRONT_Z = DEPTH / 2;
const DEFAULT_PALETTE: StoragePalette = { body: "#9FCDE6", trim: "#78B1D2", accent: "#FFFDF8" };

const SURFACES: Surface[] = [
  { y: 0.14, x: -1.15, width: 2.3, z: 0.3, rows: 2 },
  { y: 1.32, x: -1.15, width: 2.3, z: 0.3, rows: 2 },
];

/** A painted open dresser: two tiers behind lips, a cream back, a wooden top and a brass towel rail on the side. */
const MIDDLE_TOP = 1.32;
const BOARD_TOP = 0.05;

const CLOTH_WIDTH = 1.3;
const CLOTH_DROP = 0.42;
const TOP_SURFACE = HEIGHT + 0.04;

/** A butter-yellow gingham runner across the wooden top, hanging down over the front edge. */
const TopCloth = () => {
  const gingham = useMemo(() => ginghamTexture(4, 4, "rgba(232, 190, 70, 0.7)"), []);
  const flap = useMemo(() => ginghamTexture(4, 1.3, "rgba(232, 190, 70, 0.7)"), []);
  useEffect(
    () => () => {
      gingham.dispose();
      flap.dispose();
    },
    [gingham, flap],
  );
  return (
    <group position={[0.35, TOP_SURFACE, 0]} rotation={[0, 0.06, 0]}>
      <mesh position={[0, 0.012, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[CLOTH_WIDTH, 0.024, DEPTH + 0.12]} />
        <meshStandardMaterial map={gingham} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, -CLOTH_DROP / 2 + 0.02, (DEPTH + 0.12) / 2 + 0.04]} castShadow>
        <boxGeometry args={[CLOTH_WIDTH, CLOTH_DROP, 0.024]} />
        <meshStandardMaterial map={flap} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
};

export const SuppliesCabinet = ({
  items,
  palette = DEFAULT_PALETTE,
  shelves,
  plain = false,
}: {
  items: readonly SceneItem[];
  palette?: StoragePalette;
  /** Without the gingham runner. */
  plain?: boolean;
  /** Tiers where the inside layout put them, with items at their saved spots. */
  shelves?: SceneShelves;
}) => {
  // The base stays; the boards above it follow the layout's rail notches.
  const middleTops = shelves ? shelves.surfaces.map((surface) => surface.y).filter((top) => top > 0.3) : [MIDDLE_TOP];
  return (
  <group>
    <mesh position={[0, HEIGHT / 2, -DEPTH / 2 + 0.04]} receiveShadow>
      <boxGeometry args={[WIDTH - 0.1, HEIGHT - 0.1, 0.06]} />
      <Matte color={KIT.cream} />
    </mesh>
    {[-WIDTH / 2 + 0.08, WIDTH / 2 - 0.08].map((sideX) => (
      <Soft key={sideX} size={[0.16, HEIGHT, DEPTH]} position={[sideX, HEIGHT / 2, 0]} color={palette.body} radius={0.06} />
    ))}
    <Soft size={[WIDTH, 0.14, DEPTH]} position={[0, 0.07, 0]} color={palette.body} radius={0.05} />
    {middleTops.map((top) => (
      <group key={top}>
        <Soft size={[WIDTH - 0.2, 0.1, DEPTH - 0.08]} position={[0, top - BOARD_TOP, 0]} color={palette.accent} radius={0.04} />
        <ShelfLip y={top - BOARD_TOP} width={WIDTH - 0.3} frontZ={FRONT_Z} color={palette.body} />
      </group>
    ))}
    <Soft size={[WIDTH + 0.14, 0.16, DEPTH + 0.08]} position={[0, HEIGHT - 0.04, 0]} color={KIT.oak} radius={0.07} />
    {!plain && <TopCloth />}
    <BarHandle position={[WIDTH / 2 + 0.02, 1.85, 0]} length={0.9} horizontal />
    {shelves ? <ShelfItems3d items={items} shelves={shelves} /> : <StoredItems items={items} surfaces={SURFACES} />}
  </group>
  );
};
