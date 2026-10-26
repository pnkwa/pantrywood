// No "@/" imports: scripts/inside-layout.test.mjs runs this file directly with Node.
import type { ItemIconName } from "../../components/inside/item-icons";

type IconSubject = {
  name: string;
  thaiName: string | null;
  groupName: string;
  unitName: string;
  inFreezer: boolean;
};

// First match wins, so the specific names come before the broad ones.
const BY_NAME: [RegExp, ItemIconName][] = [
  [/fish sauce|น้ำปลา/, "fishSauce"],
  [/soy|oyster sauce|ซีอิ๊ว|ซอสหอย/, "soySauce"],
  [/chili paste|chili sauce|sriracha|ketchup|mayo|ซอสพริก|น้ำพริก/, "squeezeSauce"],
  [/oil|น้ำมัน/, "cookingOil"],
  [/water|น้ำดื่ม/, "water"],
  [/juice|น้ำผลไม้/, "juice"],
  [/milk carton|uht|นมกล่อง/, "milkCarton"],
  [/milk|yogurt|นม|โยเกิร์ต/, "milkBottle"],
  [/salt|เกลือ/, "saltShaker"],
  [/pepper|พริกไทย/, "pepperGrinder"],
  [/chili|chilli|พริก/, "chiliFlakes"],
  [/sugar|น้ำตาล/, "sugarJar"],
  [/spice|curry|cumin|cinnamon|เครื่องเทศ|ผงกะหรี่/, "spiceTin"],
  [/egg|ไข่/, "eggCarton"],
  [/cereal|oat|granola|ซีเรียล/, "cereal"],
  [/pasta|spaghetti|noodle|บะหมี่|เส้น/, "pasta"],
  [/tea|coffee|ชา|กาแฟ/, "tea"],
  [/tissue|towel|toilet|ทิชชู่|กระดาษ/, "tissueBox"],
  [/rice|ข้าวสาร|ข้าวหอม|ข้าวเหนียว/, "riceSack"],
  [/snack|chip|cracker|cookie|seaweed|ขนม|สาหร่าย|ข้าวเกรียบ/, "snackBag"],
];

const BY_GROUP: [RegExp, ItemIconName][] = [
  [/frozen/, "frozenBag"],
  [/dairy/, "milkBottle"],
  [/produce|veg|fruit|herb/, "tote"],
  [/meat|fish|seafood/, "plasticBag"],
  [/sauce|season|condiment/, "squeezeSauce"],
  [/snack|sweet/, "snackBag"],
  [/grain|rice|bread|bakery/, "paperBag"],
  [/bath|personal|clean|laundry/, "tissueBox"],
  [/drink|beverage/, "water"],
];

const BY_UNIT: [RegExp, ItemIconName][] = [
  [/bottle/, "water"],
  [/carton/, "milkCarton"],
  [/jar|cup/, "sugarJar"],
  [/can|tin/, "spiceTin"],
  [/bag|pack/, "snackBag"],
  [/box/, "cereal"],
];

const firstMatch = (table: [RegExp, ItemIconName][], text: string) =>
  table.find(([pattern]) => pattern.test(text))?.[1];

/** The default picture for an item without its own: from its name, then its Grocy product group, then its unit. */
export const iconFor = (item: IconSubject): ItemIconName =>
  firstMatch(BY_NAME, `${item.name} ${item.thaiName ?? ""}`.toLowerCase()) ??
  (item.inFreezer ? "frozenBag" : undefined) ??
  firstMatch(BY_GROUP, item.groupName.toLowerCase()) ??
  firstMatch(BY_UNIT, item.unitName.toLowerCase()) ??
  "paperBag";
