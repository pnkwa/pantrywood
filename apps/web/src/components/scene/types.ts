export type StorageKind =
  | "fridge"
  | "counter"
  | "pantryShelf"
  | "crates"
  | "riceBin"
  | "suppliesCabinet"
  | "makerShelf"
  | "basket";

export type ItemShape =
  | "jar"
  | "can"
  | "carton"
  | "bag"
  | "box"
  | "roll"
  | "bottle"
  | "spool";

export type ItemMarker = "soon" | "expired" | "low";

export type SceneItem = {
  key: string;
  productId: number;
  shape: ItemShape;
  color: string;
  /** Lid or cap color. */
  accent: string;
  /** 1–3 copies drawn side by side. */
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
  position: [x: number, y: number, z: number];
  rotationY: number;
  items: SceneItem[];
  tag: StorageTag;
};
