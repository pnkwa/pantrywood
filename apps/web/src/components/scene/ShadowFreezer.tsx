"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Mesh, type Object3D } from "three";

/**
 * Draws the shadow map only when something that casts a shadow moved, appeared or vanished, instead
 * of on every redraw (camera pans, hover outlines). Each frame it sums the casters' world matrices;
 * an unchanged sum keeps last frame's shadows. A group marked `userData.shadowStill` counts as one
 * solid caster, so small idle animations inside it (the cat breathing) don't redraw shadows.
 */
export const ShadowFreezer = () => {
  const lastSignature = useRef<number | null>(null);

  useFrame(({ gl, scene }) => {
    gl.shadowMap.autoUpdate = false;
    scene.updateMatrixWorld();
    let signature = 0;
    let index = 0;
    const stack: Object3D[] = [scene];
    for (let object = stack.pop(); object; object = stack.pop()) {
      if (!object.visible) continue;
      const still = object.userData.shadowStill === true;
      if (still || (object instanceof Mesh && object.castShadow)) {
        index += 1;
        const elements = object.matrixWorld.elements;
        for (let element = 0; element < elements.length; element++) {
          signature += (elements[element] ?? 0) * (index * 17 + element + 1);
        }
      }
      if (object instanceof InstancedMesh && object.castShadow) {
        signature += (object.instanceMatrix.version + object.count) * 7919;
      }
      if (!still) stack.push(...object.children);
    }
    if (signature !== lastSignature.current) {
      lastSignature.current = signature;
      gl.shadowMap.needsUpdate = true;
    }
  });

  return null;
};
