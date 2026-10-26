"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// A lightly underdamped spring: pieces lift, and land with a small playful bounce (DESIGN.md section 10).
const STIFFNESS = 260;
const DAMPING = 17;
const POP_FROM = 0.7;
const SETTLED = 0.0005;
// On-demand rendering means the first frame after a pause can report a huge delta.
const MAX_STEP = 1 / 30;

/**
 * Springs a group's height towards `lift` (hover, carrying) and, with `popIn`, scales it in from
 * small when it first appears. Returns the ref for the group to move.
 */
export const useSpringLift = (lift: number, popIn = false) => {
  const groupRef = useRef<Group>(null);
  const spring = useRef({ y: 0, velocity: 0, scale: popIn ? POP_FROM : 1, scaleVelocity: 0 });
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  // On-demand rendering: a new target has to start the frames that animate towards it.
  useEffect(() => invalidate(), [lift, invalidate]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const state = spring.current;
    if (!group) return;
    if (reducedMotion) {
      state.y = lift;
      state.scale = 1;
    } else {
      const step = Math.min(delta, MAX_STEP);
      state.velocity += (STIFFNESS * (lift - state.y) - DAMPING * state.velocity) * step;
      state.y += state.velocity * step;
      state.scaleVelocity += (STIFFNESS * (1 - state.scale) - DAMPING * state.scaleVelocity) * step;
      state.scale += state.scaleVelocity * step;
    }
    group.position.y = state.y;
    group.scale.setScalar(state.scale);
    const moving =
      Math.abs(lift - state.y) > SETTLED ||
      Math.abs(state.velocity) > SETTLED ||
      Math.abs(1 - state.scale) > SETTLED ||
      Math.abs(state.scaleVelocity) > SETTLED;
    if (moving) invalidate();
    else {
      state.y = lift;
      state.velocity = 0;
      state.scale = 1;
      state.scaleVelocity = 0;
    }
  });

  return groupRef;
};
