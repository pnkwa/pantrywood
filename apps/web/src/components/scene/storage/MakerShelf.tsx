"use client";

import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { KIT, Soft } from "../kit";
import { StoredItems } from "./StoredItems";

const SURFACES: Surface[] = [{ y: 0.05, x: -0.85, width: 1.7, z: 0, rows: 1 }];
/** The board and brackets, without anything stored on it. */
const WallShelf = () => (
  <group>
    <Soft size={[1.9, 0.14, 0.75]} color={KIT.sky} radius={0.07} />
    <Soft size={[1.8, 0.12, 0.06]} position={[0, 0.02, 0.36]} color={KIT.skyDeep} radius={0.03} />
    {[-0.7, 0.7].map((bracketX) => (
      <Soft key={bracketX} size={[0.1, 0.42, 0.5]} position={[bracketX, -0.27, -0.12]} color={KIT.oak} radius={0.045} />
    ))}
  </group>
);

/** A rounded sky-blue wall shelf on wooden brackets, like a retro kitchen, holding its location's items. */
export const MakerShelf = ({ items }: { items: readonly SceneItem[] }) => (
  <group>
    <WallShelf />
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
