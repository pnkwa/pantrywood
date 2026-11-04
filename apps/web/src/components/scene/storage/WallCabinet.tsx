"use client";

import { Matte } from "../materials";
import type { SceneItem, StoragePalette } from "../types";
import type { Surface } from "../items/arrange";
import { KIT, Knob, Soft } from "../kit";
import { StoredItems } from "./StoredItems";

const WIDTH = 1.8;
const HEIGHT = 1.4;
const DEPTH = 0.55;
const FRONT_Z = DEPTH / 2;
const WALL = 0.08;
const SHELF_Y = 0.68;
const DOOR_WIDTH = (WIDTH - WALL * 2) / 2;
const DOOR_HEIGHT = HEIGHT - WALL * 2;
/** The right door stands open, so what's inside shows. */
const OPEN_DOOR_ANGLE = -1.25;
const DEFAULT_PALETTE: StoragePalette = { body: "#F4D36B", trim: "#E9C25A", accent: "#FFFDF8" };

const SURFACES: Surface[] = [
  { y: WALL, x: -0.78, width: 1.56, z: 0, rows: 1 },
  { y: SHELF_Y + 0.03, x: -0.78, width: 1.56, z: 0, rows: 1 },
];

/** A glass-fronted door: a painted frame round a pale pane, with a white knob near its free edge. */
const GlassDoor = ({ color, knobX }: { color: string; knobX: number }) => (
  <group>
    {[
      { size: [DOOR_WIDTH, 0.1, 0.05], at: [0, DOOR_HEIGHT / 2 - 0.05, 0] },
      { size: [DOOR_WIDTH, 0.1, 0.05], at: [0, -DOOR_HEIGHT / 2 + 0.05, 0] },
      { size: [0.1, DOOR_HEIGHT, 0.05], at: [-DOOR_WIDTH / 2 + 0.05, 0, 0] },
      { size: [0.1, DOOR_HEIGHT, 0.05], at: [DOOR_WIDTH / 2 - 0.05, 0, 0] },
    ].map(({ size: [width = 0, height = 0, depth = 0], at: [x = 0, y = 0, z = 0] }) => (
      <Soft key={`${x}${y}`} size={[width, height, depth]} position={[x, y, z]} color={color} radius={0.02} />
    ))}
    <mesh>
      <planeGeometry args={[DOOR_WIDTH - 0.18, DOOR_HEIGHT - 0.18]} />
      <meshStandardMaterial color="#E4F1F6" roughness={0.2} transparent opacity={0.35} />
    </mesh>
    <Knob position={[knobX, 0, 0.02]} size={0.045} color={KIT.ceramic} />
  </group>
);

/** A little sky-blue retro radio for the top. */
const Radio = () => (
  <group position={[-0.45, HEIGHT + 0.16, 0]}>
    <Soft size={[0.5, 0.3, 0.26]} color={KIT.skyDeep} radius={0.05} />
    <mesh position={[-0.08, 0, 0.131]}>
      <planeGeometry args={[0.2, 0.17]} />
      <Matte color="#4F86A8" />
    </mesh>
    <mesh position={[0.14, 0.02, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
      <Matte color={KIT.ceramic} />
    </mesh>
    <mesh position={[0.1, 0.3, -0.05]} rotation={[0, 0, -0.5]}>
      <cylinderGeometry args={[0.008, 0.008, 0.36, 6]} />
      <Matte color="#9AA3A8" />
    </mesh>
  </group>
);

/** A butter-yellow wall cabinet with two glass doors (the right one open) and a blue radio and jars on top. */
export const WallCabinet = ({
  items,
  palette = DEFAULT_PALETTE,
  plain = false,
}: {
  items: readonly SceneItem[];
  palette?: StoragePalette;
  /** Without the radio and jars on top. */
  plain?: boolean;
}) => (
  <group>
    <mesh position={[0, HEIGHT / 2, -DEPTH / 2 + 0.02]} receiveShadow>
      <planeGeometry args={[WIDTH - WALL * 2, HEIGHT - WALL * 2]} />
      <Matte color={palette.accent} />
    </mesh>
    {[-1, 1].map((side) => (
      <Soft key={side} size={[WALL, HEIGHT, DEPTH]} position={[side * (WIDTH / 2 - WALL / 2), HEIGHT / 2, 0]} color={palette.body} radius={0.03} />
    ))}
    <Soft size={[WIDTH, WALL, DEPTH]} position={[0, WALL / 2, 0]} color={palette.body} radius={0.03} />
    <Soft size={[WIDTH - WALL * 2, 0.05, DEPTH - 0.05]} position={[0, SHELF_Y, -0.02]} color={palette.body} radius={0.02} />
    {/* The top overhangs a little, like a crown. */}
    <Soft size={[WIDTH + 0.14, 0.1, DEPTH + 0.1]} position={[0, HEIGHT + 0.0, 0.02]} color={palette.trim} radius={0.04} />
    <group position={[-DOOR_WIDTH / 2 - 0.0, HEIGHT / 2, FRONT_Z]}>
      <GlassDoor color={palette.body} knobX={DOOR_WIDTH / 2 - 0.12} />
    </group>
    {/* Hinged on its right edge and swung out. */}
    <group position={[WIDTH / 2 - WALL / 2, HEIGHT / 2, FRONT_Z]} rotation={[0, OPEN_DOOR_ANGLE, 0]}>
      <group position={[-DOOR_WIDTH / 2, 0, 0]}>
        <GlassDoor color={palette.body} knobX={-DOOR_WIDTH / 2 + 0.12} />
      </group>
    </group>
    {!plain && <Radio />}
    {!plain && [0.25, 0.55].map((jarX) => (
      <group key={jarX} position={[jarX, HEIGHT + 0.05, -0.02]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.24, 16]} />
          <Matte color={KIT.ceramic} />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <Matte color={KIT.ceramic} />
        </mesh>
      </group>
    ))}
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
