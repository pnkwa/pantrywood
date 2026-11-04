"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Color, Material, MeshStandardMaterial } from "three";
import { blendDaylight, daylightAt, minutesNow, nearlySame, withLightsOff, type Daylight } from "@/lib/room/daylight";
import { useUiStore } from "@/lib/store/ui-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { glowPatchTexture } from "./textures";

const CHECK_EVERY_MS = 60_000;
/** Per second; about 1.5 s to settle. */
const EASE_RATE = 3;

/**
 * The room's light right now, eased toward the clock's. One object shared by the room's lights and glowing decor, which
 * read it every frame; mutated in place so the scene never re-renders for it. Pieces drawn outside the room (catalog
 * thumbnails) just see the light from when the page loaded.
 */
export const shownDaylight: Daylight = { ...daylightAt(minutesNow(new Date())) };

/** Mounted once in the room: reads the clock every minute and the light switch, and eases `shownDaylight` toward them. */
export const DaylightClock = () => {
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const lightsOn = useUiStore((state) => state.lightsOn);
  const [clock, setClock] = useState(() => daylightAt(minutesNow(new Date())));
  // The wall clock is a real outside source, so an interval it is.
  useEffect(() => {
    const timer = setInterval(() => setClock(daylightAt(minutesNow(new Date()))), CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, []);
  const target = useMemo(() => (lightsOn ? clock : withLightsOff(clock)), [clock, lightsOn]);
  useEffect(() => invalidate(), [target, invalidate]);
  useFrame((_, delta) => {
    if (nearlySame(shownDaylight, target)) {
      Object.assign(shownDaylight, target);
      return;
    }
    Object.assign(shownDaylight, blendDaylight(shownDaylight, target, reducedMotion ? 1 : 1 - Math.exp(-delta * EASE_RATE)));
    invalidate();
  });
  return null;
};

/** With the lights off at night, a glowing part shows this cool moonlight colour, this much brighter. */
type Moonlit = { warm: Color; moon: Color; boost: number };

/**
 * Sets a glowing material's emissive strength from the shown glow each frame: `base + glow * range`, and, for parts
 * that catch moonlight (`moonlit`), tints it toward the moon colour as the lights go off.
 */
export const useGlow = (base: number, range: number, moonlit?: Moonlit) => {
  const material = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    if (!material.current) return;
    material.current.emissiveIntensity = base + shownDaylight.glow * range + (moonlit ? shownDaylight.moonlight * moonlit.boost : 0);
    if (moonlit) material.current.emissive.copy(moonlit.warm).lerp(moonlit.moon, shownDaylight.moonlight);
  });
  return material;
};

/** A soft warm light patch (floor or wall) whose strength follows the glow. Draws over surfaces without hiding them. */
type GlowPatchProps = {
  size: [number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  /** How bright next to the default patch (1). */
  strength?: number;
};

export const GlowPatch = ({ size, position, rotation = [0, 0, 0], strength = 1 }: GlowPatchProps) => {
  const texture = useMemo(() => glowPatchTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const material = useRef<Material>(null);
  useFrame(() => {
    // Its faint daytime pool fades out too when the lights go off in the dark.
    if (material.current) material.current.opacity = Math.min(1, (0.12 * (1 - shownDaylight.moonlight) + shownDaylight.glow * 0.45) * strength);
  });
  return (
    <mesh position={position} rotation={rotation} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial ref={material} map={texture} color="#FFD9A0" transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
};
