import type { WallSide } from "@pantrywood/shared";
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
  /** In leaves, earned from XP. */
  price: number;
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
  basket: [1, 1],
};

/** Cells a storage model takes up; pieces without a catalog entry use their model's own size. */
export const storageFootprint = (kind: StorageKind): Footprint =>
  STORAGE_FOOTPRINTS[kind] ?? (kind === "counter" ? [3, 2] : [3, 1]);

const storage = (
  id: string,
  name: string,
  style: CatalogStyle,
  kind: StorageKind,
  price: number,
  [body, trim, accent]: [string, string, string],
): StorageCatalogItem => ({
  id,
  name,
  style,
  category: "storage",
  price,
  footprint: storageFootprint(kind),
  model: { kind, palette: { body, trim, accent } },
});

const shelfItem = (
  id: string,
  name: string,
  style: CatalogStyle,
  price: number,
  shape: ItemShape,
  color: string,
  accent: string,
): ShelfCatalogItem => ({
  id,
  name,
  style,
  category: "shelfItem",
  price,
  footprint: [0, 0],
  model: { shape, color, accent },
});

const wallpaper = (
  id: string,
  name: string,
  style: CatalogStyle,
  price: number,
  material: WallSurface,
): WallpaperCatalogItem => ({ id, name, style, category: "wallpaper", price, footprint: [0, 0], material });

const floor = (
  id: string,
  name: string,
  style: CatalogStyle,
  price: number,
  material: FloorSurface,
): FloorCatalogItem => ({ id, name, style, category: "floor", price, footprint: [0, 0], material });

const decor = (
  id: string,
  name: string,
  style: CatalogStyle,
  price: number,
  layer: DecorCatalogItem["layer"],
  footprint: Footprint,
  shape: DecorShape,
  colors: [string, string],
): DecorCatalogItem => ({ id, name, style, category: "decor", price, layer, footprint, model: { shape, colors } });

const board = (id: string, name: string, style: CatalogStyle, price: number, [boardColor, hole, frame]: [string, string, string]): BoardCatalogItem => ({
  id,
  name,
  style,
  category: "pegboard",
  kind: "board",
  price,
  footprint: [0, 0],
  model: { board: boardColor, hole, frame },
});

const accessory = (
  id: string,
  name: string,
  style: CatalogStyle,
  price: number,
  kind: AccessoryKind,
  size: [number, number],
  colors: [string, string],
): AccessoryCatalogItem => ({ id, name, style, category: "pegboard", kind: "accessory", price, footprint: [0, 0], model: { accessory: kind, size, colors } });

export const CATALOG: readonly CatalogItem[] = [
  // Storage furniture. The first of each kind keeps the room's current colors.
  storage("retro-fridge-cream", "Retro round-top fridge", "retro", "fridge", 120, ["#EFDCB6", "#B8976A", "#E2CA9C"]),
  storage("retro-fridge-mint", "Retro fridge · mint", "retro", "fridge", 120, ["#C9DDBE", "#9DB98C", "#B2C9A5"]),
  storage("retro-fridge-butter", "Retro fridge · butter", "retro", "fridge", 120, ["#F2D98F", "#C9A54E", "#E3C46E"]),
  storage("slim-white-fridge", "Slim white fridge", "nordic", "fridge", 90, ["#F7F7F4", "#C9C9C2", "#DCDCD6"]),
  storage("oak-panel-fridge", "Oak-panel fridge", "japandi", "fridge", 160, ["#D6B88A", "#8C6440", "#C29F70"]),
  storage("chest-freezer-sky", "Chest freezer · sky", "retro", "fridge", 100, ["#C9DCE0", "#7FA3AA", "#A9C4C9"]),
  storage("walnut-pantry-shelf", "Walnut pantry shelf", "retro", "pantryShelf", 80, ["#A47551", "#A47551", "#6E4E33"]),
  storage("birch-cube-shelf", "Birch cube shelf", "nordic", "pantryShelf", 60, ["#DCC6A0", "#DCC6A0", "#C9AE84"]),
  storage("pine-open-shelf", "Pine open shelf", "natural", "pantryShelf", 55, ["#D2B98E", "#D2B98E", "#BDA276"]),
  storage("steel-unit-shelf", "Steel unit shelf", "natural", "pantryShelf", 70, ["#C9CAC5", "#B7B8B2", "#A9AAA4"]),
  storage("oak-ladder-shelf", "Oak ladder shelf", "japandi", "pantryShelf", 50, ["#C49770", "#C49770", "#8C6440"]),
  storage("butter-open-cabinet", "Butter open cabinet", "retro", "suppliesCabinet", 80, ["#E9C46E", "#E9C46E", "#C9A27A"]),
  storage("rattan-cabinet", "Rattan cabinet", "japandi", "suppliesCabinet", 90, ["#CFAE76", "#CFAE76", "#B8955E"]),
  storage("bamboo-drawers", "Bamboo drawers", "japandi", "suppliesCabinet", 70, ["#D6BB86", "#D6BB86", "#C2A46E"]),
  storage("mint-rolling-cart", "Mint rolling cart", "nordic", "suppliesCabinet", 40, ["#BFD6C8", "#BFD6C8", "#A6C2B1"]),
  storage("wooden-crate-stack", "Wooden crate stack", "natural", "crates", 40, ["#C49770", "#C9A27A", "#A47551"]),
  storage("enamel-bread-bin", "Enamel bread bin", "retro", "crates", 35, ["#CFDBE4", "#DCE5EC", "#B5C6D3"]),
  storage("rice-barrel", "Rice barrel", "retro", "riceBin", 60, ["#B88A5F", "#8C6A4A", "#5E4430"]),
  storage("ceramic-rice-jar", "Ceramic rice jar", "japandi", "riceBin", 45, ["#DED4C3", "#B5A68E", "#9C8B70"]),
  storage("wicker-basket-set", "Wicker basket set", "japandi", "basket", 30, ["#B98B57", "#9A7043", "#9A7043"]),

  // Shelf items
  shelfItem("pastel-jar-set", "Pastel jar set", "retro", 20, "jar", "#F4D9D0", "#E9A9A9"),
  shelfItem("ceramic-canisters", "Ceramic canisters", "japandi", 25, "jar", "#F3EEE4", "#C9B79A"),
  shelfItem("glass-spice-rack", "Glass spice rack", "nordic", 20, "bottle", "#E1ECEE", "#A9C4C9"),
  shelfItem("linen-storage-bin", "Linen storage bin", "natural", 15, "box", "#F1E7D4", "#D9C9AE"),
  shelfItem("seagrass-basket", "Seagrass basket", "japandi", 15, "bag", "#D9C08C", "#B89A5E"),
  shelfItem("enamel-canister", "Enamel canister", "retro", 15, "can", "#EEF3F6", "#C8755A"),
  shelfItem("trailing-pothos", "Trailing pothos", "natural", 20, "jar", "#8FA67A", "#5E7550"),
  shelfItem("mini-cactus-pot", "Mini cactus pot", "natural", 10, "jar", "#C8755A", "#8FA67A"),
  shelfItem("filament-spool-set", "Filament spool set", "nordic", 25, "spool", "#A9BC95", "#E3C9A0"),

  // Wallpaper
  wallpaper("cream-plaster", "Cream plaster", "natural", 30, { pattern: "plain", base: "#F3EEE4", line: "#E9E0CF" }),
  wallpaper("white-shiplap", "White shiplap", "nordic", 40, { pattern: "shiplap", base: "#FAFAF7", line: "#E6E4DC" }),
  wallpaper("washi-grid", "Washi grid", "japandi", 45, { pattern: "grid", base: "#FBF7EE", line: "#E3D8C2" }),
  wallpaper("sage-limewash", "Sage limewash", "japandi", 40, { pattern: "plain", base: "#DCE3D3", line: "#CFD8C4" }),
  wallpaper("daisy-dots", "Daisy dots", "retro", 45, { pattern: "dots", base: "#F7EFE1", line: "#E9C46E" }),
  wallpaper("blue-gingham", "Blue gingham", "retro", 45, { pattern: "gingham", base: "#FFFBF3", line: "#8FB3CC" }),
  wallpaper("square-tile-wainscot", "Square tile wainscot", "retro", 50, { pattern: "wainscot", base: "#F7EFE1", line: "#DCE3DD" }),

  // Floor
  floor("cream-blue-checker", "Cream & blue checker", "retro", 50, { pattern: "checker", base: "#F3E7CF", line: "#D3E2E6" }),
  floor("light-oak-planks", "Light oak planks", "nordic", 55, { pattern: "planks", base: "#E6CFA6", line: "#D8BE90" }),
  floor("tatami", "Tatami", "japandi", 60, { pattern: "tatami", base: "#D9D2A0", line: "#C2B87E" }),
  floor("cork", "Cork", "natural", 45, { pattern: "speckle", base: "#D9B68A", line: "#B48E5E" }),
  floor("terracotta-tile", "Terracotta tile", "natural", 55, { pattern: "tile", base: "#D08B6E", line: "#E8C3AE" }),
  floor("walnut-herringbone", "Walnut herringbone", "natural", 70, { pattern: "herringbone", base: "#8C6440", line: "#6E4E33" }),

  // Decor
  decor("butter-blush-rug", "Butter & blush rug", "retro", 50, "rug", [3, 3], "rug", ["#F4DFA6", "#E9A9A9"]),
  decor("jute-round-rug", "Jute round rug", "natural", 40, "rug", [2, 2], "roundRug", ["#D9B183", "#C49770"]),
  decor("striped-cotton-rug", "Striped cotton rug", "nordic", 40, "rug", [3, 2], "stripedRug", ["#F1E7D4", "#A9C4C9"]),
  decor("paper-lantern", "Paper lantern", "japandi", 30, "floor", [1, 1], "lantern", ["#FFF3D6", "#C9B79A"]),
  decor("mushroom-lamp", "Mushroom lamp", "retro", 35, "floor", [1, 1], "mushroomLamp", ["#E9A9A9", "#FFFBF3"]),
  decor("red-rim-wall-clock", "Red-rim wall clock", "retro", 25, "wall", [1, 1], "wallClock", ["#C8755A", "#FFFBF3"]),
  decor("oak-wall-clock", "Oak wall clock", "japandi", 25, "wall", [1, 1], "wallClock", ["#C49770", "#FFFBF3"]),
  decor("sleepy-cat-bed", "Sleepy cat bed", "natural", 45, "floor", [1, 1], "catBed", ["#C9B79A", "#E9A9A9"]),
  // The room's starting decor: owned from the start, so it can be moved, put away and placed again.
  decor("gingham-window", "Gingham window", "retro", 60, "wall", [3, 3], "ginghamWindow", ["#A47551", "#DCEBEE"]),
  decor("tomato-wall-clock", "Tomato wall clock", "retro", 25, "wall", [1, 1], "wallClock", ["#D9604A", "#FFFBF3"]),
  decor("little-picture-frames", "Little picture frames", "natural", 30, "wall", [2, 1], "pictureFrames", ["#A47551", "#FFFBF3"]),
  decor("butter-oval-rug", "Butter oval rug", "retro", 60, "rug", [5, 5], "ovalRug", ["#F2D9A0", "#EDC9C2"]),
  decor("napping-cat", "Honey cat", "retro", 40, "floor", [1, 1], "cat", ["#F2B33D", "#B8652E"]),
  decor("cocoa-mask-cat", "Cocoa mask cat", "nordic", 45, "floor", [1, 1], "maskCat", ["#F1EAE0", "#4F443D"]),
  decor("midnight-cat", "Midnight cat", "japandi", 45, "floor", [1, 1], "plainCat", ["#2B2622", "#E8A21A"]),
  decor("veggie-basket", "Veggie basket", "natural", 20, "floor", [1, 1], "veggieBasket", ["#B98B57", "#9A7043"]),
  decor("pegboard", "Pegboard", "natural", 0, "wall", [3, 3], "pegboard", ["#EAD7B2", "#A47551"]),

  // Pegboard: board colors and the accessories that hang on it (DESIGN.md section 16).
  board("oat-pegboard", "Oat pegboard", "natural", 0, ["#EAD7B2", "#C2A87D", "#A47551"]),
  board("sage-pegboard", "Sage pegboard", "japandi", 40, ["#CFDABF", "#9DB08A", "#7E9A68"]),
  board("white-pegboard", "White pegboard", "nordic", 40, ["#F7F3EC", "#D9D2C4", "#C9B79A"]),
  board("walnut-pegboard", "Walnut pegboard", "natural", 50, ["#8C6440", "#5E4430", "#5E4430"]),
  accessory("string-lights", "String lights", "retro", 35, "lights", [24, 2], ["#F2D27A", "#6E4E33"]),
  accessory("mini-wood-shelf", "Mini wood shelf", "natural", 30, "shelf", [8, 4], ["#A47551", "#8FA67A"]),
  accessory("pen-cup", "Pen cup", "nordic", 15, "penCup", [2, 3], ["#A9C9DA", "#E9A9A9"]),
  accessory("tote-hook", "Tote hook", "natural", 25, "toteHook", [4, 5], ["#A9BC95", "#7A6654"]),
  accessory("binder-clips", "Binder clips", "nordic", 10, "clips", [3, 2], ["#4A3B2E", "#E2B25C"]),
  accessory("wire-basket", "Wire basket", "nordic", 30, "basket", [4, 3], ["#B5CBD1", "#F7F4EE"]),
  accessory("little-clock", "Little clock", "retro", 25, "clock", [3, 3], ["#C8755A", "#FFFBF3"]),
  accessory("sticker-sheet", "Sticker sheet", "retro", 15, "stickers", [3, 2], ["#E2B25C", "#D9604A"]),
];

const catalogById = new Map(CATALOG.map((item) => [item.id, item]));

export const catalogItem = (id: string | null): CatalogItem | undefined =>
  id === null ? undefined : catalogById.get(id);

/** The catalog piece each storage model starts as: today's room. */
export const STARTER_STORAGE: Partial<Record<StorageKind, string>> = {
  fridge: "retro-fridge-cream",
  pantryShelf: "walnut-pantry-shelf",
  suppliesCabinet: "butter-open-cabinet",
  crates: "wooden-crate-stack",
  riceBin: "rice-barrel",
  basket: "wicker-basket-set",
};

export const STARTER_WALLPAPER = "square-tile-wainscot";
export const STARTER_FLOOR = "cream-blue-checker";
export const STARTER_PEGBOARD = "oat-pegboard";
// shortcut: a mock 1000 leaves to try the shop with, until earning leaves from XP exists.
export const STARTER_LEAVES = 1000;

/** Where the starting decor stands in a new room. Wall pieces' cells are a column and a row on the back wall. */
export const STARTER_DECOR: readonly { id: string; itemId: string; cell: [number, number]; rotation: 0; wall?: WallSide }[] = [
  { id: "starter-window", itemId: "gingham-window", cell: [6, 1], rotation: 0 },
  { id: "starter-clock", itemId: "tomato-wall-clock", cell: [9, 1], rotation: 0 },
  { id: "starter-frames", itemId: "little-picture-frames", cell: [4, 0], rotation: 0 },
  { id: "starter-cat-rug", itemId: "butter-oval-rug", cell: [2, 4], rotation: 0 },
  { id: "starter-cat", itemId: "napping-cat", cell: [3, 6], rotation: 0 },
  { id: "starter-basket", itemId: "veggie-basket", cell: [6, 8], rotation: 0 },
  // Toward the front of the left wall, clear of the supplies cabinet, maker shelf and crates.
  { id: "starter-pegboard", itemId: "pegboard", cell: [7, 0], rotation: 0, wall: "left" },
];

export type RoomTheme = {
  id: string;
  name: string;
  description: string;
  wallpaper: string;
  floor: string;
  /** Storage model → catalog piece; models it doesn't mention keep their style. */
  storage: Partial<Record<StorageKind, string>>;
};

export const ROOM_THEMES: readonly RoomTheme[] = [
  {
    id: "retro-pantry",
    name: "Retro pantry",
    description: "Checker tile, gingham, cream fridge",
    wallpaper: "blue-gingham",
    floor: "cream-blue-checker",
    storage: { fridge: "retro-fridge-cream", pantryShelf: "walnut-pantry-shelf", suppliesCabinet: "butter-open-cabinet", riceBin: "rice-barrel", crates: "enamel-bread-bin" },
  },
  {
    id: "japandi-calm",
    name: "Japandi calm",
    description: "Washi walls, tatami, oak and rattan",
    wallpaper: "washi-grid",
    floor: "tatami",
    storage: { fridge: "oak-panel-fridge", pantryShelf: "oak-ladder-shelf", suppliesCabinet: "rattan-cabinet", riceBin: "ceramic-rice-jar", crates: "wooden-crate-stack" },
  },
  {
    id: "natural-minimal",
    name: "Natural minimal",
    description: "Plaster, cork, pine and steel",
    wallpaper: "cream-plaster",
    floor: "cork",
    storage: { fridge: "slim-white-fridge", pantryShelf: "pine-open-shelf", suppliesCabinet: "bamboo-drawers", riceBin: "rice-barrel", crates: "wooden-crate-stack" },
  },
  {
    id: "nordic-bright",
    name: "Nordic bright",
    description: "White shiplap, light oak, birch",
    wallpaper: "white-shiplap",
    floor: "light-oak-planks",
    storage: { fridge: "slim-white-fridge", pantryShelf: "birch-cube-shelf", suppliesCabinet: "mint-rolling-cart", riceBin: "rice-barrel", crates: "wooden-crate-stack" },
  },
];
