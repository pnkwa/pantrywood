"use client";

import { Matte } from "../materials";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { KIT, Soft } from "../kit";
import { StoredItems } from "./StoredItems";
import type { StoragePalette } from "../types";

const WIDTH = 1.4;
const HEIGHT = 1.1;
const DEPTH = 1.3;
const DEFAULT_PALETTE: StoragePalette = { body: "#C49770", trim: "#C9A27A", accent: "#A47551" };
const SLAT_HEIGHTS = [0.2, 0.55, 0.9];

const SURFACES: Surface[] = [
  { y: 0.08, x: -0.6, width: 1.2, z: 0.3, rows: 2 },
  { y: 0.08 + HEIGHT, x: -0.6, width: 1.2, z: 0.3, rows: 2 },
];

const Crate = ({ y, slatColor, backColor }: { y: number; slatColor: string; backColor: string }) => (
  <group position={[0, y, 0]}>
    <mesh position={[0, HEIGHT / 2, -DEPTH / 2 + 0.03]} receiveShadow>
      <boxGeometry args={[WIDTH, HEIGHT, 0.06]} />
      <Matte color={backColor} />
    </mesh>
    {[-WIDTH / 2 + 0.05, WIDTH / 2 - 0.05].map((sideX) => (
      <group key={sideX}>
        {SLAT_HEIGHTS.map((slatY) => (
          <Soft key={slatY} size={[0.1, 0.28, DEPTH]} position={[sideX, slatY, 0]} color={slatColor} radius={0.04} />
        ))}
        {/* The hand hole cut into each side, like a real produce crate. */}
        <Soft size={[0.12, 0.1, 0.42]} position={[sideX, 0.9, 0]} color={KIT.shadowWood} radius={0.04} shadows={false} />
      </group>
    ))}
    <Soft size={[WIDTH, 0.08, DEPTH]} position={[0, 0.04, 0]} color={slatColor} radius={0.03} />
    {[-DEPTH / 2 + 0.05, DEPTH / 2 - 0.05].map((railZ) => (
      <Soft key={railZ} size={[WIDTH, 0.1, 0.1]} position={[0, HEIGHT - 0.05, railZ]} color={slatColor} radius={0.04} />
    ))}
  </group>
);

export const Crates = ({
  items,
  palette = DEFAULT_PALETTE,
}: {
  items: readonly SceneItem[];
  palette?: StoragePalette;
}) => (
  <group>
    <Crate y={0} slatColor={palette.body} backColor={palette.accent} />
    <Crate y={HEIGHT} slatColor={palette.trim} backColor={palette.accent} />
    <group position={[0.05, HEIGHT * 2 + 0.375, -0.05]} rotation={[0, 0.12, 0]}>
      <Soft size={[1.1, 0.75, 1.0]} color="#C9A77C" radius={0.08} />
      {/* A folded paper parcel with a twine band and a cream label. */}
      <Soft size={[1.12, 0.06, 0.08]} position={[0, 0.1, 0]} color={KIT.ceramic} radius={0.02} shadows={false} />
      <Soft size={[0.55, 0.3, 0.03]} position={[0.03, 0.02, 0.51]} color={KIT.ceramic} radius={0.03} shadows={false} />
    </group>
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
