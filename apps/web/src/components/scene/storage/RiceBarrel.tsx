"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";
import type { StoragePalette } from "../types";

const HOOP_HEIGHTS = [0.35, 1.1];

const DEFAULT_PALETTE: StoragePalette = { body: "#B88A5F", trim: "#8C6A4A", accent: "#5E4430" };

export const RiceBarrel = ({ palette = DEFAULT_PALETTE }: { palette?: StoragePalette }) => (
  <group>
    <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.95, 0.9, 1.5, 32]} />
      <Matte color={palette.trim} />
    </mesh>
    {HOOP_HEIGHTS.map((hoopY) => (
      <mesh key={hoopY} position={[0, hoopY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.93, 0.045, 8, 40]} />
        <Matte color={palette.accent} />
      </mesh>
    ))}
    <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1, 1, 0.12, 32]} />
      <Matte color={palette.body} />
    </mesh>
    <mesh position={[0, 1.66, 0]} castShadow>
      <cylinderGeometry args={[0.22, 0.26, 0.1, 20]} />
      <Matte color={palette.trim} />
    </mesh>
    <RoundedBox
      args={[0.6, 0.36, 0.04]}
      radius={0.04}
      smoothness={2}
      position={[0, 0.73, 0.93]}
    >
      <Matte color="#FFFBF3" />
    </RoundedBox>
  </group>
);
