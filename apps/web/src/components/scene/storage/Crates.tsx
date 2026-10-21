"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
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
          <mesh
            key={slatY}
            position={[sideX, slatY, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.1, 0.28, DEPTH]} />
            <Matte color={slatColor} />
          </mesh>
        ))}
      </group>
    ))}
    <mesh position={[0, 0.04, 0]} receiveShadow>
      <boxGeometry args={[WIDTH, 0.08, DEPTH]} />
      <Matte color={slatColor} />
    </mesh>
    <mesh position={[0, HEIGHT - 0.04, 0]} castShadow receiveShadow>
      <boxGeometry args={[WIDTH, 0.08, DEPTH]} />
      <Matte color={slatColor} />
    </mesh>
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
    <RoundedBox
      args={[1.1, 0.75, 1.0]}
      radius={0.05}
      smoothness={2}
      position={[0.05, HEIGHT * 2 + 0.375, -0.05]}
      rotation={[0, 0.12, 0]}
      castShadow
      receiveShadow
    >
      <Matte color="#C9A77C" />
    </RoundedBox>
    <mesh position={[0.08, HEIGHT * 2 + 0.4, 0.46]} rotation={[0, 0.12, 0]}>
      <planeGeometry args={[0.55, 0.3]} />
      <Matte color="#FFFBF3" />
    </mesh>
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
