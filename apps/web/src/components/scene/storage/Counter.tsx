"use client";

import { STORAGE_FRONTS } from "@/lib/storage/dimensions";
import { Matte } from "../materials";
import { KIT, Knob, PanelDoor, Soft } from "../kit";

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

const SINK_X = 0.2;
const SINK_WIDTH = 0.95;
const SINK_DEPTH = 0.7;
const SINK_Z = 0.12;

/** Soft, slightly shiny, like the chrome tap on a toy kitchen. */
const Chrome = () => <meshStandardMaterial color="#C7CED3" roughness={0.25} metalness={0.35} />;

/** A sink set into the top: a white rim flush with it, a blue-grey basin with a drain, and a curved chrome tap behind. */
const Sink = () => (
  <group position={[SINK_X, TOP_Y + 0.16, SINK_Z]}>
    <Soft size={[SINK_WIDTH, 0.03, SINK_DEPTH]} position={[0, 0.005, 0]} color={KIT.ceramic} radius={0.012} shadows={false} />
    <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[SINK_WIDTH - 0.16, SINK_DEPTH - 0.16]} />
      <Matte color="#A9BEC8" />
    </mesh>
    <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.05, 16]} />
      <Matte color="#6E8591" />
    </mesh>
    <group position={[0, 0, -SINK_DEPTH / 2 - 0.1]}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.48, 12]} />
        <Chrome />
      </mesh>
      <mesh position={[0, 0.48, 0.17]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.17, 0.04, 8, 18, Math.PI]} />
        <Chrome />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.2, 0.06, 0]} castShadow>
          <sphereGeometry args={[0.065, 12, 8]} />
          <Matte color={KIT.ceramic} />
        </mesh>
      ))}
    </group>
  </group>
);

const CREAM_BODY = "#FBF3DF";
const CREAM_KICK = "#EADBBD";
/**
 * A retro base cabinet like a toy kitchen: cream body, sky-blue drawers and doors with white knobs and a white top.
 * The sink counter (a location named for the sink) has the sink in its top and one wide door under it.
 */
export const Counter = ({ sink = false }: { sink?: boolean }) => (
  <group>
    <mesh position={[0, TOE_KICK_HEIGHT / 2, -0.05]} receiveShadow>
      <boxGeometry args={[WIDTH - 0.2, TOE_KICK_HEIGHT, DEPTH - 0.2]} />
      <Matte color={CREAM_KICK} />
    </mesh>
    <Soft size={[WIDTH, BODY_HEIGHT, DEPTH]} position={[0, TOE_KICK_HEIGHT + BODY_HEIGHT / 2, 0]} color={CREAM_BODY} radius={0.08} />
    {sink ? (
      // Under the sink: one wide door the whole height, no drawers.
      <PanelDoor
        position={[0, TOE_KICK_HEIGHT + BODY_HEIGHT / 2, FRONT_Z]}
        width={WIDTH - 0.2}
        height={BODY_HEIGHT - 0.2}
        color={KIT.sky}
        inset={KIT.skyPale}
        knobColor={KIT.ceramic}
        knobAt={[WIDTH / 2 - 0.26, 0.15]}
      />
    ) : (
      COLUMN_XS.map((columnX, index) => (
      <group key={columnX}>
        <Soft size={[DOOR_WIDTH, DRAWER_HEIGHT, 0.08]} position={[columnX, DRAWER_CENTER_Y, FRONT_Z]} color={KIT.sky} radius={0.06} />
        <Knob position={[columnX, DRAWER_CENTER_Y, FRONT_Z + 0.04]} size={0.06} color={KIT.ceramic} />
        <PanelDoor
          position={[columnX, DOOR_CENTER_Y, FRONT_Z]}
          width={DOOR_WIDTH}
          height={DOOR_HEIGHT}
          color={KIT.sky}
          inset={KIT.skyPale}
          knobColor={KIT.ceramic}
          knobAt={[index === 0 ? DOOR_WIDTH / 2 - 0.14 : -DOOR_WIDTH / 2 + 0.14, DOOR_HEIGHT / 2 - 0.16]}
        />
      </group>
      ))
    )}
    {/* Exactly as wide as the body, so two counters side by side read as one run. */}
    <Soft size={[WIDTH, 0.16, DEPTH + 0.14]} position={[0, TOP_Y + 0.08, 0.05]} color={KIT.ceramic} radius={0.07} />
    {sink && <Sink />}
  </group>
);
