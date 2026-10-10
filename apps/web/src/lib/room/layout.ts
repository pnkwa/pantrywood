import type { SceneStorage, StorageKind } from "@/components/scene/types";

// Measured from docs/mockups/storage-room.svg. The floor spans -5…5; walls sit at z = -5 and x = -5.

type Slot = Pick<SceneStorage, "position" | "rotationY">;

export type PlaceableLocation = { id: number; name: string; isFreezer: boolean };

const FACING_ROOM_FROM_LEFT_WALL = Math.PI / 2;

const SLOTS: Record<Exclude<StorageKind, "basket">, Slot> = {
  pantryShelf: { position: [-3.2, 0, -4.3], rotationY: 0 },
  fridge: { position: [-0.3, 0, -4.0], rotationY: 0 },
  counter: { position: [2.4, 0, -4.2], rotationY: 0 },
  suppliesCabinet: {
    position: [-4.25, 0, -1.9],
    rotationY: FACING_ROOM_FROM_LEFT_WALL,
  },
  makerShelf: {
    position: [-4.62, 4.2, -1.8],
    rotationY: FACING_ROOM_FROM_LEFT_WALL,
  },
  crates: { position: [-4.1, 0, 0.7], rotationY: FACING_ROOM_FROM_LEFT_WALL },
  riceBin: { position: [2.8, 0, -0.4], rotationY: 0 },
};

const BASKET_SLOTS: Slot[] = [
  { position: [3.7, 0, 1.9], rotationY: 0.3 },
  { position: [3.9, 0, 3.9], rotationY: -0.2 },
  { position: [-3.6, 0, 3.9], rotationY: 0.5 },
  { position: [0.4, 0, 4.2], rotationY: -0.4 },
];

export const storageKindFor = (
  location: Pick<PlaceableLocation, "name" | "isFreezer">,
): StorageKind => {
  const name = location.name.toLowerCase();
  if (/maker|filament|craft|3d/.test(name)) return "makerShelf";
  // The freezer lives in the fridge's top compartment.
  if (/fridge|refrigerator|ตู้เย็น/.test(name)) return "fridge";
  if (location.isFreezer || /freezer|ช่องแข็ง/.test(name)) return "fridge";
  if (/counter|kitchen|ครัว|เคาน์เตอร์/.test(name)) return "counter";
  if (/rice|ข้าว|barrel/.test(name)) return "riceBin";
  if (/pantry|shelf|ชั้น/.test(name)) return "pantryShelf";
  if (/snack|crate|ขนม/.test(name)) return "crates";
  if (/suppl|cabinet|household|cleaning|bathroom|ของใช้/.test(name))
    return "suppliesCabinet";
  return "basket";
};

export type PlacedLocation = Pick<
  SceneStorage,
  "locationId" | "kind" | "position" | "rotationY"
>;

/** Each fixed slot is used once; extra pieces become baskets until the free spots run out. */
export const placeLocations = (
  locations: readonly PlaceableLocation[],
): PlacedLocation[] => {
  const usedKinds = new Set<StorageKind>();
  const freeBasketSlots = [...BASKET_SLOTS];
  const placed: PlacedLocation[] = [];

  for (const location of locations) {
    let kind = storageKindFor(location);
    let slot: Slot | undefined =
      kind === "basket" || usedKinds.has(kind) ? undefined : SLOTS[kind];
    if (!slot) {
      kind = "basket";
      slot = freeBasketSlots.shift();
    }
    if (!slot) continue;
    usedKinds.add(kind);
    placed.push({
      locationId: location.id,
      kind,
      position: slot.position,
      rotationY: slot.rotationY,
    });
  }
  return placed;
};
