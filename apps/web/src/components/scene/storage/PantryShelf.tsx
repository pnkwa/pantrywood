"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { StoredItems } from "./StoredItems";

const WIDTH = 3;
const DEPTH = 1.2;
const BOARDS = [0.06, 1.14, 2.34, 3.54];

const SURFACES: Surface[] = BOARDS.map((y) => ({ y: y + 0.06, x: -1.32, width: 2.64, z: 0.25, rows: 2 }));

/** Open walnut shelf unit full of jars and cans, in the back corner. */
export function PantryShelf({ items }: { items: readonly SceneItem[] }) {
  return (
    <group>
      <mesh position={[0, 2.5, -DEPTH / 2 + 0.03]} receiveShadow>
        <boxGeometry args={[WIDTH, 5, 0.06]} />
        <Matte color="#6E4E33" />
      </mesh>
      {[-WIDTH / 2 + 0.07, WIDTH / 2 - 0.07].map((x) => (
        <mesh key={x} position={[x, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.14, 5, DEPTH]} />
          <Matte color="#A47551" />
        </mesh>
      ))}
      {BOARDS.map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[WIDTH - 0.1, 0.12, DEPTH]} />
          <Matte color="#A47551" />
        </mesh>
      ))}
      <RoundedBox args={[WIDTH + 0.2, 0.18, DEPTH + 0.06]} radius={0.06} smoothness={3} position={[0, 4.95, 0]} castShadow>
        <Matte color="#A47551" />
      </RoundedBox>
      <StoredItems items={items} surfaces={SURFACES} />
    </group>
  );
}
