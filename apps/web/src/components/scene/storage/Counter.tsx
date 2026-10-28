"use client";

import { STORAGE_FRONTS } from "@/lib/storage/dimensions";
import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";
import type { SceneItem } from "../types";
import type { Surface } from "../items/arrange";
import { BarHandle, KIT, PanelDoor, Soft } from "../kit";
import { StoredItems } from "./StoredItems";

// Shared with the inside view, so the piece keeps its proportions there.
const WIDTH = STORAGE_FRONTS.counter.width;
const DEPTH = 1.35;
const BODY_HEIGHT = 1.65;
const TOE_KICK_HEIGHT = 0.15;
const TOP_Y = TOE_KICK_HEIGHT + BODY_HEIGHT;
const FRONT_Z = DEPTH / 2;
const DRAWER_HEIGHT = 0.36;
const DOOR_WIDTH = (WIDTH - 0.24) / 2;
const DOOR_HEIGHT = BODY_HEIGHT - DRAWER_HEIGHT - 0.24;
const DOOR_CENTER_Y = TOE_KICK_HEIGHT + 0.08 + DOOR_HEIGHT / 2;
const DRAWER_CENTER_Y = TOP_Y - 0.08 - DRAWER_HEIGHT / 2;
const COLUMN_XS = [-DOOR_WIDTH / 2 - 0.03, DOOR_WIDTH / 2 + 0.03];
const COUNTERTOP_Y = TOP_Y + 0.16;

// Left of the cutting board.
const SURFACES: Surface[] = [
  { y: COUNTERTOP_Y, x: -1.15, width: 1.3, z: 0.35, rows: 2 },
];

/** A mint base cabinet like the reference kitchen: butter doors and drawers, brass pulls, an oak top. */
export const Counter = ({ items }: { items: readonly SceneItem[] }) => (
  <group>
    <mesh position={[0, TOE_KICK_HEIGHT / 2, -0.05]} receiveShadow>
      <boxGeometry args={[WIDTH - 0.2, TOE_KICK_HEIGHT, DEPTH - 0.2]} />
      <Matte color={KIT.shadowWood} />
    </mesh>
    <Soft size={[WIDTH, BODY_HEIGHT, DEPTH]} position={[0, TOE_KICK_HEIGHT + BODY_HEIGHT / 2, 0]} color={KIT.mint} radius={0.08} />
    {COLUMN_XS.map((columnX, index) => (
      <group key={columnX}>
        <Soft size={[DOOR_WIDTH, DRAWER_HEIGHT, 0.08]} position={[columnX, DRAWER_CENTER_Y, FRONT_Z]} color={KIT.butter} radius={0.035} />
        <BarHandle position={[columnX, DRAWER_CENTER_Y, FRONT_Z]} length={0.36} horizontal />
        <PanelDoor
          position={[columnX, DOOR_CENTER_Y, FRONT_Z]}
          width={DOOR_WIDTH}
          height={DOOR_HEIGHT}
          color={KIT.butter}
          inset="#F6E3A8"
          knobAt={[index === 0 ? DOOR_WIDTH / 2 - 0.14 : -DOOR_WIDTH / 2 + 0.14, DOOR_HEIGHT / 2 - 0.16]}
        />
      </group>
    ))}
    <Soft size={[WIDTH + 0.14, 0.16, DEPTH + 0.14]} position={[0, TOP_Y + 0.08, 0.05]} color={KIT.oak} radius={0.05} />
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
