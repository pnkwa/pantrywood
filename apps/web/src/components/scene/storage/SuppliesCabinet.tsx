"use client";

import { Matte } from "../materials";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { BarHandle, KIT, ShelfLip, Soft } from "../kit";
import { StoredItems } from "./StoredItems";
import type { StoragePalette } from "../types";

const WIDTH = 2.6;
const HEIGHT = 2.6;
const DEPTH = 1.3;
const FRONT_Z = DEPTH / 2;
const DEFAULT_PALETTE: StoragePalette = { body: "#E9C46E", trim: "#E9C46E", accent: "#C9A27A" };

const SURFACES: Surface[] = [
  { y: 0.14, x: -1.15, width: 2.3, z: 0.3, rows: 2 },
  { y: 1.32, x: -1.15, width: 2.3, z: 0.3, rows: 2 },
];

/** A painted open dresser: two tiers behind lips, a cream back and a brass towel rail on the side. */
export const SuppliesCabinet = ({
  items,
  palette = DEFAULT_PALETTE,
}: {
  items: readonly SceneItem[];
  palette?: StoragePalette;
}) => (
  <group>
    <mesh position={[0, HEIGHT / 2, -DEPTH / 2 + 0.04]} receiveShadow>
      <boxGeometry args={[WIDTH - 0.1, HEIGHT - 0.1, 0.06]} />
      <Matte color={KIT.cream} />
    </mesh>
    {[-WIDTH / 2 + 0.08, WIDTH / 2 - 0.08].map((sideX) => (
      <Soft key={sideX} size={[0.16, HEIGHT, DEPTH]} position={[sideX, HEIGHT / 2, 0]} color={palette.body} radius={0.06} />
    ))}
    <Soft size={[WIDTH, 0.14, DEPTH]} position={[0, 0.07, 0]} color={palette.body} radius={0.05} />
    <Soft size={[WIDTH - 0.2, 0.1, DEPTH - 0.08]} position={[0, 1.27, 0]} color={palette.accent} radius={0.04} />
    <ShelfLip y={1.27} width={WIDTH - 0.3} frontZ={FRONT_Z} color={palette.body} />
    <Soft size={[WIDTH + 0.14, 0.16, DEPTH + 0.08]} position={[0, HEIGHT - 0.04, 0]} color={KIT.oak} radius={0.07} />
    <BarHandle position={[WIDTH / 2 + 0.02, 1.85, 0]} length={0.9} horizontal />
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
