"use client";

import { DoubleSide } from "three";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { Matte } from "../materials";
import { StoredItems } from "./StoredItems";

const SURFACES: Surface[] = [
  { y: 0.32, x: -0.42, width: 0.84, z: 0.14, rows: 2 },
];
const WEAVE_HEIGHTS = [0.18, 0.42];

export const WickerBasket = ({ items }: { items: readonly SceneItem[] }) => (
  <group>
    <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.6, 0.48, 0.6, 24, 1, true]} />
      <meshStandardMaterial
        color="#B98B57"
        roughness={1}
        metalness={0}
        side={DoubleSide}
      />
    </mesh>
    <mesh position={[0, 0.02, 0]} receiveShadow>
      <cylinderGeometry args={[0.48, 0.48, 0.04, 24]} />
      <Matte color="#9A7043" />
    </mesh>
    <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.6, 0.045, 8, 32]} />
      <Matte color="#9A7043" />
    </mesh>
    {WEAVE_HEIGHTS.map((weaveY) => (
      <mesh
        key={weaveY}
        position={[0, weaveY, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.5 + weaveY * 0.18, 0.02, 6, 32]} />
        <Matte color="#9A7043" />
      </mesh>
    ))}
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
