"use client";

import type { RefObject } from "react";
import type { SceneStorage, StorageKind } from "./types";
import { StorageTagLabel } from "./StorageTagLabel";
import { Crates } from "./storage/Crates";
import { Freezer } from "./storage/Freezer";
import { Fridge } from "./storage/Fridge";
import { MakerShelf } from "./storage/MakerShelf";
import { PantryShelf } from "./storage/PantryShelf";
import { RiceBarrel } from "./storage/RiceBarrel";
import { SuppliesCabinet } from "./storage/SuppliesCabinet";
import { WickerBasket } from "./storage/WickerBasket";

/** Height of the paper tag above each piece's origin. */
const TAG_HEIGHT: Record<StorageKind, number> = {
  fridge: 4.95,
  freezer: 2.25,
  pantryShelf: 5.3,
  suppliesCabinet: 2.95,
  makerShelf: 0.6,
  crates: 3.2,
  riceBin: 2.0,
  basket: 1.0,
};

function Piece({ storage }: { storage: SceneStorage }) {
  switch (storage.kind) {
    case "fridge":
      return <Fridge />;
    case "freezer":
      return <Freezer />;
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
}

/** One Grocy location as a piece of furniture, with its items and paper tag. */
export function Storage({
  storage,
  tagLayer,
}: {
  storage: SceneStorage;
  tagLayer?: RefObject<HTMLElement | null>;
}) {
  return (
    <group position={storage.position} rotation={[0, storage.rotationY, 0]}>
      <Piece storage={storage} />
      <StorageTagLabel tag={storage.tag} height={TAG_HEIGHT[storage.kind]} portal={tagLayer} />
    </group>
  );
}
