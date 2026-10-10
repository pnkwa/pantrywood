"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import type { SceneOverlay } from "./overlay";

const TAG_DEPTH_LAYERS = 20;

type StorageTagAnchorProps = {
  locationId: number;
  height: number;
  overlay: SceneOverlay;
};

/** Pins the storage's DOM tag above the piece, nearer pieces on top. */
export const StorageTagAnchor = ({ locationId, height, overlay }: StorageTagAnchorProps) => {
  const groupRef = useRef<Group>(null);
  const [projected] = useState(() => new Vector3());
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useFrame(() => {
    const group = groupRef.current;
    const tag = overlay.tags.get(locationId);
    if (!group || !tag) return;
    group.getWorldPosition(projected).project(camera);
    const x = ((projected.x + 1) / 2) * size.width;
    const y = ((1 - projected.y) / 2) * size.height;
    tag.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    tag.style.zIndex = String(Math.round(((1 - projected.z) / 2) * TAG_DEPTH_LAYERS));
    tag.style.visibility = "visible";
  });

  return <group ref={groupRef} position={[0, height, 0]} />;
};
