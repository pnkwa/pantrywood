"use client";

import { useRef, useState, type PointerEvent, type Ref } from "react";
import { Canvas } from "@react-three/fiber";
import type { WallSide } from "@pantrywood/shared";
import { ContactShadows } from "@react-three/drei";
import { CameraRig, type CameraApi, type CameraFocus } from "./CameraRig";
import { CLICK_DRAG_TOLERANCE, highlightFor } from "./interaction";
import type { SceneOverlay } from "./overlay";
import { DecorPieces } from "./DecorPieces";
import { FloorGrid, type Footprint } from "./FloorGrid";
import { Room } from "./Room";
import { ShadowFreezer } from "./ShadowFreezer";
import { Storage } from "./Storage";
import { TagDeclutter } from "./TagDeclutter";
import type { FloorSurface, SceneDecor, SceneStorage, WallSurface } from "./types";

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
  wall: WallSurface;
  floor: FloorSurface;
  decor: readonly SceneDecor[];
  /** Decorate mode: pieces are picked for the toolbar instead of opened, and the grid shows. */
  editing: boolean;
  selectedPieceKey: string | null;
  onSelectPiece: (key: string) => void;
  onFloorClick: (x: number, z: number) => void;
  /** Sims-style carrying: pressing a piece picks it up, the floor reports where it would go, letting go drops it. */
  carrying: boolean;
  footprint: Footprint | null;
  onPiecePointerDown: (key: string) => void;
  onFloorPointerMove: (floorX: number, floorZ: number, wall: WallSide, wallAlong: number, wallY: number) => void;
  /** `tapped`: the pointer barely moved, so it was a tap rather than a camera drag. */
  onCarryEnd: (drop: boolean, tapped: boolean) => void;
  /** The pointer moved far enough to be a drag, which cancels a long press. */
  onPointerDrift: () => void;
  onOpenBoard: () => void;
  /** How urgent each storage tag is; when tags overlap, the less urgent ones shrink to a dot. */
  tagRanks: ReadonlyMap<number, number>;
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
  wall,
  floor,
  decor,
  editing,
  selectedPieceKey,
  onSelectPiece,
  onFloorClick,
  carrying,
  footprint,
  onPiecePointerDown,
  onFloorPointerMove,
  onCarryEnd,
  onOpenBoard,
  tagRanks,
  onPointerDrift,
}: StorageRoomSceneProps) => {
  const pointerDown = useRef({ x: 0, y: 0 });
  // Touch devices: fewer pixels and a smaller shadow map keep the room smooth on a mid-range phone GPU.
  const [onTouchDevice] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  const rememberPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerDown.current = { x: event.clientX, y: event.clientY };
  };

  const isTap = (event: { clientX: number; clientY: number }) =>
    Math.hypot(event.clientX - pointerDown.current.x, event.clientY - pointerDown.current.y) <= CLICK_DRAG_TOLERANCE;

  const handlePointerMissed = (event: MouseEvent) => {
    if (isTap(event)) onBackgroundClick();
  };

  return (
    <Canvas
      frameloop="demand"
      shadows="percentage"
      flat
      dpr={onTouchDevice ? [1, 1.5] : [1, 2]}
      gl={{ antialias: true, alpha: true }}
      aria-label={label}
      role="img"
      className="touch-none"
      onPointerDown={rememberPointerDown}
      onPointerMissed={handlePointerMissed}
      onPointerUp={(event) => onCarryEnd(true, isTap(event))}
      onPointerCancel={() => onCarryEnd(false, false)}
      onPointerLeave={() => onCarryEnd(false, false)}
      onPointerMove={(event) => {
        if (event.buttons !== 0 && !isTap(event)) onPointerDrift();
      }}
      // A long press picks a piece up; the phone's own long-press menu would get in the way.
      onContextMenu={(event) => event.preventDefault()}
    >
      <CameraRig
        ref={cameraRef}
        focus={focus}
        onFocusSettled={onFocusSettled}
        panLocked={carrying}
      />
      <Lights shadowMapSize={onTouchDevice ? 1024 : 2048} />
      <ShadowFreezer />
      <Room wall={wall} floor={floor} />
      {storages.map((storage) => (
        <Storage
          key={storage.locationId}
          storage={storage}
          overlay={overlay}
          highlight={
            editing
              ? selectedPieceKey === `storage:${storage.locationId}`
                ? "editing"
                : storage.locationId === hoveredLocationId && !carrying
                  ? "hover"
                  : "none"
              : highlightFor(storage.locationId, hoveredLocationId, selectedLocationId)
          }
          doorOpen={storage.locationId === openDoorLocationId}
          onHoverChange={onHoverChange}
          onSelect={editing ? (locationId) => onSelectPiece(`storage:${locationId}`) : onSelectStorage}
          onSelectItem={onSelectItem}
          itemsPickable={!editing}
          onPointerDown={(locationId) => onPiecePointerDown(`storage:${locationId}`)}
        />
      ))}
      <TagDeclutter overlay={overlay} ranks={tagRanks} />
      <DecorPieces
        decor={decor}
        overlay={overlay}
        editing={editing}
        still={openDoorLocationId !== null}
        selectedKey={selectedPieceKey}
        onSelect={onSelectPiece}
        onPointerDown={onPiecePointerDown}
        onOpenBoard={onOpenBoard}
      />
      {editing && (
        <FloorGrid footprint={footprint} onFloorClick={onFloorClick} onFloorPointerMove={onFloorPointerMove} />
      )}
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
