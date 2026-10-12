"use client";

import { useRef, useState, type PointerEvent, type Ref } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { CameraRig, type CameraApi, type CameraFocus } from "./CameraRig";
import { Decor } from "./Decor";
import { CLICK_DRAG_TOLERANCE, highlightFor } from "./interaction";
import type { SceneOverlay } from "./overlay";
import { Room } from "./Room";
import { Storage } from "./Storage";
import type { SceneStorage } from "./types";

const Lights = ({ shadowMapSize }: { shadowMapSize: number }) => (
  <>
    <hemisphereLight args={["#FFF3DE", "#D9BC93", 2.3]} />
    <ambientLight intensity={0.35} color="#FFF8EC" />
    <directionalLight
      position={[9, 14, 6]}
      intensity={1.5}
      color="#FFE6C2"
      castShadow
      shadow-mapSize={[shadowMapSize, shadowMapSize]}
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

type StorageRoomSceneProps = {
  storages: readonly SceneStorage[];
  cameraRef?: Ref<CameraApi>;
  overlay: SceneOverlay;
  label: string;
  hoveredLocationId: number | null;
  selectedLocationId: number | null;
  openDoorLocationId: number | null;
  focus: CameraFocus | null;
  onFocusSettled: () => void;
  onHoverChange: (locationId: number | null) => void;
  onSelectStorage: (locationId: number) => void;
  onSelectItem: (locationId: number, productId: number) => void;
  onBackgroundClick: () => void;
};

/** Renders on demand rather than every frame, to stay light on phones. */
export const StorageRoomScene = ({
  storages,
  cameraRef,
  overlay,
  label,
  hoveredLocationId,
  selectedLocationId,
  openDoorLocationId,
  focus,
  onFocusSettled,
  onHoverChange,
  onSelectStorage,
  onSelectItem,
  onBackgroundClick,
}: StorageRoomSceneProps) => {
  const pointerDown = useRef({ x: 0, y: 0 });
  // Touch devices: fewer pixels and a smaller shadow map keep the room smooth on a mid-range phone GPU.
  const [onTouchDevice] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  const rememberPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerDown.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMissed = (event: MouseEvent) => {
    const moved = Math.hypot(
      event.clientX - pointerDown.current.x,
      event.clientY - pointerDown.current.y,
    );
    if (moved <= CLICK_DRAG_TOLERANCE) onBackgroundClick();
  };

  return (
    <Canvas
      frameloop="demand"
      shadows
      flat
      dpr={onTouchDevice ? [1, 1.5] : [1, 2]}
      gl={{ antialias: true, alpha: true }}
      aria-label={label}
      role="img"
      className="touch-none"
      onPointerDown={rememberPointerDown}
      onPointerMissed={handlePointerMissed}
    >
      <CameraRig
        ref={cameraRef}
        focus={focus}
        onFocusSettled={onFocusSettled}
      />
      <Lights shadowMapSize={onTouchDevice ? 1024 : 2048} />
      <Room />
      <Decor />
      {storages.map((storage) => (
        <Storage
          key={storage.locationId}
          storage={storage}
          overlay={overlay}
          highlight={highlightFor(
            storage.locationId,
            hoveredLocationId,
            selectedLocationId,
          )}
          doorOpen={storage.locationId === openDoorLocationId}
          onHoverChange={onHoverChange}
          onSelect={onSelectStorage}
          onSelectItem={onSelectItem}
        />
      ))}
      <ContactShadows
        position={[0, -0.82, 0]}
        scale={18}
        blur={2.6}
        far={3}
        opacity={0.35}
        color="#4A3B2E"
        frames={1}
      />
    </Canvas>
  );
};
