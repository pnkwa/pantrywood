"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { SceneStorage, StorageKind } from "./types";
import { CLICK_DRAG_TOLERANCE, type Highlight } from "./interaction";
import { itemProductIdAt } from "./items/ItemInstances";
import type { SceneOverlay } from "./overlay";
import { ToolbarAnchor } from "./ToolbarAnchor";
import { StorageTagAnchor } from "./StorageTagAnchor";
import { useSpringLift } from "./use-spring-lift";
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
/** How high a piece rises while it is carried in Decorate mode. */
const CARRY_HEIGHT = 0.35;

/** The furniture model alone; the catalog's 3D thumbnails render it too. */
export const StorageModel = ({
  kind,
  palette,
  items,
  doorOpen = false,
  shelves,
}: Pick<SceneStorage, "kind" | "items" | "shelves"> & { palette?: SceneStorage["palette"]; doorOpen?: boolean }) => {
  const look = palette ?? undefined;
  switch (kind) {
    case "fridge":
      return <Fridge doorOpen={doorOpen} palette={look} />;
    case "counter":
      return <Counter items={items} />;
    case "pantryShelf":
      return <PantryShelf items={items} palette={look} shelves={shelves} />;
    case "suppliesCabinet":
      return <SuppliesCabinet items={items} palette={look} shelves={shelves} />;
    case "makerShelf":
      return <MakerShelf items={items} />;
    case "crates":
      return <Crates items={items} palette={look} />;
    case "riceBin":
      return <RiceBarrel palette={look} />;
    case "basket":
      return <WickerBasket items={items} palette={look} />;
  }
};


type StorageProps = {
  storage: SceneStorage;
  overlay: SceneOverlay;
  highlight: Highlight;
  doorOpen: boolean;
  onHoverChange: (locationId: number | null) => void;
  onSelect: (locationId: number) => void;
  onSelectItem: (locationId: number, productId: number) => void;
  /** Off while decorating: a click then picks the piece, never an item inside it. */
  itemsPickable: boolean;
  /** Picked up in Decorate mode: it rides higher, then drops back with a bounce. */
  carried: boolean;
  /** Pressing a piece: picks it up in Decorate mode, starts a long press otherwise. */
  onPointerDown: (locationId: number) => void;
};

export const Storage = ({
  storage,
  overlay,
  highlight,
  doorOpen,
  onHoverChange,
  onSelect,
  onSelectItem,
  itemsPickable,
  carried,
  onPointerDown,
}: StorageProps) => {
  const liftRef = useSpringLift(carried ? CARRY_HEIGHT : highlight !== "none" ? LIFT_HEIGHT : 0);

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
      highlight === "selected" && itemsPickable
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
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(storage.locationId);
      }}
    >
      <mesh position={[0, hitCenterY, 0]} visible={false}>
        <boxGeometry args={[hitWidth, hitHeight, hitDepth]} />
      </mesh>
        <group ref={liftRef}>
          <StorageModel kind={storage.kind} palette={storage.palette} items={storage.items} shelves={storage.shelves} doorOpen={doorOpen} />
          <ToolbarAnchor box={HIT_BOXES[storage.kind]} highlight={doorOpen ? "none" : highlight} overlay={overlay} />
          <StorageTagAnchor
            locationId={storage.locationId}
            height={TAG_HEIGHT[storage.kind]}
            overlay={overlay}
          />
        </group>
    </group>
  );
};
