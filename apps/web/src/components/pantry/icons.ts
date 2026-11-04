import {
  ArchiveIcon,
  BasketIcon,
  BroomIcon,
  CarrotIcon,
  CoffeeIcon,
  CookieIcon,
  CookingPotIcon,
  DoorIcon,
  DropIcon,
  EggIcon,
  FishIcon,
  GrainsIcon,
  HourglassIcon,
  type Icon,
  JarIcon,
  LeafIcon,
  PackageIcon,
  PepperIcon,
  PlantIcon,
  PrinterIcon,
  SnowflakeIcon,
  TShirtIcon,
  ToiletPaperIcon,
} from "@phosphor-icons/react";
import type { StorageKind } from "@/components/scene/types";
import type { ItemStatus } from "@/lib/pantry/model";

export const STORAGE_ICONS: Record<StorageKind, Icon> = {
  fridge: DoorIcon,
  counter: CookingPotIcon,
  pantryShelf: JarIcon,
  crates: PackageIcon,
  riceBin: GrainsIcon,
  suppliesCabinet: ArchiveIcon,
  makerShelf: PrinterIcon,
  wallCabinet: ArchiveIcon,
  table: CoffeeIcon,
  basket: BasketIcon,
};

export const PRODUCT_ICONS = {
  dairy: EggIcon,
  produce: CarrotIcon,
  meat: FishIcon,
  grains: GrainsIcon,
  sauces: PepperIcon,
  pantry: JarIcon,
  snacks: CookieIcon,
  frozen: SnowflakeIcon,
  bathroom: DropIcon,
  cleaning: BroomIcon,
  laundry: TShirtIcon,
  paper: ToiletPaperIcon,
  maker: PrinterIcon,
  other: PackageIcon,
};

type ProductIconKey = keyof typeof PRODUCT_ICONS;

const GROUP_ICON_KEYS: [RegExp, ProductIconKey][] = [
  [/dairy|egg|milk/, "dairy"],
  [/produce|veg|fruit|herb/, "produce"],
  [/meat|fish|seafood/, "meat"],
  [/rice|grain|flour|bread|bakery/, "grains"],
  [/sauce|season|condiment|spice/, "sauces"],
  [/pantry|staple|canned|noodle/, "pantry"],
  [/snack|sweet|candy/, "snacks"],
  [/frozen/, "frozen"],
  [/bath|personal|beauty/, "bathroom"],
  [/clean/, "cleaning"],
  [/laundry/, "laundry"],
  [/paper/, "paper"],
  [/maker|filament|craft/, "maker"],
];

export const productIconKeyFor = (groupName: string): ProductIconKey =>
  GROUP_ICON_KEYS.find(([pattern]) =>
    pattern.test(groupName.toLowerCase()),
  )?.[1] ?? "other";

type StatusStyle = { icon: Icon; label: string; className: string };

export const STATUS_STYLES: Record<ItemStatus, StatusStyle> = {
  fresh: {
    icon: PlantIcon,
    label: "Fresh",
    className: "bg-status-fresh text-status-fresh-foreground",
  },
  soon: {
    icon: HourglassIcon,
    label: "Use soon",
    className: "bg-status-soon text-status-soon-foreground",
  },
  expired: {
    icon: LeafIcon,
    label: "Past its date",
    className: "bg-status-expired text-status-expired-foreground",
  },
  opened: {
    icon: JarIcon,
    label: "Opened",
    className: "bg-status-opened text-status-opened-foreground",
  },
  stocked: {
    icon: PlantIcon,
    label: "Stocked",
    className: "bg-status-fresh text-status-fresh-foreground",
  },
  low: {
    icon: BasketIcon,
    label: "Running low",
    className: "bg-status-low text-status-low-foreground",
  },
};
