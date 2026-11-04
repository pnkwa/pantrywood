// No "@/" imports: the room's 3D models and the inside views both read this, so a piece looks the same in both.
import type { StorageKind } from "../../components/scene/types";

type Front = { width: number; height: number };

/** Each storage piece's front in the room, in scene units: its width, and its height including any top. */
export const STORAGE_FRONTS = {
  fridge: { width: 2.2, height: 4.5 },
  pantryShelf: { width: 3, height: 5.08 },
  suppliesCabinet: { width: 2.6, height: 2.6 },
  counter: { width: 2, height: 1.96 },
};

const fronts: Partial<Record<StorageKind, Front>> = STORAGE_FRONTS;

/** The piece's front in the room, for pieces that have one. */
export const storageFront = (kind: StorageKind): Front | undefined => fronts[kind];

/** Width over height of the piece's front, or null for pieces seen from above or hung on a wall. */
export const frontRatio = (kind: StorageKind) => {
  const front = fronts[kind];
  return front ? front.width / front.height : null;
};
