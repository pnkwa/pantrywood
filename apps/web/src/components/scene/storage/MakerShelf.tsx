"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { StoredItems } from "./StoredItems";

const SURFACES: Surface[] = [{ y: 0.05, x: -1.4, width: 2.8, z: 0, rows: 1 }];

export const MakerShelf = ({ items }: { items: readonly SceneItem[] }) => (
  <group>
    <RoundedBox
      args={[3, 0.1, 0.75]}
      radius={0.03}
      smoothness={2}
      castShadow
      receiveShadow
    >
      <Matte color="#C49770" />
    </RoundedBox>
    {[-1.1, 1.1].map((bracketX) => (
      <mesh key={bracketX} position={[bracketX, -0.2, -0.22]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.3]} />
        <Matte color="#A47551" />
      </mesh>
    ))}
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
