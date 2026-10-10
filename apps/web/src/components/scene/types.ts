/*
 * What the 3D scene draws. Plain data, already decided by src/lib/room —
 * scene components only turn it into meshes.
 */

export type StorageKind =
  | "fridge"
  | "freezer"
  | "pantryShelf"
  | "crates"
  | "riceBin"
  | "suppliesCabinet"
  | "makerShelf"
  | "basket";

export type ItemShape = "jar" | "can" | "carton" | "bag" | "box" | "roll" | "bottle" | "spool";

/** Tiny dot above an item: honey = use soon, berry = past its date, terracotta = running low. */
export type ItemMarker = "soon" | "expired" | "low";

export type SceneItem = {
  key: string;
  shape: ItemShape;
  /** Body color (category, or filament color for spools). */
  color: string;
  /** Lid / cap color. */
  accent: string;
  /** How many copies to draw (1–3). */
  copies: number;
  marker: ItemMarker | null;
};

export type StorageTag = {
  name: string;
  itemCount: number;
  useSoon: number;
  expired: number;
  low: number;
};

export type SceneStorage = {
  locationId: number;
  kind: StorageKind;
  /** Floor position in room units (the floor spans -5…5 on x and z). */
  position: [x: number, y: number, z: number];
  rotationY: number;
  items: SceneItem[];
  tag: StorageTag;
};
