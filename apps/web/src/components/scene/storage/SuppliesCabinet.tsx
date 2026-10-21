"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { StoredItems } from "./StoredItems";
import type { StoragePalette } from "../types";

const WIDTH = 2.6;
const HEIGHT = 2.6;
const DEPTH = 1.3;
const DEFAULT_PALETTE: StoragePalette = { body: "#E9C46E", trim: "#E9C46E", accent: "#C9A27A" };

const SURFACES: Surface[] = [
  { y: 0.14, x: -1.15, width: 2.3, z: 0.3, rows: 2 },
  { y: 1.32, x: -1.15, width: 2.3, z: 0.3, rows: 2 },
];

export const SuppliesCabinet = ({
  items,
  palette = DEFAULT_PALETTE,
}: {
  items: readonly SceneItem[];
  palette?: StoragePalette;
}) => (
  <group>
    <mesh position={[0, HEIGHT / 2, -DEPTH / 2 + 0.03]} receiveShadow>
      <boxGeometry args={[WIDTH, HEIGHT, 0.06]} />
      <Matte color={palette.accent} />
    </mesh>
    {[-WIDTH / 2 + 0.07, WIDTH / 2 - 0.07].map((sideX) => (
      <mesh
        key={sideX}
        position={[sideX, HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.14, HEIGHT, DEPTH]} />
        <Matte color={palette.body} />
      </mesh>
    ))}
    <mesh position={[0, 0.07, 0]} receiveShadow>
      <boxGeometry args={[WIDTH, 0.14, DEPTH]} />
      <Matte color={palette.body} />
    </mesh>
    <mesh position={[0, 1.27, 0]} castShadow receiveShadow>
      <boxGeometry args={[WIDTH - 0.2, 0.1, DEPTH - 0.08]} />
      <Matte color={palette.accent} />
    </mesh>
    <RoundedBox
      args={[WIDTH + 0.12, 0.16, DEPTH + 0.06]}
      radius={0.06}
      smoothness={3}
      position={[0, HEIGHT - 0.04, 0]}
      castShadow
    >
      <Matte color={palette.body} />
    </RoundedBox>
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
