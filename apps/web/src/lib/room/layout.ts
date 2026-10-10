import type { Location } from "@pantrywood/shared";
import type { SceneStorage, StorageKind } from "@/components/scene/types";

/*
 * Where each storage piece stands in the room (DESIGN.md section 7 layout, measured from
 * docs/mockups/storage-room.svg). The floor is 10 × 10 units centered on the origin;
 * the back walls are at z = -5 (right wall) and x = -5 (left wall).
 * Later (Decorate mode) this default layout moves behind the Repository interface.
 */

type Slot = Pick<SceneStorage, "position" | "rotationY">;

const FACE_RIGHT = Math.PI / 2; // against the left wall, facing +x

const SLOTS: Record<Exclude<StorageKind, "basket">, Slot> = {
  pantryShelf: { position: [-3.2, 0, -4.3], rotationY: 0 },
  fridge: { position: [-0.3, 0, -4.0], rotationY: 0 },
  freezer: { position: [2.4, 0, -4.2], rotationY: 0 },
  suppliesCabinet: { position: [-4.25, 0, -1.9], rotationY: FACE_RIGHT },
  makerShelf: { position: [-4.62, 4.2, -1.8], rotationY: FACE_RIGHT },
  crates: { position: [-4.1, 0, 0.7], rotationY: FACE_RIGHT },
  riceBin: { position: [2.8, 0, -0.4], rotationY: 0 },
};

/** Free floor spots for wicker baskets (any other location, or a second piece of the same kind). */
const BASKET_SLOTS: Slot[] = [
  { position: [3.7, 0, 1.9], rotationY: 0.3 },
  { position: [3.9, 0, 3.9], rotationY: -0.2 },
  { position: [-3.6, 0, 3.9], rotationY: 0.5 },
  { position: [0.4, 0, 4.2], rotationY: -0.4 },
];

export function storageKindFor(location: Pick<Location, "name" | "is_freezer">): StorageKind {
  const name = location.name.toLowerCase();
  if (/maker|filament|craft|3d/.test(name)) return "makerShelf";
  if (location.is_freezer === 1 || /freezer|ช่องแข็ง/.test(name)) return "freezer";
  if (/fridge|refrigerator|ตู้เย็น/.test(name)) return "fridge";
  if (/rice|ข้าว|barrel/.test(name)) return "riceBin";
  if (/pantry|shelf|ชั้น/.test(name)) return "pantryShelf";
  if (/snack|crate|ขนม/.test(name)) return "crates";
  if (/suppl|cabinet|household|cleaning|bathroom|ของใช้/.test(name)) return "suppliesCabinet";
  return "basket";
}

export type PlacedLocation = Pick<SceneStorage, "locationId" | "kind" | "position" | "rotationY">;

/**
 * Gives every location a piece of furniture and a spot. Each fixed slot is used once;
 * extra pieces become baskets. Locations beyond the free basket spots are not placed
 * (they still show in lists).
 */
export function placeLocations(locations: readonly Location[]): PlacedLocation[] {
  const used = new Set<StorageKind>();
  const baskets = [...BASKET_SLOTS];
  const placed: PlacedLocation[] = [];

  for (const location of locations) {
    if (location.active === 0) continue;
    let kind = storageKindFor(location);
    let slot: Slot | undefined = kind === "basket" || used.has(kind) ? undefined : SLOTS[kind];
    if (!slot) {
      kind = "basket";
      slot = baskets.shift();
    }
    if (!slot) continue;
    used.add(kind);
    placed.push({ locationId: location.id, kind, position: slot.position, rotationY: slot.rotationY });
  }
  return placed;
}
