"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { Texture } from "three";
import { Matte } from "./materials";
import { floorTexture, wallpaperTexture, wallTileTexture } from "./textures";
import type { FloorSurface, WallSurface } from "./types";

const WALL_HEIGHT = 5.8;
const WALL_THICKNESS = 0.3;
const WAINSCOT_HEIGHT = 1.9;
const ROOM_SIZE = 10;

/** Textures live on the GPU, so a swapped wallpaper or floor frees the old one. */
const useDisposable = (texture: Texture | null) => {
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
};

const Wall = ({ side, surface }: { side: "right" | "left"; surface: WallSurface }) => {
  const isRight = side === "right";
  const wainscot = surface.pattern === "wainscot";
  const tiles = useDisposable(useMemo(() => (wainscot ? wallTileTexture(ROOM_SIZE, WAINSCOT_HEIGHT) : null), [wainscot]));
  const paper = useDisposable(useMemo(() => wallpaperTexture(surface, ROOM_SIZE, WALL_HEIGHT), [surface]));

  return (
    <group
      position={isRight ? [0, 0, -5] : [-5, 0, 0]}
      rotation={[0, isRight ? 0 : Math.PI / 2, 0]}
    >
      <mesh
        position={[-WALL_THICKNESS / 2, WALL_HEIGHT / 2, -WALL_THICKNESS / 2]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[ROOM_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]} />
        <Matte color={surface.base} />
      </mesh>
      {/* The left wall sits a shade darker, as if it faced away from the window. */}
      {!isRight && (
        <mesh position={[0, WALL_HEIGHT / 2, 0.003]}>
          <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.035} />
        </mesh>
      )}
      {paper && (
        <mesh position={[0, WALL_HEIGHT / 2, 0.004]} receiveShadow>
          <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
          <meshStandardMaterial map={paper} roughness={1} metalness={0} />
        </mesh>
      )}
      {tiles && (
        <>
          <mesh position={[0, WAINSCOT_HEIGHT / 2, 0.005]} receiveShadow>
            <planeGeometry args={[ROOM_SIZE, WAINSCOT_HEIGHT]} />
            <meshStandardMaterial map={tiles} roughness={1} metalness={0} />
          </mesh>
          <mesh position={[0, WAINSCOT_HEIGHT + 0.06, 0.03]} receiveShadow>
            <boxGeometry args={[ROOM_SIZE, 0.12, 0.06]} />
            <Matte color={isRight ? "#C49770" : "#B88A5F"} />
          </mesh>
        </>
      )}
      <mesh position={[0, 0.15, 0.03]} receiveShadow>
        <boxGeometry args={[ROOM_SIZE, 0.3, 0.06]} />
        <Matte color={isRight ? "#A47551" : "#8C6440"} />
      </mesh>
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
};

/** The room shell. Wallpaper and floor are materials (DESIGN.md section 14), never extra meshes. */
export const Room = ({ wall, floor }: { wall: WallSurface; floor: FloorSurface }) => {
  const floorMap = useDisposable(useMemo(() => floorTexture(floor), [floor]));
  // On-demand rendering: a new wallpaper or floor must redraw the room.
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => invalidate(), [wall, floor, invalidate]);

  return (
    <group>
      <RoundedBox
        args={[11.2, 0.7, 11.2]}
        radius={0.12}
        smoothness={3}
        position={[0, -0.45, 0]}
        receiveShadow
      >
        <Matte color="#8C6440" />
      </RoundedBox>
      <RoundedBox
        args={[11.2, 0.12, 11.2]}
        radius={0.05}
        smoothness={2}
        position={[0, -0.06, 0]}
        receiveShadow
      >
        <Matte color="#C9A27A" />
      </RoundedBox>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial map={floorMap} roughness={1} metalness={0} />
      </mesh>
      <Wall side="right" surface={wall} />
      <Wall side="left" surface={wall} />
    </group>
  );
};
