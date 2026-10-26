"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide, Vector2 } from "three";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { Matte } from "../materials";
import { ginghamTexture } from "../textures";
import { StoredItems } from "./StoredItems";
import type { StoragePalette } from "../types";

const SURFACES: Surface[] = [
  { y: 0.32, x: -0.42, width: 0.84, z: 0.14, rows: 2 },
];
const WEAVE_HEIGHTS = [0.12, 0.24, 0.36, 0.48];
const RIM_Y = 0.6;

const DEFAULT_PALETTE: StoragePalette = { body: "#B98B57", trim: "#9A7043", accent: "#9A7043" };

/** A rounded basket's side, flaring from a narrow base to the rim. */
const BASKET_PROFILE = Array.from({ length: 9 }, (_, step) => {
  const t = step / 8;
  return new Vector2(0.46 + Math.sin(t * Math.PI * 0.5) * 0.15, t * RIM_Y);
});

/** A woven basket with a red-gingham liner folded over the rim and two loop handles. */
export const WickerBasket = ({
  items,
  palette = DEFAULT_PALETTE,
}: {
  items: readonly SceneItem[];
  palette?: StoragePalette;
}) => {
  const liner = useMemo(() => ginghamTexture(10, 1, "rgba(217, 96, 74, 0.6)"), []);
  useEffect(() => () => liner.dispose(), [liner]);
  return (
    <group>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[BASKET_PROFILE, 28]} />
        <meshStandardMaterial color={palette.body} roughness={1} metalness={0} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.46, 0.46, 0.04, 28]} />
        <Matte color={palette.trim} />
      </mesh>
      {WEAVE_HEIGHTS.map((weaveY) => (
        <mesh key={weaveY} position={[0, weaveY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.465 + Math.sin((weaveY / RIM_Y) * Math.PI * 0.5) * 0.15, 0.022, 6, 32]} />
          <Matte color={palette.trim} />
        </mesh>
      ))}
      <mesh position={[0, RIM_Y - 0.05, 0]}>
        <cylinderGeometry args={[0.64, 0.62, 0.14, 28, 1, true]} />
        <meshStandardMaterial map={liner} roughness={1} metalness={0} side={DoubleSide} />
      </mesh>
      <mesh position={[0, RIM_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.04, 8, 32]} />
        <Matte color={palette.trim} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.62, RIM_Y + 0.02, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[0.13, 0.035, 8, 16, Math.PI]} />
          <Matte color={palette.trim} />
        </mesh>
      ))}
      <StoredItems items={items} surfaces={SURFACES} />
    </group>
  );
};
