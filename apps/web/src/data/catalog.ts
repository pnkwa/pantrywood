import type { Rotation, WallSide } from "@pantrywood/shared";
import type {
  DecorShape,
  FloorSurface,
  ItemShape,
  StorageKind,
  StoragePalette,
  WallSurface,
} from "@/components/scene/types";

// The Decorate catalog (DESIGN.md section 14). Names are original and brand-free.

export type CatalogStyle = "nordic" | "natural" | "japandi" | "retro";

/** Footprint in 50 cm grid cells, width × depth, before rotation. */
export type Footprint = [width: number, depth: number];

type CatalogBase = {
  id: string;
  name: string;
  style: CatalogStyle;
  footprint: Footprint;
};

/** Dresses one Grocy location. The model is one of the room's storage pieces, repainted. */
export type StorageCatalogItem = CatalogBase & {
  category: "storage";
  model: { kind: StorageKind; palette: StoragePalette };
};

/** Goes inside a shelf in the inside view (Prompt 8). Cosmetic. */
export type ShelfCatalogItem = CatalogBase & {
  category: "shelfItem";
  model: { shape: ItemShape; color: string; accent: string };
};

export type WallpaperCatalogItem = CatalogBase & { category: "wallpaper"; material: WallSurface };
export type FloorCatalogItem = CatalogBase & { category: "floor"; material: FloorSurface };

export type DecorCatalogItem = CatalogBase & {
  category: "decor";
  /** Rugs lie under furniture; wall pieces hang on the back wall; the rest stand on the floor. */
  layer: "rug" | "floor" | "wall";
  model: { shape: DecorShape; colors: [main: string, second: string] };
};

/** Sets the pegboard's color (DESIGN.md section 16). Only one board hangs in the room. */
export type BoardCatalogItem = CatalogBase & {
  category: "pegboard";
  kind: "board";
  model: { board: string; hole: string; frame: string };
};

export type AccessoryKind = "lights" | "shelf" | "penCup" | "toteHook" | "clips" | "basket" | "clock" | "stickers";

/** Hangs on the pegboard; `size` is in peg holes. */
export type AccessoryCatalogItem = CatalogBase & {
  category: "pegboard";
  kind: "accessory";
  model: { accessory: AccessoryKind; size: [w: number, h: number]; colors: [main: string, second: string] };
};

export type CatalogItem =
  | StorageCatalogItem
  | ShelfCatalogItem
  | WallpaperCatalogItem
  | FloorCatalogItem
  | DecorCatalogItem
  | BoardCatalogItem
  | AccessoryCatalogItem;

export type CatalogCategory = CatalogItem["category"];

const STORAGE_FOOTPRINTS: Partial<Record<StorageKind, Footprint>> = {
  fridge: [2, 2],
  pantryShelf: [3, 1],
  suppliesCabinet: [3, 1],
  crates: [1, 1],
  riceBin: [2, 2],
  // The round table with a chair either side.
  table: [4, 2],
  basket: [1, 1],
};

/** Cells a storage model takes up; pieces without a catalog entry use their model's own size. */
export const storageFootprint = (kind: StorageKind): Footprint =>
  STORAGE_FOOTPRINTS[kind] ?? (kind === "counter" || kind === "wallCabinet" ? [2, 2] : kind === "makerShelf" ? [2, 1] : [3, 1]);

const storage = (
  id: string,
  name: string,
  style: CatalogStyle,
  kind: StorageKind,
  [body, trim, accent]: [string, string, string],
): StorageCatalogItem => ({
  id,
  name,
  style,
  category: "storage",
  footprint: storageFootprint(kind),
  model: { kind, palette: { body, trim, accent } },
});

const shelfItem = (
  id: string,
  name: string,
  style: CatalogStyle,
  shape: ItemShape,
  color: string,
  accent: string,
): ShelfCatalogItem => ({
  id,
  name,
  style,
  category: "shelfItem",
  footprint: [0, 0],
  model: { shape, color, accent },
});

const wallpaper = (
  id: string,
  name: string,
  style: CatalogStyle,
  material: WallSurface,
): WallpaperCatalogItem => ({ id, name, style, category: "wallpaper", footprint: [0, 0], material });

const floor = (
  id: string,
  name: string,
  style: CatalogStyle,
  material: FloorSurface,
): FloorCatalogItem => ({ id, name, style, category: "floor", footprint: [0, 0], material });

const decor = (
  id: string,
  name: string,
  style: CatalogStyle,
  layer: DecorCatalogItem["layer"],
  footprint: Footprint,
  shape: DecorShape,
  colors: [string, string],
): DecorCatalogItem => ({ id, name, style, category: "decor", layer, footprint, model: { shape, colors } });

const board = (id: string, name: string, style: CatalogStyle, [boardColor, hole, frame]: [string, string, string]): BoardCatalogItem => ({
  id,
  name,
  style,
  category: "pegboard",
  kind: "board",
  footprint: [0, 0],
  model: { board: boardColor, hole, frame },
});

const accessory = (
  id: string,
  name: string,
  style: CatalogStyle,
  kind: AccessoryKind,
  size: [number, number],
  colors: [string, string],
): AccessoryCatalogItem => ({ id, name, style, category: "pegboard", kind: "accessory", footprint: [0, 0], model: { accessory: kind, size, colors } });

export const CATALOG: readonly CatalogItem[] = [
  // One retro piece per kind (more come back as a later feature; see lib/room/retired-items.ts).
  storage("retro-fridge-cream", "Retro round-top fridge", "retro", "fridge", ["#F8F4EA", "#CFC6B4", "#E6DFD0"]),
  storage("walnut-pantry-shelf", "Brown pantry shelf", "retro", "pantryShelf", ["#C9935F", "#C9935F", "#C9935F"]),
  storage("butter-open-cabinet", "Sky open cabinet", "retro", "suppliesCabinet", ["#9FCDE6", "#78B1D2", "#FFFDF8"]),
  storage("retro-counter", "Retro counter", "retro", "counter", ["#FFFDF8", "#9FCDE6", "#E0574A"]),
  storage("sky-wall-shelf", "Sky wall shelf", "retro", "makerShelf", ["#9FCDE6", "#78B1D2", "#C9935F"]),
  storage("gingham-round-table", "Oak table with a white cloth", "retro", "table", ["#C9935F", "#FFFDF8", "#9FCDE6"]),
  storage("butter-wall-cabinet", "Butter wall cabinet", "retro", "wallCabinet", ["#F4D36B", "#E9C25A", "#FFFDF8"]),
  storage("wicker-basket-set", "Wicker basket set", "japandi", "basket", ["#B98B57", "#9A7043", "#9A7043"]),

  // Shelf items
  shelfItem("pastel-jar-set", "Pastel jar set", "retro", "jar", "#F4D9D0", "#E9A9A9"),
  shelfItem("glass-spice-rack", "Glass spice rack", "nordic", "bottle", "#E1ECEE", "#A9C4C9"),
  shelfItem("linen-storage-bin", "Linen storage bin", "natural", "box", "#F1E7D4", "#D9C9AE"),
  shelfItem("seagrass-basket", "Seagrass basket", "japandi", "bag", "#D9C08C", "#B89A5E"),
  shelfItem("enamel-canister", "Enamel canister", "retro", "can", "#EEF3F6", "#C8755A"),
  shelfItem("filament-spool-set", "Filament spool set", "nordic", "spool", "#A9BC95", "#E3C9A0"),

  // Wallpaper
  wallpaper("square-tile-wainscot", "Square tile wainscot", "retro", { pattern: "wainscot", base: "#FFFDF8", line: "#DCEAF1" }),

  // Floor
  floor("cream-blue-checker", "Cream & blue checker", "retro", { pattern: "checker", base: "#FDFAF3", line: "#CFE6F2" }),

  // Decor
  decor("mushroom-lamp", "Retro floor lamp", "retro", "floor", [1, 1], "mushroomLamp", ["#F4D36B", "#FFFDF8"]),
  // The room's starting decor: owned from the start, so it can be moved, put away and placed again.
  decor("gingham-window", "Sunny window", "retro", "wall", [3, 3], "ginghamWindow", ["#9FCDE6", "#DCEFF7"]),
  decor("tomato-wall-clock", "Tomato wall clock", "retro", "wall", [1, 1], "wallClock", ["#D9604A", "#FFFBF3"]),
  decor("little-picture-frames", "Little picture frames", "natural", "wall", [2, 1], "pictureFrames", ["#A47551", "#FFFBF3"]),
  decor("butter-oval-rug", "Butter oval rug", "retro", "rug", [5, 5], "ovalRug", ["#F4D36B", "#F4D36B"]),
  decor("napping-cat", "Honey cat", "retro", "floor", [1, 1], "cat", ["#F2B33D", "#B8652E"]),
  decor("veggie-basket", "Veggie basket", "natural", "floor", [1, 1], "veggieBasket", ["#B98B57", "#9A7043"]),
  decor("pegboard", "Pegboard", "natural", "wall", [3, 3], "pegboard", ["#EAD7B2", "#A47551"]),

  // Pegboard: board colors and the accessories that hang on it (DESIGN.md section 16).
  board("oat-pegboard", "Oat pegboard", "natural", ["#EAD7B2", "#C2A87D", "#A47551"]),
  accessory("string-lights", "String lights", "retro", "lights", [24, 2], ["#F2D27A", "#6E4E33"]),
  accessory("mini-wood-shelf", "Mini wood shelf", "natural", "shelf", [8, 4], ["#A47551", "#8FA67A"]),
  accessory("pen-cup", "Pen cup", "nordic", "penCup", [2, 3], ["#A9C9DA", "#E9A9A9"]),
  accessory("tote-hook", "Tote hook", "natural", "toteHook", [4, 5], ["#A9BC95", "#7A6654"]),
  accessory("binder-clips", "Binder clips", "nordic", "clips", [3, 2], ["#4A3B2E", "#E2B25C"]),
  accessory("wire-basket", "Wire basket", "nordic", "basket", [4, 3], ["#B5CBD1", "#F7F4EE"]),
  accessory("little-clock", "Little clock", "retro", "clock", [3, 3], ["#C8755A", "#FFFBF3"]),
  accessory("sticker-sheet", "Sticker sheet", "retro", "stickers", [3, 2], ["#E2B25C", "#D9604A"]),
];

const catalogById = new Map(CATALOG.map((item) => [item.id, item]));

export const catalogItem = (id: string | null): CatalogItem | undefined =>
  id === null ? undefined : catalogById.get(id);

/** The catalog piece each storage model starts as: today's room. */
export const STARTER_STORAGE: Partial<Record<StorageKind, string>> = {
  fridge: "retro-fridge-cream",
  pantryShelf: "walnut-pantry-shelf",
  suppliesCabinet: "butter-open-cabinet",
  counter: "retro-counter",
  makerShelf: "sky-wall-shelf",
  wallCabinet: "butter-wall-cabinet",
  table: "gingham-round-table",
  basket: "wicker-basket-set",
};

export const STARTER_WALLPAPER = "square-tile-wainscot";
export const STARTER_FLOOR = "cream-blue-checker";
export const STARTER_PEGBOARD = "oat-pegboard";

/** Where the starting decor stands in a new room. Wall pieces' cells are a column and a row on the back wall. */
export const STARTER_DECOR: readonly { id: string; itemId: string; cell: [number, number]; rotation: Rotation; wall?: WallSide }[] = [
  // One focal point: the table set in the middle of the floor on the rug, the lamp's warm pool just behind it and the
  // cat at its foot. The walls keep a few calm pieces; the picture frames and veggie basket stay in the box.
  // Back wall: the window over the sink.
  { id: "starter-window", itemId: "gingham-window", cell: [5, 0], rotation: 0 },
  // Left wall: the pegboard over the low supplies cabinet, the clock between it and the pantry shelf.
  { id: "starter-pegboard", itemId: "pegboard", cell: [2, 0], rotation: 0, wall: "left" },
  { id: "starter-clock", itemId: "tomato-wall-clock", cell: [5, 1], rotation: 0, wall: "left" },
  // The floor: the rug under the table set, the cat in front of it, and the lamp behind it so it never blocks the view.
  { id: "starter-cat-rug", itemId: "butter-oval-rug", cell: [2, 3], rotation: 0 },
  { id: "starter-cat", itemId: "napping-cat", cell: [4, 7], rotation: 0 },
  { id: "starter-lamp", itemId: "mushroom-lamp", cell: [7, 2], rotation: 0 },
];
