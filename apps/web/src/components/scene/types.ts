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

/** Light surface, mid trim, dark accent: the three colors a storage model is painted with. */
export type StoragePalette = { body: string; trim: string; accent: string };

export type SceneStorage = {
  locationId: number;
  kind: StorageKind;
  /** null: the model's own colors. */
  palette: StoragePalette | null;
  position: [x: number, y: number, z: number];
  rotationY: number;
  items: SceneItem[];
  tag: StorageTag;
};

export type WallSurface = {
  pattern: "plain" | "shiplap" | "grid" | "dots" | "gingham" | "wainscot";
  base: string;
  line: string;
};

export type FloorSurface = {
  pattern: "checker" | "planks" | "tatami" | "speckle" | "tile" | "herringbone";
  base: string;
  line: string;
};

export type DecorShape =
  | "rug"
  | "roundRug"
  | "stripedRug"
  | "lantern"
  | "mushroomLamp"
  | "wallClock"
  | "catBed"
  | "ginghamWindow"
  | "pictureFrames"
  | "ovalRug"
  | "cat"
  | "maskCat"
  | "plainCat"
  | "veggieBasket"
  | "pegboard";

/** A board piece seen from the room: a flat card, placed in fractions of the board (0 to 1 from the top-left). */
export type BoardPlane = { id: string; x: number; y: number; w: number; h: number; color: string };

export type SceneDecor = {
  id: string;
  shape: DecorShape;
  colors: [main: string, second: string];
  position: [x: number, y: number, z: number];
  rotationY: number;
  /** Footprint in cells, for rugs. */
  size: [width: number, depth: number];
  /** The pegboard only: its colors and what hangs on it. */
  board?: { board: string; hole: string; frame: string; columns: number; rows: number; planes: BoardPlane[] };
};
