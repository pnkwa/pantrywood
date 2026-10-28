"use client";

import type { ReactNode } from "react";
import { RoundedBox } from "@react-three/drei";
import type { FridgeSurface } from "@/lib/inside/fridge-surfaces";
import { Matte } from "../materials";
import { KIT } from "../kit";
import type { StoragePalette } from "../types";
import { BACK_Z, CENTER_Y, DEFAULT_PALETTE, HEIGHT, HINGE_X, SEAM_Z, WIDTH } from "./Fridge";

const WALL = 0.15;
const BOTTOM_Y = CENTER_Y - HEIGHT / 2;
const TOP_Y = CENTER_Y + HEIGHT / 2;
const DEPTH = SEAM_Z - BACK_Z;
const DIVIDER_Y = 3.28;
const DOOR_DEPTH = 0.3;
// A cool frost lining, so cream and white items and the shelf edges stand out against it.
const INSIDE = "#D9E5E7";
const SHELF_GLASS = "#BCD0D5";
const SHELF_EDGE = "#C9B79A";
const SHELF_DEPTH = 1.2;
const CRISPER_LIP = 0.18;
const BIN_LIP = 0.2;
/** Wider open than in the room (126°), so the door bins face a camera looking in from the front. */
export const DOOR_OPEN_ANGLE = -2.2;
// Boards and bins span the whole cavity or door; the surfaces items stand on stop a little short of the ends.
const CAVITY_WIDTH = WIDTH - WALL * 2;
const BIN_WIDTH = 1.4;

const Wall = ({ size, position, color }: { size: [number, number, number]; position: [number, number, number]; color: string }) => (
  <RoundedBox args={size} position={position} radius={0.05} smoothness={3} receiveShadow castShadow>
    <Matte color={color} />
  </RoundedBox>
);

const WireShelf = ({ surface }: { surface: FridgeSurface }) => (
  <group>
    <mesh position={[0, surface.y - 0.02, surface.z + 0.1 - SHELF_DEPTH / 2]} receiveShadow>
      <boxGeometry args={[CAVITY_WIDTH, 0.04, SHELF_DEPTH]} />
      <Matte color={SHELF_GLASS} transparent opacity={0.9} />
    </mesh>
    <mesh position={[0, surface.y, surface.z + 0.1]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.035, 0.035, CAVITY_WIDTH, 10]} />
      <Matte color={SHELF_EDGE} />
    </mesh>
  </group>
);

const Crisper = ({ surface }: { surface: FridgeSurface }) => (
  <group>
    <mesh position={[surface.x + surface.width / 2, surface.y - 0.03, surface.z - 0.5]} receiveShadow>
      <boxGeometry args={[surface.width + 0.08, 0.06, 1.2]} />
      <Matte color="#FFFFFF" />
    </mesh>
    {/* A low clear front, so whatever is in the drawer still shows over it. */}
    <mesh position={[surface.x + surface.width / 2, surface.y + CRISPER_LIP / 2, surface.z + 0.1]}>
      <boxGeometry args={[surface.width + 0.08, CRISPER_LIP, 0.04]} />
      <Matte color="#FFFFFF" transparent opacity={0.55} />
    </mesh>
  </group>
);

const DoorBin = ({ surface }: { surface: FridgeSurface }) => (
  <group>
    <mesh position={[0, surface.y - 0.025, surface.z]}>
      <boxGeometry args={[BIN_WIDTH, 0.05, 0.3]} />
      <Matte color={SHELF_GLASS} />
    </mesh>
    <mesh position={[0, surface.y + BIN_LIP / 2, surface.z + 0.15]}>
      <boxGeometry args={[BIN_WIDTH, BIN_LIP, 0.03]} />
      <Matte color="#A9C4C9" transparent opacity={0.85} />
    </mesh>
  </group>
);

/** The door's inside face with its bins, facing +z (the door's own space); the slab sits behind it. */
const DoorInside = ({ palette, surfaces, children }: { palette: StoragePalette; surfaces: readonly FridgeSurface[]; children?: ReactNode }) => (
  <group>
    <Wall size={[WIDTH, HEIGHT, DOOR_DEPTH]} position={[0, CENTER_Y, -DOOR_DEPTH / 2]} color={palette.body} />
    <mesh position={[0, CENTER_Y, 0.002]} receiveShadow>
      <planeGeometry args={[WIDTH - 0.4, HEIGHT - 0.5]} />
      <Matte color={INSIDE} />
    </mesh>
    {surfaces.map((surface) => (surface.part === "door" ? <DoorBin key={surface.sectionId} surface={surface} /> : null))}
    {children}
  </group>
);

type OpenFridgeProps = {
  palette?: StoragePalette;
  surfaces: readonly FridgeSurface[];
  /** Drawn in the body's own space (shelves, crispers, freezer). */
  cavity?: ReactNode;
  /** Drawn in the open door's own space, where door-bin surfaces are. */
  door?: ReactNode;
};

/**
 * The fridge from the room for the inside page's 3D view: hollow, its shelves, crispers, freezer and door bins where the
 * inside layout puts them, the door swung open. Stands on y = 0 and faces +z like `Fridge`.
 */
export const OpenFridge = ({ palette = DEFAULT_PALETTE, surfaces, cavity, door }: OpenFridgeProps) => {
  const halfWidth = WIDTH / 2;
  const centerZ = BACK_Z + DEPTH / 2;
  return (
    <group>
      {[-0.75, 0.75].flatMap((footX) =>
        [-0.5, 0.5].map((footZ) => (
          <mesh key={`${footX}${footZ}`} position={[footX, 0.06, footZ]}>
            <cylinderGeometry args={[0.09, 0.07, 0.12, 12]} />
            <Matte color={KIT.shadowWood} />
          </mesh>
        )),
      )}
      <Wall size={[WIDTH, HEIGHT, WALL]} position={[0, CENTER_Y, BACK_Z + WALL / 2]} color={palette.body} />
      <mesh position={[0, CENTER_Y, BACK_Z + WALL + 0.002]} receiveShadow>
        <planeGeometry args={[WIDTH - WALL * 2, HEIGHT - WALL * 2]} />
        <Matte color={INSIDE} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Wall size={[WALL, HEIGHT, DEPTH]} position={[side * (halfWidth - WALL / 2), CENTER_Y, centerZ]} color={palette.body} />
          <mesh position={[side * (halfWidth - WALL - 0.002), CENTER_Y, centerZ]} rotation={[0, (-side * Math.PI) / 2, 0]} receiveShadow>
            <planeGeometry args={[DEPTH - 0.1, HEIGHT - WALL * 2]} />
            <Matte color={INSIDE} />
          </mesh>
        </group>
      ))}
      <Wall size={[WIDTH, WALL, DEPTH]} position={[0, TOP_Y - WALL / 2, centerZ]} color={palette.body} />
      <Wall size={[WIDTH, WALL, DEPTH]} position={[0, BOTTOM_Y + WALL / 2, centerZ]} color={palette.body} />
      <Wall size={[WIDTH - WALL * 2, 0.08, DEPTH - 0.05]} position={[0, DIVIDER_Y - 0.04, centerZ]} color={palette.accent} />
      {/* The light at the top of the cavity, under the divider. */}
      <mesh position={[0, DIVIDER_Y - 0.09, BACK_Z + 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.12]} />
        <meshBasicMaterial color="#FFF3D6" />
      </mesh>
      {surfaces.map((surface) =>
        surface.part === "door" ? null : surface.part === "crisper" ? (
          <Crisper key={surface.sectionId} surface={surface} />
        ) : (
          <WireShelf key={surface.sectionId} surface={surface} />
        ),
      )}
      {cavity}
      <group position={[HINGE_X, 0, SEAM_Z]} rotation={[0, DOOR_OPEN_ANGLE, 0]}>
        {/* Turned to look back into the fridge, as when the door is shut. */}
        <group position={[halfWidth, 0, 0]} rotation={[0, Math.PI, 0]}>
          <DoorInside palette={palette} surfaces={surfaces}>
            {door}
          </DoorInside>
        </group>
      </group>
    </group>
  );
};
