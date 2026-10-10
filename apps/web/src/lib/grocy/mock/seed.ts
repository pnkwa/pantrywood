import {
  NEVER_EXPIRES_DATE,
  THAI_NAME_USERFIELD,
  toIsoDate,
  type CurrentStock,
  type Location,
  type Product,
  type ProductBarcode,
  type ProductGroup,
  type QuantityUnit,
  type ShoppingListItem,
  type ShoppingLocation,
  type StockEntry,
} from "@pantrywood/shared";

export const locations: Location[] = [
  { id: 1, name: "Fridge", description: "Retro cream fridge", is_freezer: 0 },
  { id: 2, name: "Counter", description: "Kitchen counter", is_freezer: 0 },
  {
    id: 3,
    name: "Pantry Shelf",
    description: "Wooden shelf of jars and cans",
    is_freezer: 0,
  },
  {
    id: 4,
    name: "Snack Box",
    description: "Stacked wooden crates",
    is_freezer: 0,
  },
  { id: 5, name: "Rice Bin", description: "Wooden rice barrel", is_freezer: 0 },
  {
    id: 6,
    name: "Home Supplies",
    description: "Open supplies cabinet",
    is_freezer: 0,
  },
  {
    id: 7,
    name: "Freezer",
    description: "Top compartment of the fridge",
    is_freezer: 1,
  },
];

export const shoppingLocations: ShoppingLocation[] = [
  { id: 1, name: "Fresh market" },
  { id: 2, name: "Night market" },
  { id: 3, name: "Supermarket" },
  { id: 4, name: "Corner shop" },
];

export const productGroups: ProductGroup[] = [
  { id: 1, name: "Dairy & eggs" },
  { id: 2, name: "Produce" },
  { id: 3, name: "Meat & fish" },
  { id: 4, name: "Rice & grains" },
  { id: 5, name: "Pantry staples" },
  { id: 6, name: "Sauces & seasoning" },
  { id: 7, name: "Snacks" },
  { id: 8, name: "Frozen" },
  { id: 9, name: "Bathroom" },
  { id: 10, name: "Cleaning" },
  { id: 11, name: "Laundry" },
  { id: 12, name: "Paper goods" },
  { id: 13, name: "Maker supplies" },
];

type Unit =
  | "pcs"
  | "carton"
  | "bunch"
  | "cup"
  | "tube"
  | "jar"
  | "pack"
  | "bag"
  | "bottle"
  | "can"
  | "kg"
  | "roll"
  | "refill"
  | "spool";

const UNITS: Record<Unit, QuantityUnit> = {
  pcs: { id: 1, name: "pcs", name_plural: "pcs" },
  carton: { id: 2, name: "carton", name_plural: "cartons" },
  bunch: { id: 3, name: "bunch", name_plural: "bunches" },
  cup: { id: 4, name: "cup", name_plural: "cups" },
  tube: { id: 5, name: "tube", name_plural: "tubes" },
  jar: { id: 6, name: "jar", name_plural: "jars" },
  pack: { id: 7, name: "pack", name_plural: "packs" },
  bag: { id: 8, name: "bag", name_plural: "bags" },
  bottle: { id: 9, name: "bottle", name_plural: "bottles" },
  can: { id: 10, name: "can", name_plural: "cans" },
  kg: { id: 11, name: "kg", name_plural: "kg" },
  roll: { id: 12, name: "roll", name_plural: "rolls" },
  refill: { id: 13, name: "refill", name_plural: "refills" },
  spool: { id: 14, name: "spool", name_plural: "spools" },
};

export const quantityUnits: QuantityUnit[] = Object.values(UNITS);

/** amount, best-before in days from today (null = never expires), opened */
type Batch = [
  amount: number,
  bestBeforeInDays: number | null,
  opened?: boolean,
];

type Seed = {
  name: string;
  thai: string;
  group: number;
  location: number;
  unit: Unit;
  /** -1 = never expires */
  shelfLife: number;
  minStock?: number;
  price: number;
  barcode?: string;
  batches: Batch[];
};

const food: Seed[] = [
  {
    name: "Fresh milk",
    thai: "นมสด",
    group: 1,
    location: 1,
    unit: "carton",
    shelfLife: 10,
    minStock: 1,
    price: 52,
    barcode: "885000000001",
    batches: [[1, 2]],
  },
  {
    name: "Eggs",
    thai: "ไข่ไก่",
    group: 1,
    location: 1,
    unit: "pcs",
    shelfLife: 21,
    minStock: 6,
    price: 4.2,
    batches: [[4, 12]],
  },
  {
    name: "Greek yogurt",
    thai: "โยเกิร์ต",
    group: 1,
    location: 1,
    unit: "cup",
    shelfLife: 14,
    price: 35,
    barcode: "885000000002",
    batches: [
      [1, 6, true],
      [1, 9],
    ],
  },
  {
    name: "Egg tofu",
    thai: "เต้าหู้ไข่",
    group: 1,
    location: 1,
    unit: "tube",
    shelfLife: 10,
    price: 15,
    batches: [[1, -1]],
  },
  {
    name: "Butter",
    thai: "เนย",
    group: 1,
    location: 1,
    unit: "pack",
    shelfLife: 60,
    price: 89,
    barcode: "885000000003",
    batches: [[1, 41, true]],
  },
  {
    name: "Thai basil",
    thai: "โหระพา",
    group: 2,
    location: 1,
    unit: "bunch",
    shelfLife: 5,
    price: 10,
    batches: [[1, 3]],
  },
  {
    name: "Morning glory",
    thai: "ผักบุ้ง",
    group: 2,
    location: 1,
    unit: "bunch",
    shelfLife: 4,
    price: 15,
    batches: [[2, 1]],
  },
  {
    name: "Kyuri cucumber",
    thai: "แตงกวาญี่ปุ่น",
    group: 2,
    location: 1,
    unit: "pcs",
    shelfLife: 14,
    minStock: 6,
    price: 4,
    batches: [
      [2, 4],
      [4, 12],
    ],
  },
  {
    name: "Lime",
    thai: "มะนาว",
    group: 2,
    location: 1,
    unit: "pcs",
    shelfLife: 14,
    price: 3,
    batches: [[5, 9]],
  },
  {
    name: "Kimchi",
    thai: "กิมจิ",
    group: 6,
    location: 1,
    unit: "jar",
    shelfLife: 60,
    price: 120,
    barcode: "885000000004",
    batches: [[1, 38, true]],
  },
  {
    name: "Chicken breast",
    thai: "อกไก่",
    group: 3,
    location: 1,
    unit: "pack",
    shelfLife: 3,
    price: 65,
    batches: [
      [1, 0],
      [1, -2],
    ],
  },
  {
    name: "Frozen dumplings",
    thai: "เกี๊ยวซ่าแช่แข็ง",
    group: 8,
    location: 7,
    unit: "bag",
    shelfLife: 90,
    price: 99,
    barcode: "885000000005",
    batches: [[2, 64]],
  },
  {
    name: "Minced pork",
    thai: "หมูสับ",
    group: 3,
    location: 7,
    unit: "pack",
    shelfLife: 60,
    price: 59,
    batches: [[2, 30]],
  },
  {
    name: "Shrimp",
    thai: "กุ้ง",
    group: 3,
    location: 7,
    unit: "bag",
    shelfLife: 90,
    price: 189,
    batches: [[1, 75]],
  },
  {
    name: "Vanilla ice cream",
    thai: "ไอศกรีมวานิลลา",
    group: 8,
    location: 7,
    unit: "cup",
    shelfLife: 120,
    price: 45,
    barcode: "885000000006",
    batches: [[3, 100]],
  },
  {
    name: "Frozen edamame",
    thai: "ถั่วแระญี่ปุ่น",
    group: 8,
    location: 7,
    unit: "bag",
    shelfLife: 180,
    price: 69,
    batches: [[1, -5]],
  },
  {
    name: "Fish sauce",
    thai: "น้ำปลา",
    group: 6,
    location: 3,
    unit: "bottle",
    shelfLife: 540,
    minStock: 1,
    price: 32,
    barcode: "885000000007",
    batches: [
      [1, 300, true],
      [1, 520],
    ],
  },
  {
    name: "Oyster sauce",
    thai: "ซอสหอยนางรม",
    group: 6,
    location: 3,
    unit: "bottle",
    shelfLife: 365,
    price: 45,
    barcode: "885000000008",
    batches: [[1, 210, true]],
  },
  {
    name: "Soy sauce",
    thai: "ซีอิ๊วขาว",
    group: 6,
    location: 3,
    unit: "bottle",
    shelfLife: 540,
    price: 38,
    batches: [[1, 400]],
  },
  {
    name: "Chili paste",
    thai: "น้ำพริกเผา",
    group: 6,
    location: 3,
    unit: "jar",
    shelfLife: 180,
    price: 55,
    batches: [[1, 2, true]],
  },
  {
    name: "Coconut milk",
    thai: "กะทิ",
    group: 5,
    location: 3,
    unit: "can",
    shelfLife: 365,
    price: 28,
    barcode: "885000000009",
    batches: [[3, 250]],
  },
  {
    name: "Canned tuna",
    thai: "ทูน่ากระป๋อง",
    group: 5,
    location: 3,
    unit: "can",
    shelfLife: 730,
    price: 35,
    barcode: "885000000010",
    batches: [[4, 600]],
  },
  {
    name: "Instant noodles",
    thai: "บะหมี่กึ่งสำเร็จรูป",
    group: 5,
    location: 3,
    unit: "pack",
    shelfLife: 180,
    minStock: 5,
    price: 7,
    barcode: "885000000011",
    batches: [[3, 120]],
  },
  {
    name: "Palm sugar",
    thai: "น้ำตาลมะพร้าว",
    group: 5,
    location: 3,
    unit: "jar",
    shelfLife: 365,
    price: 40,
    batches: [[1, 180, true]],
  },
  {
    name: "Seaweed snack",
    thai: "สาหร่ายทอด",
    group: 7,
    location: 4,
    unit: "pack",
    shelfLife: 120,
    price: 29,
    barcode: "885000000012",
    batches: [
      [2, 3],
      [3, 90],
    ],
  },
  {
    name: "Shrimp crackers",
    thai: "ข้าวเกรียบกุ้ง",
    group: 7,
    location: 4,
    unit: "bag",
    shelfLife: 90,
    price: 20,
    batches: [[1, 45, true]],
  },
  {
    name: "Dried mango",
    thai: "มะม่วงอบแห้ง",
    group: 7,
    location: 4,
    unit: "bag",
    shelfLife: 120,
    price: 85,
    batches: [[1, -3]],
  },
  {
    name: "Oat cookies",
    thai: "คุกกี้ข้าวโอ๊ต",
    group: 7,
    location: 4,
    unit: "pack",
    shelfLife: 60,
    price: 49,
    barcode: "885000000013",
    batches: [[2, 25]],
  },
  {
    name: "Jasmine rice",
    thai: "ข้าวหอมมะลิ",
    group: 4,
    location: 5,
    unit: "kg",
    shelfLife: 365,
    minStock: 2,
    price: 45,
    batches: [[1.5, 200]],
  },
  {
    name: "Sticky rice",
    thai: "ข้าวเหนียว",
    group: 4,
    location: 5,
    unit: "kg",
    shelfLife: 365,
    price: 40,
    batches: [[2, 280]],
  },
  {
    name: "Sourdough loaf",
    thai: "ขนมปังซาวร์โดว์",
    group: 4,
    location: 2,
    unit: "pack",
    shelfLife: 5,
    price: 120,
    batches: [[1, 2]],
  },
  {
    name: "Bananas",
    thai: "กล้วยหอม",
    group: 2,
    location: 2,
    unit: "pcs",
    shelfLife: 6,
    price: 8,
    batches: [[4, 4]],
  },
  {
    name: "Coffee beans",
    thai: "เมล็ดกาแฟ",
    group: 5,
    location: 2,
    unit: "bag",
    shelfLife: 120,
    minStock: 1,
    price: 290,
    barcode: "885000000018",
    batches: [[1, 60, true]],
  },
];
const supplies: Seed[] = [
  {
    name: "Tissue rolls",
    thai: "กระดาษทิชชู่",
    group: 12,
    location: 6,
    unit: "roll",
    shelfLife: -1,
    minStock: 6,
    price: 12,
    barcode: "885000000014",
    batches: [[4, null]],
  },
  {
    name: "Kitchen towels",
    thai: "กระดาษอเนกประสงค์",
    group: 12,
    location: 6,
    unit: "roll",
    shelfLife: -1,
    minStock: 2,
    price: 25,
    batches: [[3, null]],
  },
  {
    name: "Shampoo",
    thai: "แชมพู",
    group: 9,
    location: 6,
    unit: "bottle",
    shelfLife: -1,
    minStock: 1,
    price: 159,
    barcode: "885000000015",
    batches: [
      [1, null, true],
      [1, null],
    ],
  },
  {
    name: "Body wash",
    thai: "สบู่เหลว",
    group: 9,
    location: 6,
    unit: "bottle",
    shelfLife: -1,
    minStock: 1,
    price: 129,
    batches: [],
  },
  {
    name: "Toothpaste",
    thai: "ยาสีฟัน",
    group: 9,
    location: 6,
    unit: "tube",
    shelfLife: -1,
    minStock: 2,
    price: 65,
    barcode: "885000000016",
    batches: [[1, null, true]],
  },
  {
    name: "Dish soap",
    thai: "น้ำยาล้างจาน",
    group: 10,
    location: 6,
    unit: "refill",
    shelfLife: -1,
    minStock: 1,
    price: 39,
    barcode: "885000000017",
    batches: [[2, null]],
  },
  {
    name: "Laundry detergent",
    thai: "ผงซักฟอก",
    group: 11,
    location: 6,
    unit: "refill",
    shelfLife: -1,
    minStock: 1,
    price: 119,
    batches: [[1, null]],
  },
  {
    name: "PLA filament, sage green",
    thai: "เส้นพลาสติก PLA สีเขียวเสจ",
    group: 13,
    location: 6,
    unit: "spool",
    shelfLife: -1,
    minStock: 1,
    price: 590,
    batches: [[2, null]],
  },
  {
    name: "PLA filament, cream",
    thai: "เส้นพลาสติก PLA สีครีม",
    group: 13,
    location: 6,
    unit: "spool",
    shelfLife: -1,
    minStock: 1,
    price: 590,
    batches: [[1, null, true]],
  },
  {
    name: "PLA filament, terracotta",
    thai: "เส้นพลาสติก PLA สีส้มอิฐ",
    group: 13,
    location: 6,
    unit: "spool",
    shelfLife: -1,
    minStock: 1,
    price: 590,
    batches: [],
  },
];

const seeds = [...food, ...supplies];

const toEan13 = (twelveDigits: string): string => {
  const sum = [...twelveDigits].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return twelveDigits + ((10 - (sum % 10)) % 10);
};

const daysFromToday = (days: number, today: Date): string => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

export type MockDatabase = {
  locations: Location[];
  product_groups: ProductGroup[];
  quantity_units: QuantityUnit[];
  products: Product[];
  stock: StockEntry[];
  product_barcodes: ProductBarcode[];
  shopping_list: ShoppingListItem[];
  shopping_locations: ShoppingLocation[];
};

// Dates are relative to today, so "use soon" and "past its date" stay true whenever the app runs.
export const buildMockDatabase = (today = new Date()): MockDatabase => {
  const products: Product[] = seeds.map((seed, index) => ({
    id: index + 1,
    name: seed.name,
    description: null,
    product_group_id: seed.group,
    active: 1,
    location_id: seed.location,
    shopping_location_id: null,
    qu_id_purchase: UNITS[seed.unit].id,
    qu_id_stock: UNITS[seed.unit].id,
    min_stock_amount: seed.minStock ?? 0,
    default_best_before_days: seed.shelfLife,
    default_best_before_days_after_open:
      seed.shelfLife === -1 ? 0 : Math.min(seed.shelfLife, 7),
    picture_file_name: null,
    parent_product_id: null,
    due_type: 1,
    quick_consume_amount: 1,
    quick_open_amount: 1,
    hide_on_stock_overview: 0,
    should_not_be_frozen: 0,
    row_created_timestamp: `${daysFromToday(-60, today)} 10:00:00`,
    userfields: { [THAI_NAME_USERFIELD]: seed.thai },
  }));

  const stock: StockEntry[] = [];
  seeds.forEach((seed, seedIndex) => {
    seed.batches.forEach(([amount, bestBeforeInDays, opened], batchIndex) => {
      const stockNumber = stock.length + 1;
      const boughtDaysAgo =
        bestBeforeInDays === null
          ? 10 + stockNumber
          : Math.max(1, seed.shelfLife - bestBeforeInDays);
      stock.push({
        id: stockNumber,
        product_id: seedIndex + 1,
        amount,
        best_before_date:
          bestBeforeInDays === null
            ? NEVER_EXPIRES_DATE
            : daysFromToday(bestBeforeInDays, today),
        purchased_date: daysFromToday(-boughtDaysAgo, today),
        stock_id: `mock-${seedIndex + 1}-${batchIndex + 1}`,
        price: seed.price,
        open: opened ? 1 : 0,
        opened_date: opened ? daysFromToday(-2, today) : null,
        location_id: seed.location,
        shopping_location_id: null,
        note: null,
        row_created_timestamp: `${daysFromToday(-boughtDaysAgo, today)} 18:30:00`,
      });
    });
  });

  const product_barcodes: ProductBarcode[] = seeds.flatMap((seed, index) =>
    seed.barcode
      ? [
          {
            id: index + 1,
            product_id: index + 1,
            barcode: toEan13(seed.barcode),
            qu_id: UNITS[seed.unit].id,
            amount: 1,
            shopping_location_id: null,
            last_price: seed.price,
            note: null,
          },
        ]
      : [],
  );

  return {
    locations,
    product_groups: productGroups,
    quantity_units: quantityUnits,
    products,
    stock,
    product_barcodes,
    shopping_list: [],
    shopping_locations: shoppingLocations,
  };
};

/** Same shape as Grocy's GET /stock: one row per product that has stock. */
export const currentStock = (database: MockDatabase): CurrentStock[] =>
  database.products.flatMap((product) => {
    const entries = database.stock.filter(
      (entry) => entry.product_id === product.id,
    );
    if (entries.length === 0) return [];
    const amount = entries.reduce((total, entry) => total + entry.amount, 0);
    const amountOpened = entries
      .filter((entry) => entry.open === 1)
      .reduce((total, entry) => total + entry.amount, 0);
    const bestBefore =
      entries.map((entry) => entry.best_before_date).sort()[0] ??
      NEVER_EXPIRES_DATE;
    return [
      {
        product_id: product.id,
        amount,
        amount_aggregated: amount,
        amount_opened: amountOpened,
        amount_opened_aggregated: amountOpened,
        best_before_date: bestBefore,
        is_aggregated_amount: 0,
        product,
      },
    ];
  });
