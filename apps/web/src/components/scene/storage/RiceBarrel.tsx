"use client";

import { Vector2 } from "three";
import { Matte } from "../materials";
import { Brass, KIT, Soft } from "../kit";
import type { StoragePalette } from "../types";

const HEIGHT = 1.5;
const HOOP_HEIGHTS = [0.3, 1.2];
const STAVE_COUNT = 12;

const DEFAULT_PALETTE: StoragePalette = { body: "#B88A5F", trim: "#8C6A4A", accent: "#5E4430" };

/** A barrel's bulge: narrow at the ends, widest in the middle. */
const BARREL_PROFILE = Array.from({ length: 13 }, (_, step) => {
  const t = step / 12;
  return new Vector2(0.86 + Math.sin(t * Math.PI) * 0.12, t * HEIGHT);
});

/** A bulged wooden rice barrel with brass hoops, a lid with a knob and a little scoop. */
export const RiceBarrel = ({ palette = DEFAULT_PALETTE }: { palette?: StoragePalette }) => {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[BARREL_PROFILE, 40]} />
        <Matte color={palette.trim} />
      </mesh>
      {Array.from({ length: STAVE_COUNT }, (_, stave) => {
        const angle = (stave / STAVE_COUNT) * Math.PI * 2;
        return (
          <mesh key={stave} position={[Math.sin(angle) * 0.985, HEIGHT / 2, Math.cos(angle) * 0.985]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.012, HEIGHT * 0.8, 0.01]} />
            <Matte color={palette.accent} />
          </mesh>
        );
      })}
      {HOOP_HEIGHTS.map((hoopY) => (
        <mesh key={hoopY} position={[0, hoopY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.94, 0.04, 8, 48]} />
          <Brass />
        </mesh>
      ))}
      <mesh position={[0, HEIGHT + 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.92, 0.9, 0.12, 40]} />
        <Matte color={palette.body} />
      </mesh>
      <mesh position={[0, HEIGHT + 0.17, 0]} castShadow>
        <sphereGeometry args={[0.13, 16, 12]} />
        <Matte color={palette.accent} />
      </mesh>
      <group position={[0.45, HEIGHT + 0.13, 0.35]} rotation={[0, -0.6, 0.12]}>
        <Soft size={[0.32, 0.06, 0.22]} color={KIT.oak} radius={0.025} />
        <Soft size={[0.4, 0.05, 0.06]} position={[0.34, 0.02, 0]} color={KIT.oak} radius={0.02} />
      </group>
      <Soft size={[0.56, 0.32, 0.04]} position={[0, 0.75, 0.98]} color={KIT.ceramic} radius={0.04} shadows={false} />
    </group>
  );
};
