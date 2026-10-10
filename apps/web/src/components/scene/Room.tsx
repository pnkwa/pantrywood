"use client";

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { Matte } from "./materials";
import { checkerFloorTexture, wallTileTexture } from "./textures";

/*
 * The diorama shell: thick wooden slab, checkered floor, two cream walls with a tiled
 * wainscot, rail and baseboard, and chunky rounded wood caps. Floor spans -5…5.
 */

const WALL_HEIGHT = 5.8;
const WALL_THICKNESS = 0.3;
const WAINSCOT_HEIGHT = 1.9;

function Wall({ side }: { side: "right" | "left" }) {
  const tiles = useMemo(() => wallTileTexture(10, WAINSCOT_HEIGHT), []);
  const isRight = side === "right";
  // The right wall runs along x at z = -5; the left wall along z at x = -5.
  const rotationY = isRight ? 0 : Math.PI / 2;
  const origin: [number, number, number] = isRight ? [0, 0, -5] : [-5, 0, 0];

  return (
    <group position={origin} rotation={[0, rotationY, 0]}>
      <mesh position={[-WALL_THICKNESS / 2, WALL_HEIGHT / 2, -WALL_THICKNESS / 2]} receiveShadow castShadow>
        <boxGeometry args={[10 + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]} />
        <Matte color={isRight ? "#F7EFE1" : "#EFE4CF"} />
      </mesh>
      {/* Wainscot tiles */}
      <mesh position={[0, WAINSCOT_HEIGHT / 2, 0.005]} receiveShadow>
        <planeGeometry args={[10, WAINSCOT_HEIGHT]} />
        <meshStandardMaterial map={tiles} roughness={1} metalness={0} />
      </mesh>
      {/* Rail and baseboard */}
      <mesh position={[0, WAINSCOT_HEIGHT + 0.06, 0.03]} receiveShadow>
        <boxGeometry args={[10, 0.12, 0.06]} />
        <Matte color={isRight ? "#C49770" : "#B88A5F"} />
      </mesh>
      <mesh position={[0, 0.15, 0.03]} receiveShadow>
        <boxGeometry args={[10, 0.3, 0.06]} />
        <Matte color={isRight ? "#A47551" : "#8C6440"} />
      </mesh>
      {/* Chunky rounded wood cap */}
      <RoundedBox
        args={[11, 0.7, 0.85]}
        radius={0.2}
        smoothness={4}
        position={[-0.1, WALL_HEIGHT + 0.2, -WALL_THICKNESS / 2]}
        castShadow
      >
        <Matte color="#B88A5F" />
      </RoundedBox>
    </group>
  );
}

export function Room() {
  const floor = useMemo(() => checkerFloorTexture(), []);

  return (
    <group>
      {/* Thick wooden slab with a lighter rim */}
      <RoundedBox args={[11.2, 0.7, 11.2]} radius={0.12} smoothness={3} position={[0, -0.45, 0]} receiveShadow>
        <Matte color="#8C6440" />
      </RoundedBox>
      <RoundedBox args={[11.2, 0.12, 11.2]} radius={0.05} smoothness={2} position={[0, -0.06, 0]} receiveShadow>
        <Matte color="#C9A27A" />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial map={floor} roughness={1} metalness={0} />
      </mesh>
      <Wall side="right" />
      <Wall side="left" />
    </group>
  );
}
