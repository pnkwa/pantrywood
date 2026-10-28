"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { RoundedBox } from "@react-three/drei";
import { BufferGeometry, Float32BufferAttribute, Path, Shape, ShapeGeometry } from "three";
import type { FridgeSurface } from "@/lib/inside/fridge-surfaces";
import { Matte } from "../materials";
import { Brass, KIT } from "../kit";
import type { StoragePalette } from "../types";
import { BACK_Z, CENTER_Y, CORNER_RADIUS, cutShell, DEFAULT_PALETTE, FridgeTop, HEIGHT, HINGE_X, SEAM_Z, WIDTH } from "./Fridge";

const WALL = 0.15;
const TOP_Y = CENTER_Y + HEIGHT / 2;
const DEPTH = SEAM_Z - BACK_Z;
const DIVIDER_Y = 3.28;
// A warm ivory lining and shelves, like a toy fridge: the food's colours are what stand out.
const INSIDE = "#FBF4E4";
const SHELF = "#FFF9EE";
/** The raised cream bar under the freezer, and the freezer's cold blue details. */
const RIM = "#F7EAD0";
const FROST = "#DCEEF3";
const VENT = "#8C6440";
const SHELF_LIP = 0.08;
const SHELF_DEPTH = 1.2;
const CRISPER_LIP = 0.22;
// Smoked see-through drawer fronts, so what's inside still shows.
const DRAWER = "#6B5847";
const BIN_LIP = 0.2;
/** Wider open than in the room (126°), so the door bins face a camera looking in from the front. */
export const DOOR_OPEN_ANGLE = -2.2;
// Boards and bins span the whole cavity or door; the surfaces items stand on stop a little short of the ends.
const CAVITY_WIDTH = WIDTH - WALL * 2;
const BIN_WIDTH = 1.4;

const OPENING_WIDTH = WIDTH - WALL * 2;
const OPENING_HEIGHT = HEIGHT - WALL * 2;

const roundedRect = <T extends Path>(path: T, width: number, height: number, radius: number) => {
  const [x, y] = [-width / 2, -height / 2];
  path.moveTo(x + radius, y);
  path.lineTo(x + width - radius, y);
  path.quadraticCurveTo(x + width, y, x + width, y + radius);
  path.lineTo(x + width, y + height - radius);
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  path.lineTo(x + radius, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - radius);
  path.lineTo(x, y + radius);
  path.quadraticCurveTo(x, y, x + radius, y);
  return path;
};

/** The room fridge's rounded shell with its flat front cap cut away, so the body is one soft open-fronted piece. */
const openShell = () => {
  const shell = cutShell("back");
  const positions = shell.getAttribute("position");
  const normals = shell.getAttribute("normal");
  const atSeam = (vertex: number) => Math.abs(positions.getZ(vertex) - SEAM_Z) < 0.0001;
  const keptPositions: number[] = [];
  const keptNormals: number[] = [];
  // The shell is non-indexed: every three vertices are one triangle, and the cap's lie flat on the seam.
  for (let first = 0; first < positions.count; first += 3) {
    if (atSeam(first) && atSeam(first + 1) && atSeam(first + 2)) continue;
    for (let vertex = first; vertex < first + 3; vertex++) {
      keptPositions.push(positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex));
      keptNormals.push(normals.getX(vertex), normals.getY(vertex), normals.getZ(vertex));
    }
  }
  shell.dispose();
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(keptPositions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(keptNormals, 3));
  geometry.computeBoundingSphere();
  return geometry;
};

/** The chunky front face round the opening: the shell's rounded outline with the cavity cut out of it. */
const frontFace = () => {
  const outline = roundedRect(new Shape(), WIDTH, HEIGHT, CORNER_RADIUS);
  outline.holes.push(roundedRect(new Path(), OPENING_WIDTH, OPENING_HEIGHT, 0.08));
  return new ShapeGeometry(outline, 12);
};

const Wall = ({ size, position, color }: { size: [number, number, number]; position: [number, number, number]; color: string }) => (
  <RoundedBox args={size} position={position} radius={0.07} smoothness={4} receiveShadow castShadow>
    <Matte color={color} />
  </RoundedBox>
);

/** A solid white board with a thick rounded front edge. */
const Shelf = ({ surface }: { surface: FridgeSurface }) => (
  <group>
    <RoundedBox args={[CAVITY_WIDTH, 0.06, SHELF_DEPTH]} position={[0, surface.y - 0.03, surface.z + 0.1 - SHELF_DEPTH / 2]} radius={0.025} smoothness={3} receiveShadow castShadow>
      <Matte color={SHELF} />
    </RoundedBox>
    <RoundedBox args={[CAVITY_WIDTH, SHELF_LIP, 0.06]} position={[0, surface.y - 0.06 + SHELF_LIP / 2, surface.z + 0.1]} radius={0.025} smoothness={3} castShadow>
      <Matte color={SHELF} />
    </RoundedBox>
  </group>
);

const RACK_BARS = 7;

/** The freezer's wire rack: frosty bars running back to front, so it reads as a freezer and not one more shelf. */
const FreezerRack = ({ surface }: { surface: FridgeSurface }) => (
  <group>
    {Array.from({ length: RACK_BARS }, (_, index) => (
      <mesh key={index} position={[-CAVITY_WIDTH / 2 + 0.1 + (index * (CAVITY_WIDTH - 0.2)) / (RACK_BARS - 1), surface.y - 0.02, surface.z + 0.1 - SHELF_DEPTH / 2]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <capsuleGeometry args={[0.02, SHELF_DEPTH - 0.04, 4, 8]} />
        <Matte color={FROST} />
      </mesh>
    ))}
    <mesh position={[0, surface.y - 0.02, surface.z + 0.1]} rotation={[0, 0, Math.PI / 2]}>
      <capsuleGeometry args={[0.03, CAVITY_WIDTH - 0.06, 4, 8]} />
      <Matte color={SHELF} />
    </mesh>
  </group>
);

/** A deep smoked drawer with a brass pull, as on a retro fridge. */
const Crisper = ({ surface }: { surface: FridgeSurface }) => {
  const centerX = surface.x + surface.width / 2;
  const width = surface.width + 0.08;
  return (
    <group>
      <mesh position={[centerX, surface.y - 0.03, surface.z - 0.5]} receiveShadow>
        <boxGeometry args={[width, 0.06, 1.2]} />
        <Matte color={SHELF} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[centerX + (side * (width - 0.03)) / 2, surface.y + CRISPER_LIP / 2 - 0.03, surface.z - 0.5]}>
          <boxGeometry args={[0.03, CRISPER_LIP, 1.2]} />
          <Matte color={DRAWER} transparent opacity={0.45} />
        </mesh>
      ))}
      <RoundedBox args={[width, CRISPER_LIP, 0.05]} position={[centerX, surface.y + CRISPER_LIP / 2 - 0.03, surface.z + 0.1]} radius={0.02} smoothness={3}>
        <Matte color={DRAWER} transparent opacity={0.55} />
      </RoundedBox>
      <mesh position={[centerX, surface.y + CRISPER_LIP - 0.09, surface.z + 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.018, width * 0.35, 4, 8]} />
        <Brass />
      </mesh>
    </group>
  );
};

/** A deep white tray with end caps, as on a toy fridge's door. */
const DoorBin = ({ surface }: { surface: FridgeSurface }) => (
  <group>
    <RoundedBox args={[BIN_WIDTH, 0.06, 0.32]} position={[0, surface.y - 0.03, surface.z]} radius={0.025} smoothness={3} receiveShadow>
      <Matte color={SHELF} />
    </RoundedBox>
    <RoundedBox args={[BIN_WIDTH, BIN_LIP, 0.05]} position={[0, surface.y + BIN_LIP / 2 - 0.04, surface.z + 0.15]} radius={0.025} smoothness={3} castShadow>
      <Matte color={SHELF} />
    </RoundedBox>
    {[-1, 1].map((side) => (
      <RoundedBox key={side} args={[0.05, BIN_LIP, 0.32]} position={[(side * (BIN_WIDTH - 0.05)) / 2, surface.y + BIN_LIP / 2 - 0.04, surface.z]} radius={0.02} smoothness={3}>
        <Matte color={SHELF} />
      </RoundedBox>
    ))}
  </group>
);

/** A raised rounded frame, like a fridge's gasket: round the opening, and round the door's inside face. */
type RimProps = { width: number; height: number; centerY: number; z: number; thickness?: number; depth?: number; color?: string };

const Rim = ({ width, height, centerY, z, thickness = 0.14, depth = 0.07, color = RIM }: RimProps) => (
  <group>
    {[-1, 1].map((side) => (
      <group key={side}>
        <Wall size={[width, thickness, depth]} position={[0, centerY + (side * (height - thickness)) / 2, z]} color={color} />
        <Wall size={[thickness, height, depth]} position={[(side * (width - thickness)) / 2, centerY, z]} color={color} />
      </group>
    ))}
  </group>
);

/** The door's inside face with its bins, facing +z (the door's own space); the slab sits behind it. */
const DoorInside = ({ palette, surfaces, children }: { palette: StoragePalette; surfaces: readonly FridgeSurface[]; children?: ReactNode }) => {
  const shell = useMemo(() => cutShell("front"), []);
  useEffect(() => () => shell.dispose(), [shell]);
  return (
  <group>
    {/* The room fridge's own rounded door, turned so its flat inside faces +z. */}
    <mesh geometry={shell} position={[0, CENTER_Y, 0]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
      <Matte color={palette.body} />
    </mesh>
    <mesh position={[0, CENTER_Y, 0.002]} receiveShadow>
      <planeGeometry args={[WIDTH - 0.5, HEIGHT - 0.5]} />
      <Matte color={INSIDE} />
    </mesh>
    {/* A thick raised lip round the inside, so the door reads as a deep pillowy tray. */}
    <Rim width={WIDTH - 0.24} height={HEIGHT - 0.24} centerY={CENTER_Y} z={0.05} thickness={0.16} depth={0.1} color={palette.body} />
    {surfaces.map((surface) => (surface.part === "door" ? <DoorBin key={surface.sectionId} surface={surface} /> : null))}
    {children}
  </group>
  );
};

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
  const centerZ = BACK_Z + WALL + (DEPTH - WALL) / 2;
  const shell = useMemo(() => openShell(), []);
  const face = useMemo(() => frontFace(), []);
  useEffect(
    () => () => {
      shell.dispose();
      face.dispose();
    },
    [shell, face],
  );
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
      <mesh geometry={shell} position={[0, CENTER_Y, 0]} castShadow receiveShadow>
        <Matte color={palette.body} />
      </mesh>
      <mesh geometry={face} position={[0, CENTER_Y, SEAM_Z]} receiveShadow>
        <Matte color={palette.body} />
      </mesh>
      <FridgeTop />
      {/* The lining: back, sides, ceiling and floor of the cavity, just inside the shell. */}
      <mesh position={[0, CENTER_Y, BACK_Z + WALL]} receiveShadow>
        <planeGeometry args={[OPENING_WIDTH, OPENING_HEIGHT]} />
        <Matte color={INSIDE} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (halfWidth - WALL), CENTER_Y, centerZ]} rotation={[0, (-side * Math.PI) / 2, 0]} receiveShadow>
          <planeGeometry args={[DEPTH - WALL, OPENING_HEIGHT]} />
          <Matte color={INSIDE} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, CENTER_Y + side * (OPENING_HEIGHT / 2), centerZ]} rotation={[(side * Math.PI) / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[OPENING_WIDTH, DEPTH - WALL]} />
          <Matte color={INSIDE} />
        </mesh>
      ))}
      {/* Two retro brass badges on the side, near the top. */}
      {[0, 1].map((badge) => (
        <mesh key={badge} position={[halfWidth + 0.005, TOP_Y - 1.15 - badge * 0.16, -0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.35, 1, 1]}>
          <capsuleGeometry args={[0.05, 0.12, 4, 10]} />
          <Brass />
        </mesh>
      ))}
      <Wall size={[OPENING_WIDTH, 0.08, DEPTH - WALL]} position={[0, DIVIDER_Y - 0.04, centerZ]} color={palette.accent} />
      <Wall size={[WIDTH - WALL * 2, 0.12, 0.07]} position={[0, DIVIDER_Y - 0.06, SEAM_Z - 0.02]} color={RIM} />
      {/* The freezer: an icy back wall with vent slots and a cold blue glow. */}
      <mesh position={[0, (DIVIDER_Y + TOP_Y - WALL) / 2, BACK_Z + WALL + 0.004]} receiveShadow>
        <planeGeometry args={[WIDTH - WALL * 2, TOP_Y - WALL - DIVIDER_Y]} />
        <Matte color={FROST} />
      </mesh>
      {[-0.5, 0, 0.5].flatMap((ventX) =>
        [0, 1, 2].map((slot) => (
          <mesh key={`${ventX}${slot}`} position={[ventX, TOP_Y - WALL - 0.22 - slot * 0.07, BACK_Z + WALL + 0.008]}>
            <planeGeometry args={[0.36, 0.035]} />
            <meshBasicMaterial color={VENT} />
          </mesh>
        )),
      )}
      <pointLight position={[0, TOP_Y - WALL - 0.3, BACK_Z + 0.9]} color="#CDEBFF" intensity={2.5} distance={2.5} decay={1.6} />
      {/* The light at the top of the cavity, under the divider. */}
      <mesh position={[0, DIVIDER_Y - 0.09, BACK_Z + 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.12]} />
        <meshBasicMaterial color="#FFF3D6" />
      </mesh>
      <pointLight position={[0, DIVIDER_Y - 0.4, BACK_Z + 0.9]} color="#FFE9C4" intensity={4} distance={4.5} decay={1.6} />
      {surfaces.map((surface) =>
        surface.part === "door" ? null : surface.part === "crisper" ? (
          <Crisper key={surface.sectionId} surface={surface} />
        ) : surface.part === "freezer" ? (
          <FreezerRack key={surface.sectionId} surface={surface} />
        ) : (
          <Shelf key={surface.sectionId} surface={surface} />
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
