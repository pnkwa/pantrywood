"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { StoredItems } from "./StoredItems";

const WIDTH = 2.4;
const DEPTH = 1.35;
const BODY_HEIGHT = 1.65;
const TOE_KICK_HEIGHT = 0.15;
const TOP_Y = TOE_KICK_HEIGHT + BODY_HEIGHT;
const FRONT_Z = DEPTH / 2;
const SAGE = "#A9BC95";
const SAGE_LIGHT = "#C3D0B3";
const SAGE_DEEP = "#7E9A68";
const LATTE = "#C9B79A";
const BUTCHER_BLOCK = "#C49770";
const DOOR_WIDTH = (WIDTH - 0.24) / 2;
const DOOR_HEIGHT = BODY_HEIGHT - 0.2;
const DOOR_CENTER_Y = TOE_KICK_HEIGHT + BODY_HEIGHT / 2;
const DOOR_CENTERS_X = [-DOOR_WIDTH / 2 - 0.03, DOOR_WIDTH / 2 + 0.03];
const COUNTERTOP_Y = TOP_Y + 0.16;

// Left of the cutting board.
const SURFACES: Surface[] = [
  { y: COUNTERTOP_Y, x: -1.15, width: 1.3, z: 0.35, rows: 2 },
];

export const Counter = ({ items }: { items: readonly SceneItem[] }) => (
  <group>
    <mesh position={[0, TOE_KICK_HEIGHT / 2, -0.05]} receiveShadow>
      <boxGeometry args={[WIDTH - 0.2, TOE_KICK_HEIGHT, DEPTH - 0.2]} />
      <Matte color={SAGE_DEEP} />
    </mesh>
    <RoundedBox
      args={[WIDTH, BODY_HEIGHT, DEPTH]}
      radius={0.08}
      smoothness={4}
      position={[0, TOE_KICK_HEIGHT + BODY_HEIGHT / 2, 0]}
      castShadow
      receiveShadow
    >
      <Matte color={SAGE} />
    </RoundedBox>
    {DOOR_CENTERS_X.map((doorX, doorIndex) => (
      <group key={doorX} position={[doorX, DOOR_CENTER_Y, FRONT_Z]}>
        <RoundedBox
          args={[DOOR_WIDTH, DOOR_HEIGHT, 0.08]}
          radius={0.04}
          smoothness={3}
          castShadow
          receiveShadow
        >
          <Matte color="#F3EADB" />
        </RoundedBox>
        <RoundedBox
          args={[DOOR_WIDTH - 0.28, DOOR_HEIGHT - 0.28, 0.04]}
          radius={0.03}
          smoothness={3}
          position={[0, 0, 0.04]}
        >
          <Matte color={SAGE_LIGHT} />
        </RoundedBox>
        <mesh
          position={[doorIndex === 0 ? DOOR_WIDTH / 2 - 0.12 : -DOOR_WIDTH / 2 + 0.12, 0.2, 0.09]}
          castShadow
        >
          <sphereGeometry args={[0.055, 14, 10]} />
          <Matte color={LATTE} />
        </mesh>
      </group>
    ))}
    <RoundedBox
      args={[WIDTH + 0.14, 0.16, DEPTH + 0.14]}
      radius={0.05}
      smoothness={3}
      position={[0, TOP_Y + 0.08, 0.05]}
      castShadow
      receiveShadow
    >
      <Matte color={BUTCHER_BLOCK} />
    </RoundedBox>
    <RoundedBox
      args={[0.7, 0.05, 0.45]}
      radius={0.02}
      smoothness={2}
      position={[0.5, TOP_Y + 0.185, 0.15]}
      rotation={[0, -0.15, 0]}
      castShadow
    >
      <Matte color="#E3C9A0" />
    </RoundedBox>
    <StoredItems items={items} surfaces={SURFACES} />
  </group>
);
