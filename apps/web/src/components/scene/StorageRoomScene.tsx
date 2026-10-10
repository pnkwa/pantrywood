"use client";

import type { Ref, RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { CameraRig, type CameraApi } from "./CameraRig";
import { Decor } from "./Decor";
import { Room } from "./Room";
import { Storage } from "./Storage";
import type { SceneStorage } from "./types";

/*
 * The storage-room diorama. Draws only what it is given; it knows nothing about Grocy.
 * Renders on demand (no constant 60 FPS loop) to stay light on phones.
 */

function Lights() {
  return (
    <>
      <hemisphereLight args={["#FFF3DE", "#D9BC93", 2.3]} />
      <ambientLight intensity={0.35} color="#FFF8EC" />
      <directionalLight
        position={[9, 14, 6]}
        intensity={1.5}
        color="#FFE6C2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}

export function StorageRoomScene({
  storages,
  cameraRef,
  tagLayer,
  label,
}: {
  storages: readonly SceneStorage[];
  cameraRef?: Ref<CameraApi>;
  /** DOM layer over the canvas that holds the paper tags. */
  tagLayer?: RefObject<HTMLElement | null>;
  label: string;
}) {
  return (
    <Canvas
      frameloop="demand"
      shadows
      flat
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      aria-label={label}
      role="img"
      className="touch-none"
    >
      <CameraRig ref={cameraRef} />
      <Lights />
      <Room />
      <Decor />
      {storages.map((storage) => (
        <Storage key={storage.locationId} storage={storage} tagLayer={tagLayer} />
      ))}
      <ContactShadows position={[0, -0.82, 0]} scale={18} blur={2.6} far={3} opacity={0.35} color="#4A3B2E" frames={1} />
    </Canvas>
  );
}
