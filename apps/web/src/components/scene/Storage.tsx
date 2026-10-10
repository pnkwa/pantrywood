"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { SceneStorage, StorageKind } from "./types";
import { CLICK_DRAG_TOLERANCE, type Highlight } from "./interaction";
import { itemProductIdAt } from "./items/ItemInstances";
import type { SceneOverlay } from "./overlay";
import { StorageOutline } from "./StorageOutline";
import { StorageTagAnchor } from "./StorageTagAnchor";
import { Counter } from "./storage/Counter";
import { Crates } from "./storage/Crates";
import { Fridge } from "./storage/Fridge";
import { MakerShelf } from "./storage/MakerShelf";
import { PantryShelf } from "./storage/PantryShelf";
import { RiceBarrel } from "./storage/RiceBarrel";
import { SuppliesCabinet } from "./storage/SuppliesCabinet";
import { WickerBasket } from "./storage/WickerBasket";

const TAG_HEIGHT: Record<StorageKind, number> = {
  fridge: 4.95,
  counter: 2.9,
  pantryShelf: 5.3,
  suppliesCabinet: 2.95,
  makerShelf: 0.6,
  crates: 3.2,
  riceBin: 2.0,
  basket: 1.0,
};

/** width, height, depth, center height: a fixed hit area that doesn't lift with the piece. */
const HIT_BOXES: Record<StorageKind, [number, number, number, number]> = {
  fridge: [2.2, 4.6, 1.8, 2.3],
  counter: [2.5, 2.3, 1.55, 1.15],
  pantryShelf: [3.2, 5.05, 1.25, 2.52],
  suppliesCabinet: [2.7, 2.65, 1.35, 1.32],
  makerShelf: [3, 0.6, 0.8, 0.25],
  crates: [1.45, 3.0, 1.35, 1.5],
  riceBin: [2.0, 1.75, 2.0, 0.87],
  basket: [1.25, 0.9, 1.25, 0.45],
};

const LIFT_HEIGHT = 0.15;
const LIFT_SPEED = 14;

const Piece = ({
  storage,
  doorOpen,
}: {
  storage: SceneStorage;
  doorOpen: boolean;
}) => {
  switch (storage.kind) {
    case "fridge":
      return <Fridge doorOpen={doorOpen} />;
    case "counter":
      return <Counter items={storage.items} />;
    case "pantryShelf":
      return <PantryShelf items={storage.items} />;
    case "suppliesCabinet":
      return <SuppliesCabinet items={storage.items} />;
    case "makerShelf":
      return <MakerShelf items={storage.items} />;
    case "crates":
      return <Crates items={storage.items} />;
    case "riceBin":
      return <RiceBarrel />;
    case "basket":
      return <WickerBasket items={storage.items} />;
  }
};

const useLift = (lifted: boolean) => {
  const groupRef = useRef<Group>(null);
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => invalidate(), [lifted, invalidate]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const target = lifted && !reducedMotion ? LIFT_HEIGHT : 0;
    if (group.position.y === target) return;
    group.position.y = MathUtils.damp(
      group.position.y,
      target,
      LIFT_SPEED,
      delta,
    );
    if (Math.abs(group.position.y - target) < 0.001) group.position.y = target;
    invalidate();
  });

  return groupRef;
};

type StorageProps = {
  storage: SceneStorage;
  overlay: SceneOverlay;
  highlight: Highlight;
  doorOpen: boolean;
  onHoverChange: (locationId: number | null) => void;
  onSelect: (locationId: number) => void;
  onSelectItem: (locationId: number, productId: number) => void;
};

export const Storage = ({
  storage,
  overlay,
  highlight,
  doorOpen,
  onHoverChange,
  onSelect,
  onSelectItem,
}: StorageProps) => {
  const liftRef = useLift(highlight !== "none");

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
    onHoverChange(storage.locationId);
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "";
    onHoverChange(null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta > CLICK_DRAG_TOLERANCE) return;
    // Items are tiny, so the first click opens the whole piece; items can be picked once it's selected.
    const productId =
      highlight === "selected"
        ? event.intersections
            .map((intersection) => itemProductIdAt(intersection))
            .find((candidate) => candidate !== null)
        : undefined;
    if (productId !== undefined && productId !== null) {
      onSelectItem(storage.locationId, productId);
    } else {
      onSelect(storage.locationId);
    }
  };

  const [hitWidth, hitHeight, hitDepth, hitCenterY] = HIT_BOXES[storage.kind];

  return (
    <group
      position={storage.position}
      rotation={[0, storage.rotationY, 0]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh position={[0, hitCenterY, 0]} visible={false}>
        <boxGeometry args={[hitWidth, hitHeight, hitDepth]} />
      </mesh>
        <group ref={liftRef}>
          <Piece storage={storage} doorOpen={doorOpen} />
          <StorageOutline
            locationId={storage.locationId}
            box={HIT_BOXES[storage.kind]}
            highlight={doorOpen ? "none" : highlight}
            overlay={overlay}
          />
          <StorageTagAnchor
            locationId={storage.locationId}
            height={TAG_HEIGHT[storage.kind]}
            overlay={overlay}
          />
        </group>
    </group>
  );
};
