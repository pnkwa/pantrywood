"use client";

import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { Brass, KIT, ShelfLip, Soft } from "../kit";
import { StoredItems } from "./StoredItems";

const SURFACES: Surface[] = [{ y: 0.05, x: -1.4, width: 2.8, z: 0, rows: 1 }];

/** A floating oak wall shelf on curled brass brackets, with a lip so spools don't roll off. */
export const MakerShelf = ({ items }: { items: readonly SceneItem[] }) => (
  <group>
    <Soft size={[3, 0.12, 0.75]} color={KIT.oak} radius={0.04} />
    <ShelfLip y={-0.02} width={2.8} frontZ={0.375} color={KIT.oakDeep} />
    {[-1.1, 1.1].map((bracketX) => (
      <group key={bracketX} position={[bracketX, -0.06, -0.2]}>
        <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[0.16, 0.025, 8, 16, Math.PI / 2]} />
          <Brass />
        </mesh>
        <mesh position={[0, -0.08, -0.14]}>
          <cylinderGeometry args={[0.025, 0.025, 0.2, 8]} />
          <Brass />
        </mesh>
      </group>
    ))}
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
