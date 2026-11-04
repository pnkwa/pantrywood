import type { SceneStorage, StorageKind } from "@/components/scene/types";

// Measured from docs/mockups/storage-room.svg. The floor spans -5…5; walls sit at z = -5 and x = -5.

type Slot = Pick<SceneStorage, "position" | "rotationY">;

export type PlaceableLocation = { id: number; name: string; isFreezer: boolean };

const FACING_ROOM_FROM_LEFT_WALL = Math.PI / 2;

const SLOTS: Record<Exclude<StorageKind, "basket">, Slot> = {
  // Like a cozy kitchen diorama: along the back wall the fridge in the corner, then the counter and the sink counter;
  // the tall pantry shelf and the supplies cabinet against the left wall; the table set in the middle.
  fridge: { position: [-3.85, 0, -4.0], rotationY: 0 },
  // On whole grid cells (where the room snaps it), so it sits flush beside the sink counter.
  counter: { position: [0, 0, -4.0], rotationY: 0 },
  // Wall-hung pieces: a point on the back wall (x along it, y the model's origin); the room snaps them to its wall grid.
  makerShelf: { position: [4, 4.1, -4.62], rotationY: 0 },
  // Over the counter, clear of the fridge to its left.
  wallCabinet: { position: [-1, 2.7, -4.72], rotationY: 0 },
  // Toward the front of the left wall, so the fridge in the back corner stays in view over the low cabinet.
  pantryShelf: { position: [-4.3, 0, 2.5], rotationY: FACING_ROOM_FROM_LEFT_WALL },
  // Low, against the left wall beside the fridge, with the pegboard above it.
  suppliesCabinet: { position: [-4.25, 0, -1.5], rotationY: FACING_ROOM_FROM_LEFT_WALL },
  // The round table set in the middle, on the rug, with a chair either side.
  table: { position: [0, 0, 1], rotationY: 0 },
  crates: { position: [-4.1, 0, 0.7], rotationY: FACING_ROOM_FROM_LEFT_WALL },
  riceBin: { position: [2.8, 0, -0.4], rotationY: 0 },
};

// At the open end of the back wall first, then along the open front: clear of the table in the middle.
const BASKET_SLOTS: Slot[] = [
  { position: [3.9, 0, -3.6], rotationY: -0.2 },
  { position: [3.9, 0, -1.6], rotationY: 0.5 },
  { position: [2.0, 0, 4.2], rotationY: -0.4 },
  { position: [-1.5, 0, 4.2], rotationY: 0.3 },
];

const isSink = (location: Pick<PlaceableLocation, "name">) => /sink|อ่างล้าง/.test(location.name.toLowerCase());
/** Right beside the counter, on whole grid cells too, so the two tops meet as one run. */
const SINK_COUNTER_SLOT: Slot = { position: [2, 0, -4.0], rotationY: 0 };

const isFoodBin = (location: Pick<PlaceableLocation, "name">) => /rice|ข้าว|barrel|snack|crate|ขนม/.test(location.name.toLowerCase()) && !/pantry|shelf|ชั้น/.test(location.name.toLowerCase());

export const storageKindFor = (
  location: Pick<PlaceableLocation, "name" | "isFreezer">,
): StorageKind => {
  const name = location.name.toLowerCase();
  if (/maker|filament|craft|3d|wall shelf|ชั้นติดผนัง/.test(name)) return "makerShelf";
  if (/wall cabinet|cupboard|ตู้แขวน/.test(name)) return "wallCabinet";
  // The freezer lives in the fridge's top compartment.
  if (/fridge|refrigerator|ตู้เย็น/.test(name)) return "fridge";
  if (location.isFreezer || /freezer|ช่องแข็ง/.test(name)) return "fridge";
  // Before the counter and rice words: a "kitchen table" or "โต๊ะกินข้าว" is a table.
  if (/table|โต๊ะ/.test(name)) return "table";
  if (/counter|kitchen|sink|ครัว|เคาน์เตอร์|อ่างล้าง/.test(name)) return "counter";
  // Rice and snacks have no piece of their own any more: they get a pantry shelf.
  if (/pantry|shelf|ชั้น|rice|ข้าว|barrel|snack|crate|ขนม/.test(name)) return "pantryShelf";
  if (/suppl|cabinet|household|cleaning|bathroom|ของใช้/.test(name))
    return "suppliesCabinet";
  return "basket";
};

export type PlacedLocation = Pick<SceneStorage, "locationId" | "kind" | "position" | "rotationY"> & {
  /** A counter with the sink in its top (a location named for the sink). */
  sink: boolean;
};

/** Where a piece with no free slot starts; the room then moves it to the nearest free spot. */
const ROOM_MIDDLE: Slot = { position: [0, 0, 0], rotationY: 0 };

/**
 * The first piece of each kind takes its slot. More of the same kind keep their kind (two fridges
 * stay fridges) and start in that slot too; the room moves them to a free spot. The wall-hung maker
 * shelf has one spot, so extra ones become baskets.
 */
export const placeLocations = (
  locations: readonly PlaceableLocation[],
): PlacedLocation[] => {
  const usedKinds = new Set<StorageKind>();
  const hasNamedShelf = locations.some((location) => storageKindFor(location) === "pantryShelf" && !isFoodBin(location));
  const freeBasketSlots = [...BASKET_SLOTS];
  return locations.map((location) => {
    let kind = storageKindFor(location);
    // One of each wall-hung piece fits; more of them become baskets on the floor.
    if ((kind === "makerShelf" || kind === "wallCabinet") && usedKinds.has(kind)) kind = "basket";
    // Rice and snack bins only get the tall pantry shelf when there's no other: otherwise they're baskets on the floor.
    if (kind === "pantryShelf" && isFoodBin(location) && (hasNamedShelf || usedKinds.has(kind))) kind = "basket";
    const sink = kind === "counter" && isSink(location);
    const slot = kind === "basket" ? (freeBasketSlots.shift() ?? ROOM_MIDDLE) : sink ? SINK_COUNTER_SLOT : SLOTS[kind];
    usedKinds.add(kind);
    return { locationId: location.id, kind, position: slot.position, rotationY: slot.rotationY, sink };
  });
};

/** Names a new location so `storageKindFor` reads it back as the same kind. */
type AddableKind = Exclude<StorageKind, "makerShelf" | "wallCabinet">;

const NEW_STORAGE_NAMES: Record<AddableKind, string> = {
  fridge: "Fridge",
  pantryShelf: "Pantry shelf",
  counter: "Counter",
  suppliesCabinet: "Supplies cabinet",
  crates: "Snack crates",
  riceBin: "Rice bin",
  table: "Table",
  basket: "Basket",
};

export const canAddStorage = (kind: StorageKind): kind is AddableKind => kind !== "makerShelf" && kind !== "wallCabinet";

/** "Pantry shelf 2", or the next number no location uses yet. */
export const newStorageName = (kind: AddableKind, takenNames: readonly string[]) => {
  const base = NEW_STORAGE_NAMES[kind];
  const taken = new Set(takenNames.map((name) => name.toLowerCase()));
  let number = 2;
  while (taken.has(`${base} ${number}`.toLowerCase())) number++;
  return `${base} ${number}`;
};
