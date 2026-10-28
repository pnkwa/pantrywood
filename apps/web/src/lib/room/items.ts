import type { PantryItem } from "@/lib/pantry/model";
import type {
  ItemMarker,
  ItemShape,
  SceneItem,
} from "@/components/scene/types";

const GROUP_COLORS: [RegExp, string][] = [
  [/dairy|egg|milk/, "#A9C9DA"],
  [/produce|veg|fruit|herb/, "#8FA67A"],
  [/meat|fish|seafood/, "#E9A9A9"],
  [/rice|grain|flour|bread|bakery/, "#D9BC93"],
  [/sauce|season|condiment|spice/, "#C8755A"],
  [/pantry|staple|canned|noodle/, "#E2B25C"],
  [/snack|sweet|candy/, "#F2D27A"],
  [/frozen/, "#C9DCE0"],
  [/drink|beverage/, "#A9C4C9"],
  [/bath|personal|beauty/, "#A9C9DA"],
  [/clean/, "#A9BC95"],
  [/laundry/, "#8FB3CC"],
  [/paper/, "#FBF6EC"],
];
const DEFAULT_COLOR = "#D9C9AE";

const FILAMENT_COLORS: [RegExp, string][] = [
  [/sage|green|เขียว/, "#8FA67A"],
  [/cream|ครีม/, "#F3E9D6"],
  [/terracotta|orange|ส้ม/, "#C8755A"],
  [/honey|yellow|เหลือง/, "#E2B25C"],
  [/blue|ฟ้า|น้ำเงิน/, "#A9C9DA"],
  [/pink|ชมพู/, "#E9A9A9"],
  [/red|แดง/, "#D9604A"],
  [/white|ขาว/, "#FFFBF3"],
  [/black|ดำ/, "#4A3B2E"],
  [/brown|wood|น้ำตาล/, "#A47551"],
];

const LID_COLORS = ["#F2D27A", "#E9A9A9", "#A9C9DA", "#8FA67A", "#FFFBF3"];

const COUNTABLE_UNITS =
  /^(pcs|piece|carton|cup|tube|jar|pack|bag|bottle|can|roll|refill|spool|box|bunch)/;

const MAX_COPIES = 3;

const colorFor = (table: [RegExp, string][], text: string): string =>
  table.find(([pattern]) => pattern.test(text.toLowerCase()))?.[1] ??
  DEFAULT_COLOR;

const lidColorFor = (productId: number): string =>
  LID_COLORS[productId % LID_COLORS.length] ?? DEFAULT_COLOR;

// Earlier rows win: "egg tofu" is tofu, not an egg.
const FRESH_SHAPES: [RegExp, ItemShape][] = [
  [/egg tofu|เต้าหู้ไข่/, "eggTofu"],
  [/tofu|เต้าหู้/, "tofu"],
  [/butter|เนย/, "butter"],
  [/shrimp|prawn|กุ้ง/, "shrimp"],
  [/dumpling|gyoza|wonton|เกี๊ยว|ขนมจีบ/, "dumplings"],
  [/edamame|ถั่วแระ/, "edamame"],
  [/noodle|ramen|มาม่า|บะหมี่/, "noodles"],
  [/\brice\b|ข้าวสาร|ข้าวเหนียว|ข้าวหอม/, "riceSack"],
  [/\beggs?\b|ไข่/, "egg"],
  [/apple|แอปเปิ้ล/, "apple"],
  [/lime|lemon|มะนาว/, "lime"],
  [/orange|tangerine|mandarin|ส้ม/, "orange"],
  [/tomato|มะเขือเทศ/, "tomato"],
  [/potato|มันฝรั่ง/, "potato"],
  [/carrot|แครอท/, "carrot"],
  [/cucumber|kyuri|แตงกวา/, "cucumber"],
  [/banana|กล้วย/, "banana"],
  [/mushroom|เห็ด/, "mushroom"],
  [/bell pepper|capsicum|พริกหวาน/, "pepper"],
  [/\bcorn\b|ข้าวโพด/, "corn"],
  [/bread|loaf|toast|ขนมปัง/, "bread"],
  [/basil|morning glory|bok choy|cabbage|lettuce|kale|spinach|greens|กะเพรา|โหระพา|ผักบุ้ง|ผัก/, "greens"],
];

// Juice in a carton or tomato sauce in a jar keeps its packaging; so do snacks named after food (shrimp crackers).
const PACKAGED_UNITS = /^(carton|can|jar|cup|bottle)/;
const SNACKS = /cracker|chip|crisp|snack|ข้าวเกรียบ/;

const freshShapeFor = (item: PantryItem): ItemShape | undefined => {
  const name = item.name.toLowerCase();
  if (PACKAGED_UNITS.test(item.unitName.toLowerCase()) || SNACKS.test(name)) return undefined;
  const shape = FRESH_SHAPES.find(([pattern]) => pattern.test(name))?.[1];
  if (shape) return shape;
  return /meat|fish|seafood/.test(item.groupName.toLowerCase()) ? "meat" : undefined;
};

const shapeFor = (item: PantryItem): ItemShape => {
  const name = item.name.toLowerCase();
  const unit = item.unitName.toLowerCase();
  if (item.kind === "supply") {
    if (/filament|spool/.test(name) || unit === "spool") return "spool";
    if (/tissue|towel|paper|toilet/.test(name) || unit === "roll") return "roll";
    if (/detergent|powder/.test(name)) return "box";
    if (/toothpaste|ยาสีฟัน/.test(name) || unit === "tube") return "toothpaste";
    return "bottle";
  }
  const fresh = freshShapeFor(item);
  if (fresh) return fresh;
  if (unit === "carton") return "carton";
  if (unit === "can") return "can";
  if (unit === "cup") return /noodle|ramen|มาม่า|บะหมี่/.test(name) ? "noodles" : "cup";
  if (unit === "bottle") return "sauceBottle";
  if (unit === "jar") return "jar";
  if (unit === "bag") return "bag";
  if (unit === "pack" || unit === "box") return "box";
  if (/produce|veg|fruit|herb/.test(item.groupName.toLowerCase())) return "bag";
  return "box";
};

const markerFor = (item: PantryItem): ItemMarker | null => {
  if (item.status === "expired") return "expired";
  if (item.status === "soon") return "soon";
  return item.isRunningLow ? "low" : null;
};

const MARKER_RANK: Record<ItemMarker, number> = { expired: 0, soon: 1, low: 2 };

/** How an item looks in the room: its model, colors and how many copies stand side by side. */
export const sceneItemFor = (item: PantryItem): SceneItem => {
  const shape = shapeFor(item);
  return {
    key: item.key,
    productId: item.productId,
    shape,
    color:
      shape === "spool"
        ? colorFor(FILAMENT_COLORS, item.name)
        : colorFor(GROUP_COLORS, item.groupName),
    accent: lidColorFor(item.productId),
    copies: COUNTABLE_UNITS.test(item.unitName.toLowerCase())
      ? Math.min(MAX_COPIES, Math.max(1, Math.round(item.amount)))
      : 1,
    marker: markerFor(item),
  };
};

/** Urgent items first so they get the front spots on the shelf. */
export const sceneItemsFor = (items: readonly PantryItem[]): SceneItem[] =>
  items
    .filter((item) => item.amount > 0)
    .map(sceneItemFor)
    .sort(
      (first, second) =>
        (first.marker ? MARKER_RANK[first.marker] : 3) -
        (second.marker ? MARKER_RANK[second.marker] : 3),
    );
