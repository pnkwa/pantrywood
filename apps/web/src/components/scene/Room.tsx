"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { Texture } from "three";
import { LeafGarland, Toadstools, type Garland } from "./Greenery";
import { Matte } from "./materials";
import { floorTexture, wallpaperTexture, wallTileTexture } from "./textures";
import type { FloorSurface, WallSurface } from "./types";

const WALL_HEIGHT = 5.8;
const WALL_THICKNESS = 0.3;
const WAINSCOT_HEIGHT = 1.9;
const ROOM_SIZE = 10;
const CAP_TOP = WALL_HEIGHT + 0.55;
const CAP_FRONT = -WALL_THICKNESS / 2 + 0.425;
// A garland heaped over the corner where the walls meet, thinning out along each cap. The left wall is turned a
// quarter, so in its own space the corner is at +x; the back wall's corner is at -x.
const GARLANDS: Record<"right" | "left", readonly Garland[]> = {
  right: [{ from: -5.2, to: -0.8, drapes: 3 }],
  left: [{ from: 5.2, to: 1.6, drapes: 2 }],
};

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
      <LeafGarland garlands={GARLANDS[side]} capTop={CAP_TOP} capFront={CAP_FRONT} seed={isRight ? 11 : 23} />
      {!isRight && <Toadstools position={[-3.3, CAP_TOP, -WALL_THICKNESS / 2]} />}
    </group>
  );
};

/** A retro light switch: a rounded cream plate with a brass toggle, up for on and down for off. Click it to flip. */
const LightSwitch = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <group
    // On the left wall between the supplies cabinet and the pantry shelf, under the clock.
    position={[-0.5, 2.7, 0.03]}
    onClick={(event) => {
      event.stopPropagation();
      onToggle();
    }}
    onPointerOver={(event) => {
      event.stopPropagation();
      document.body.style.cursor = "pointer";
    }}
    onPointerOut={() => {
      document.body.style.cursor = "";
    }}
  >
    <RoundedBox args={[0.3, 0.44, 0.05]} radius={0.04} smoothness={3} castShadow>
      <Matte color="#FBF3DF" />
    </RoundedBox>
    <mesh position={[0, 0, 0.03]}>
      <circleGeometry args={[0.06, 16]} />
      <Matte color="#E6D9BE" />
    </mesh>
    <mesh position={[0, on ? 0.04 : -0.04, 0.07]} rotation={[on ? -0.6 : 0.6, 0, 0]} castShadow>
      <capsuleGeometry args={[0.022, 0.1, 4, 8]} />
      <meshStandardMaterial color="#C9A15A" roughness={0.4} metalness={0.15} />
    </mesh>
    {/* A bigger invisible target than the little plate, so it's easy to hit. */}
    <mesh visible={false}>
      <planeGeometry args={[0.6, 0.7]} />
    </mesh>
  </group>
);

export const Room = ({
  wall,
  floor,
  lightsOn,
  onToggleLights,
}: {
  wall: WallSurface;
  floor: FloorSurface;
  lightsOn: boolean;
  onToggleLights: () => void;
}) => {
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
      {/* The left wall is turned a quarter: in its own space x runs back toward the corner. */}
      <group position={[-5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <LightSwitch on={lightsOn} onToggle={onToggleLights} />
      </group>
    </group>
  );
};
