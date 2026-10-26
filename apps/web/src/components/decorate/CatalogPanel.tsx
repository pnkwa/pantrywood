"use client";

import { useState, type ReactNode } from "react";
import {
  ArchiveIcon,
  BackpackIcon,
  type Icon,
  JarIcon,
  LampIcon,
  LeafIcon,
  PaintRollerIcon,
  PushPinIcon,
  SquaresFourIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";
import { STORAGE_ICONS } from "@/components/pantry/icons";
import type { SceneStorage } from "@/components/scene/types";
import {
  CATALOG,
  catalogItem,
  ROOM_THEMES,
  type CatalogCategory,
  type CatalogItem,
  type CatalogStyle,
  type DecorCatalogItem,
  type FloorCatalogItem,
  type WallpaperCatalogItem,
} from "@/data/catalog";
import { decorKey, isInRoom, storageKey, whereIs, type RoomContext, type Whereabouts } from "@/lib/room/decorate";
import type { useDecorate } from "@/lib/room/use-decorate";
import { useUiStore } from "@/lib/store/ui-store";
import { CatalogThumb } from "./CatalogThumb";

type Tab = "shop" | "mine";

const CATEGORIES: { value: CatalogCategory; label: string; icon: Icon }[] = [
  { value: "decor", label: "Decor", icon: LampIcon },
  { value: "storage", label: "Storage", icon: ArchiveIcon },
  { value: "wallpaper", label: "Wallpaper", icon: PaintRollerIcon },
  { value: "floor", label: "Floor", icon: SquaresFourIcon },
  { value: "shelfItem", label: "Shelf items", icon: JarIcon },
  { value: "pegboard", label: "Pegboard", icon: PushPinIcon },
];

export const STYLE_CHIPS: Record<CatalogStyle, { label: string; className: string }> = {
  nordic: { label: "Nordic", className: "bg-[#E1ECEE] text-[#2F4E55]" },
  natural: { label: "Natural", className: "bg-[#F1E7D4] text-[#5E4A38]" },
  japandi: { label: "Japandi", className: "bg-[#E3EAD9] text-[#3F5236]" },
  retro: { label: "Retro", className: "bg-[#F4E0D7] text-[#8A4430]" },
};

const STYLES: CatalogStyle[] = ["nordic", "natural", "japandi", "retro"];

const WHEREABOUTS: Record<Whereabouts, string> = {
  floor: "On the floor",
  rug: "On the floor",
  leftWall: "On the left wall",
  rightWall: "On the right wall",
  box: "In the box",
};

const isWallpaper = (item: CatalogItem | undefined): item is WallpaperCatalogItem => item?.category === "wallpaper";
const isFloor = (item: CatalogItem | undefined): item is FloorCatalogItem => item?.category === "floor";
const isDecor = (item: CatalogItem | undefined): item is DecorCatalogItem => item?.category === "decor";

const SMALL_BUTTON =
  "h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors duration-150 ease-out pointer-coarse:h-11";

type CatalogPanelProps = {
  room: RoomContext;
  decorate: ReturnType<typeof useDecorate>;
  selectedPieceKey: string | null;
  storages: readonly SceneStorage[];
  storedAway: readonly SceneStorage[];
};

export const CatalogPanel = ({ room, decorate, selectedPieceKey, storages, storedAway }: CatalogPanelProps) => {
  const [tab, setTab] = useState<Tab>("shop");
  const ownedDecor = room.layout.owned.map(catalogItem).filter(isDecor);
  const thingCount = storages.length + storedAway.length + ownedDecor.length;
  const tabs: { value: Tab; label: string; icon: Icon }[] = [
    { value: "shop", label: "Shop", icon: StorefrontIcon },
    { value: "mine", label: `My things ${thingCount}`, icon: BackpackIcon },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 max-lg:overflow-y-auto max-lg:pb-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div role="tablist" aria-label="Catalog" className="flex gap-1 rounded-full bg-muted/60 p-1">
          {tabs.map((option) => {
            const OptionIcon = option.icon;
            const selected = option.value === tab;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(option.value)}
                className={`flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm whitespace-nowrap transition-colors duration-150 ease-out pointer-coarse:h-11 ${
                  selected ? "bg-card font-semibold shadow-[0_2px_6px_rgba(74,59,46,.12)]" : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                <OptionIcon size={18} weight="duotone" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>
        <span className="tabular inline-flex items-center gap-1.5 text-sm font-semibold text-status-fresh-foreground">
          <LeafIcon size={16} weight="duotone" aria-hidden />
          {room.layout.leaves}
          <span className="sr-only">leaves</span>
        </span>
      </div>

      {tab === "shop" ? (
        <Shop room={room} decorate={decorate} selectedPieceKey={selectedPieceKey} />
      ) : (
        <MyThings room={room} decorate={decorate} ownedDecor={ownedDecor} storages={storages} storedAway={storedAway} />
      )}
    </div>
  );
};

const Shop = ({ room, decorate, selectedPieceKey }: Pick<CatalogPanelProps, "room" | "decorate" | "selectedPieceKey">) => {
  const pickedStorage = selectedPieceKey?.startsWith("storage:") ? selectedPieceKey : null;
  const [category, setCategory] = useState<CatalogCategory>(pickedStorage ? "storage" : "decor");
  const [style, setStyle] = useState<CatalogStyle | null>(null);
  // Picking a storage piece in the room opens its new looks here, like the mockup.
  const [followedKey, setFollowedKey] = useState(selectedPieceKey);
  if (selectedPieceKey !== followedKey) {
    setFollowedKey(selectedPieceKey);
    if (pickedStorage) {
      setCategory("storage");
      setStyle(null);
    }
  }
  const showingSwaps = category === "storage" && pickedStorage !== null;
  const items = (showingSwaps ? decorate.swapOptions(pickedStorage) : CATALOG).filter(
    (item) => item.category === category && (style === null || item.style === style),
  );
  const selectedItemId = pickedStorage
    ? room.storage.find((placement) => storageKey(placement.locationId) === pickedStorage)?.itemId
    : null;
  const hint = showingSwaps
    ? "New looks for the piece you picked · it keeps its Grocy location and stock."
    : category === "storage"
      ? "Pick a storage piece in the room first, then a new look for it."
      : category === "decor"
        ? "Tap to buy, then set it down where you like."
        : null;

  return (
    <>
      <section aria-label="Room themes" className="flex shrink-0 flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Themes · the whole room in one tap</span>
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {ROOM_THEMES.map((theme) => {
            const wall = catalogItem(theme.wallpaper);
            const floor = catalogItem(theme.floor);
            return (
              <li key={theme.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => decorate.applyTheme(theme)}
                  title={theme.description}
                  className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-border bg-card pr-3.5 pl-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 ease-out hover:bg-muted/40"
                >
                  <span aria-hidden className="flex size-8 flex-col overflow-hidden rounded-full border-[1.5px] border-border">
                    <span className="flex-1" style={{ background: isWallpaper(wall) ? wall.material.base : undefined }} />
                    <span className="h-3" style={{ background: isFloor(floor) ? floor.material.line : undefined }} />
                  </span>
                  {theme.name}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div
        role="tablist"
        aria-label="Catalog category"
        className="grid shrink-0 grid-cols-3 gap-1 rounded-[18px] bg-muted/60 p-1 max-lg:-mx-1 max-lg:flex max-lg:overflow-x-auto max-lg:rounded-full"
      >
        {CATEGORIES.map((option) => {
          const CategoryIcon = option.icon;
          const selected = option.value === category;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCategory(option.value)}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 text-[11px] leading-tight transition-colors duration-150 ease-out max-lg:min-h-11 max-lg:shrink-0 max-lg:flex-row max-lg:gap-1.5 max-lg:rounded-full max-lg:px-3.5 max-lg:text-xs ${
                selected ? "bg-card font-semibold shadow-[0_2px_6px_rgba(74,59,46,.12)]" : "font-medium text-muted-foreground hover:text-foreground"
              }`}
            >
              <CategoryIcon size={20} weight="duotone" aria-hidden />
              <span className="max-w-full truncate">{option.label}</span>
            </button>
          );
        })}
      </div>

      <div role="group" aria-label="Filter by style" className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1">
        {[null, ...STYLES].map((option) => {
          const selected = option === style;
          return (
            <button
              key={option ?? "all"}
              type="button"
              aria-pressed={selected}
              onClick={() => setStyle(option)}
              className={`${SMALL_BUTTON} border-[1.5px] ${
                selected
                  ? "border-foreground bg-foreground text-background"
                  : `border-transparent ${option ? STYLE_CHIPS[option].className : "bg-card"} hover:border-border`
              }`}
            >
              {option ? STYLE_CHIPS[option].label : "All"}
            </button>
          );
        })}
      </div>

      {hint && <p className="shrink-0 text-xs text-muted-foreground">{hint}</p>}

      <ul className="-mx-1 grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2.5 px-1 pb-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {items.length === 0 && (
          <li className="col-span-full py-6 text-center text-sm text-muted-foreground">
            No {style ? STYLE_CHIPS[style].label : ""} pieces here yet.
          </li>
        )}
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => decorate.chooseItem(item, selectedPieceKey)}
              className={`flex w-full flex-col gap-1.5 rounded-[18px] border-[1.5px] p-2 text-left transition-colors duration-150 ease-out hover:bg-muted/40 ${
                item.id === selectedItemId ? "border-[#C8901F] bg-status-soon/60" : "border-border bg-[#FFFDF8] dark:bg-card"
              }`}
            >
              <CatalogThumb item={item} />
              <span className="line-clamp-2 min-h-9 px-1 text-[13px] leading-tight font-semibold">{item.name}</span>
              <span className="flex items-center justify-between gap-1 px-1">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLE_CHIPS[item.style].className}`}>
                  {STYLE_CHIPS[item.style].label}
                </span>
                <PriceTag
                  inRoom={isInRoom(room, item.id)}
                  owned={room.layout.owned.includes(item.id)}
                  affordable={room.layout.leaves >= item.price}
                  price={item.price}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
};

const PriceTag = ({ inRoom, owned, affordable, price }: { inRoom: boolean; owned: boolean; affordable: boolean; price: number }) => {
  if (inRoom) return <span className="text-[11px] font-semibold text-status-fresh-foreground">In room</span>;
  if (owned) return <span className="text-[11px] font-semibold text-status-fresh-foreground">Owned</span>;
  return (
    <span
      className={`tabular inline-flex items-center gap-0.5 text-[11px] font-semibold ${affordable ? "text-foreground" : "text-muted-foreground line-through"}`}
    >
      <LeafIcon size={12} weight="duotone" aria-hidden />
      {price}
      <span className="sr-only">leaves{affordable ? "" : ", not enough yet"}</span>
    </span>
  );
};

const ThingRow = ({ thumb, name, where, action }: { thumb: ReactNode; name: string; where: string; action: ReactNode }) => (
  <li className="flex items-center gap-2.5 rounded-md border-[1.5px] border-border bg-card p-1.5 pr-2">
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-background">{thumb}</span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[13px] font-semibold">{name}</span>
      <span className="truncate text-[11px] text-muted-foreground">{where}</span>
    </span>
    {action}
  </li>
);

const ThingGroup = ({ title, count, children }: { title: string; count: number; children: ReactNode }) =>
  count === 0 ? null : (
    <section aria-label={title} className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold text-muted-foreground">
        {title} · {count}
      </h3>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </section>
  );

type MyThingsProps = Pick<CatalogPanelProps, "room" | "decorate" | "storages" | "storedAway"> & {
  ownedDecor: DecorCatalogItem[];
};

const MyThings = ({ room, decorate, ownedDecor, storages, storedAway }: MyThingsProps) => {
  const selectDecorPiece = useUiStore((state) => state.selectDecorPiece);
  const placementOf = (item: DecorCatalogItem) => room.layout.decor.find((placement) => placement.itemId === item.id);
  const boxed = ownedDecor.filter((item) => !placementOf(item));
  const placed = ownedDecor.filter((item) => placementOf(item));

  const storageRow = (storage: SceneStorage, stored: boolean) => {
    const StorageIcon = STORAGE_ICONS[storage.kind];
    return (
      <ThingRow
        key={storage.locationId}
        thumb={<StorageIcon size={24} weight="duotone" aria-hidden />}
        name={storage.tag.name}
        where={`${storage.tag.itemCount} items · ${stored ? "put away" : "in the room"}`}
        action={
          stored ? (
            <button
              type="button"
              onClick={() => decorate.placeStorageBack(storage.locationId)}
              className={`${SMALL_BUTTON} bg-sage-deep text-primary-foreground hover:bg-sage-deep/85`}
            >
              Put back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => selectDecorPiece(storageKey(storage.locationId))}
              className={`${SMALL_BUTTON} hover:bg-muted/40`}
            >
              Find
            </button>
          )
        }
      />
    );
  };

  const decorRow = (item: DecorCatalogItem) => {
    const placement = placementOf(item);
    return (
      <ThingRow
        key={item.id}
        thumb={
          <span className="w-20 shrink-0 scale-[.7]">
            <CatalogThumb item={item} />
          </span>
        }
        name={item.name}
        where={WHEREABOUTS[whereIs(room, placement)]}
        action={
          placement ? (
            <button
              type="button"
              onClick={() => selectDecorPiece(decorKey(placement.id))}
              className={`${SMALL_BUTTON} hover:bg-muted/40`}
            >
              Find
            </button>
          ) : (
            <button
              type="button"
              onClick={() => decorate.chooseItem(item, null)}
              className={`${SMALL_BUTTON} bg-sage-deep text-primary-foreground hover:bg-sage-deep/85`}
            >
              Place
            </button>
          )
        }
      />
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <p className="text-xs text-muted-foreground">
        Storage holds your Grocy items: put away, it leaves the room but its items stay in your list.
      </p>
      <ThingGroup title="In the box" count={boxed.length + storedAway.length}>
        {storedAway.map((storage) => storageRow(storage, true))}
        {boxed.map(decorRow)}
      </ThingGroup>
      <ThingGroup title="In the room" count={placed.length + storages.length}>
        {storages.map((storage) => storageRow(storage, false))}
        {placed.map(decorRow)}
      </ThingGroup>
      {ownedDecor.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No decor yet. Find some in the Shop.</p>
      )}
    </div>
  );
};
