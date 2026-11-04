"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArchiveIcon,
  BackpackIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  type Icon,
  JarIcon,
  LampIcon,
  PaintRollerIcon,
  PlusIcon,
  PushPinIcon,
  SquaresFourIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";
import { STORAGE_ICONS } from "@/components/pantry/icons";
import type { SceneStorage } from "@/components/scene/types";
import {
  CATALOG,
  catalogItem,
  STARTER_PEGBOARD,
  type CatalogCategory,
  type CatalogItem,
  type DecorCatalogItem,
} from "@/data/catalog";
import { useBoardStore } from "@/lib/board/board-store";
import { PANEL_SPRING } from "@/lib/motion";
import { decorKey, isInRoom, storageKey, type RoomContext } from "@/lib/room/decorate";
import { freeCount, placedCount } from "@/lib/room/inventory";
import type { useDecorate } from "@/lib/room/use-decorate";
import { useUiStore } from "@/lib/store/ui-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { CatalogThumb } from "./CatalogThumb";

type Category = CatalogCategory;

type Mode = "shop" | "inventory";

const MODES: { value: Mode; label: string; icon: Icon }[] = [
  { value: "shop", label: "Shop", icon: StorefrontIcon },
  { value: "inventory", label: "Inventory", icon: BackpackIcon },
];

const CATEGORIES: { value: Category; label: string; icon: Icon }[] = [
  { value: "decor", label: "Decor", icon: LampIcon },
  { value: "storage", label: "Storage", icon: ArchiveIcon },
  { value: "wallpaper", label: "Wallpaper", icon: PaintRollerIcon },
  { value: "floor", label: "Floor", icon: SquaresFourIcon },
  { value: "pegboard", label: "Pegboard", icon: PushPinIcon },
  { value: "shelfItem", label: "Shelf items", icon: JarIcon },
];

const HINTS: Partial<Record<Category, string>> = {
  decor: "Tap to place a copy from your box, or buy another. Then set it down where you like.",
  storage: "Tap one to add another storage spot, a new Grocy location. To restyle a piece, pick it in the room.",
};

const chip = (active: boolean) =>
  `flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] whitespace-nowrap transition-colors duration-150 ease-out pointer-coarse:h-11 ${
    active ? "bg-card font-semibold shadow-[0_2px_6px_rgba(74,59,46,.12)]" : "font-medium text-muted-foreground hover:text-foreground"
  }`;

const PAGE_DIRECTIONS: (1 | -1)[] = [-1, 1];

/** The tray floats this far above the room's bottom edge. */
const TRAY_GAP = 12;

/** One tile in the strip, like a game catalog: picture, name, and what it costs or how many you hold. */
const Tile = ({
  thumb,
  name,
  footer,
  count,
  current,
  index,
  onClick,
}: {
  thumb: ReactNode;
  name: string;
  footer: ReactNode;
  /** Copies in the box, shown as a ×n badge. */
  count?: number;
  current?: boolean;
  index: number;
  onClick: () => void;
}) => {
  const reducedMotion = useReducedMotion();
  return (
    <motion.li
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      // A quick cascade over the first few tiles (well under the 500 ms stagger budget).
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1], delay: Math.min(index, 8) * 0.025 }}
      className="shrink-0 snap-start"
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={current}
        className={`relative flex w-30 flex-col gap-1 rounded-[18px] border-[1.5px] p-1.5 text-left transition-[transform,background-color,border-color] duration-150 ease-out hover:-translate-y-0.5 active:scale-[.97] motion-reduce:hover:translate-y-0 sm:w-34 ${
          current ? "border-[#C8901F] bg-status-soon/60" : "border-border bg-[#FFFDF8] hover:bg-card dark:bg-card"
        }`}
      >
        {thumb}
        <span className="line-clamp-2 min-h-8 px-1 text-[12px] leading-tight font-semibold">{name}</span>
        <span className="flex items-center justify-between gap-1 px-1 text-[11px] font-semibold">{footer}</span>
        {count !== undefined && count > 0 && (
          <span
            key={count}
            className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-card bg-sage-deep px-1.5 text-[11px] font-semibold text-primary-foreground tabular animate-in zoom-in-50 duration-200 motion-reduce:zoom-in-100"
          >
            ×{count}
            <span className="sr-only"> in your box</span>
          </span>
        )}
      </button>
    </motion.li>
  );
};

const Owned = ({ children }: { children: ReactNode }) => <span className="text-status-fresh-foreground">{children}</span>;

type BuildTrayProps = {
  room: RoomContext;
  decorate: ReturnType<typeof useDecorate>;
  selectedPieceKey: string | null;
  storages: readonly SceneStorage[];
  storedAway: readonly SceneStorage[];
  /** The tray's height plus its gap to the room's edge, so the camera can fit the room above it. */
  onHeightChange: (height: number) => void;
};

/**
 * Decorate mode's catalog as a game-style build tray along the bottom of the room: Shop to buy,
 * Inventory to place what's in your box, with copies counted per item (DESIGN.md section 14).
 */
export const BuildTray = ({ room, decorate, selectedPieceKey, storages, storedAway, onHeightChange }: BuildTrayProps) => {
  const reducedMotion = useReducedMotion();
  const selectDecorPiece = useUiStore((state) => state.selectDecorPiece);
  const boardPieces = useBoardStore((state) => state.board.pieces);
  const { layout } = room;
  const pickedStorage = selectedPieceKey?.startsWith("storage:") ? selectedPieceKey : null;
  const [mode, setMode] = useState<Mode>("shop");
  const [category, setCategory] = useState<Category>(pickedStorage ? "storage" : "decor");
  const [collapsed, setCollapsed] = useState(false);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  const stripRef = useRef<HTMLUListElement | null>(null);
  const readEdges = (strip: HTMLUListElement) => {
    const atStart = strip.scrollLeft < 4;
    const atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
    setEdges((previous) => (previous.atStart === atStart && previous.atEnd === atEnd ? previous : { atStart, atEnd }));
  };
  const page = (direction: 1 | -1) => {
    const strip = stripRef.current;
    strip?.scrollBy({ left: direction * strip.clientWidth * 0.8, behavior: reducedMotion ? "auto" : "smooth" });
  };
  // ResizeObserver is the only way to hear the tray change height (collapsing, wrapping chips).
  const measureTray = useCallback(
    (tray: HTMLElement | null) => {
      if (!tray) return;
      const observer = new ResizeObserver(() => onHeightChange(tray.offsetHeight + TRAY_GAP));
      observer.observe(tray);
      return () => {
        observer.disconnect();
        onHeightChange(0);
      };
    },
    [onHeightChange],
  );
  // Picking a storage piece in the room opens its new looks, like the mockup.
  const [followedKey, setFollowedKey] = useState(selectedPieceKey);
  if (selectedPieceKey !== followedKey) {
    setFollowedKey(selectedPieceKey);
    if (pickedStorage) {
      setMode("shop");
      setCategory("storage");
      setCollapsed(false);
    }
  }

  const ownedDecor = [...new Set(layout.owned)].map(catalogItem).filter((item): item is DecorCatalogItem => item?.category === "decor");
  const boxCount = ownedDecor.reduce((total, item) => total + freeCount(layout, item.id), 0) + storedAway.length;
  const currentStorageItem = pickedStorage
    ? room.storage.find((placement) => storageKey(placement.locationId) === pickedStorage)?.itemId
    : null;
  const showingSwaps = category === "storage" && pickedStorage !== null;

  const shopItems = (showingSwaps ? decorate.swapOptions(pickedStorage) : CATALOG).filter(
    (item) => item.category === category,
  );

  const shopTile = (item: CatalogItem, index: number) => {
    const owned = layout.owned.includes(item.id);
    let footer: ReactNode = null;
    let current = false;
    let count: number | undefined;
    if (item.category === "decor") {
      count = freeCount(layout, item.id);
      const placed = placedCount(layout, item.id);
      footer = placed > 0 ? <Owned>{placed} in room</Owned> : null;
    } else if (item.category === "pegboard") {
      const onBoard =
        item.kind === "board"
          ? (layout.pegboard ?? STARTER_PEGBOARD) === item.id
          : boardPieces.some((piece) => piece.kind === "accessory" && piece.itemId === item.id);
      current = onBoard;
      if (onBoard) footer = <Owned>{item.kind === "board" ? "On the wall" : "On the board"}</Owned>;
    } else if (item.category === "storage" && !showingSwaps) {
      const inRoom = room.storage.filter((placement) => placement.itemId === item.id && !placement.stored).length;
      footer = inRoom > 0 ? <Owned>{inRoom} in room</Owned> : <PlusIcon size={14} weight="bold" aria-hidden />;
    } else if (isInRoom(room, item.id)) {
      current = item.id === currentStorageItem || item.category !== "storage";
      footer = <Owned>In room</Owned>;
    } else if (owned) {
      footer = <Owned>Owned</Owned>;
    }
    return (
      <Tile
        key={item.id}
        index={index}
        thumb={<CatalogThumb item={item} />}
        name={item.name}
        footer={footer}
        count={count}
        current={current}
        onClick={() =>
          item.category === "storage" && !showingSwaps ? decorate.addStorage(item) : decorate.chooseItem(item, selectedPieceKey)
        }
      />
    );
  };

  const inventoryTiles = [
    ...storedAway.map((storage, index) => {
      const StorageIcon = STORAGE_ICONS[storage.kind];
      return (
        <Tile
          key={`stored-${storage.locationId}`}
          index={index}
          thumb={
            <span aria-hidden className="flex h-19 items-center justify-center rounded-[14px] bg-background">
              <StorageIcon size={32} weight="duotone" />
            </span>
          }
          name={storage.tag.name}
          footer={<span className="text-muted-foreground">Put away · tap to place</span>}
          count={1}
          onClick={() => decorate.placeStorageBack(storage.locationId)}
        />
      );
    }),
    ...ownedDecor.map((item, index) => {
      const free = freeCount(layout, item.id);
      const placed = layout.decor.find((placement) => placement.itemId === item.id);
      return (
        <Tile
          key={item.id}
          index={storedAway.length + index}
          thumb={<CatalogThumb item={item} />}
          name={item.name}
          count={free}
          footer={
            <span className="text-muted-foreground">
              {placedCount(layout, item.id)} in room{free > 0 ? " · tap to place" : " · tap to find"}
            </span>
          }
          onClick={() => (free > 0 || !placed ? decorate.chooseItem(item, null) : selectDecorPiece(decorKey(placed.id)))}
        />
      );
    }),
    ...storages.map((storage, index) => {
      const StorageIcon = STORAGE_ICONS[storage.kind];
      return (
        <Tile
          key={`room-${storage.locationId}`}
          index={storedAway.length + ownedDecor.length + index}
          thumb={
            <span aria-hidden className="flex h-19 items-center justify-center rounded-[14px] bg-background">
              <StorageIcon size={32} weight="duotone" />
            </span>
          }
          name={storage.tag.name}
          footer={<span className="text-muted-foreground">{storage.tag.itemCount} items · in room</span>}
          current={pickedStorage === storageKey(storage.locationId)}
          onClick={() => selectDecorPiece(storageKey(storage.locationId))}
        />
      );
    }),
  ];

  const tiles =
    mode === "inventory"
      ? inventoryTiles
      : shopItems.map(shopTile);

  const hint =
    mode === "inventory"
      ? "Your box: copies waiting to be placed, and pieces you put away. Storage keeps its Grocy items either way."
      : showingSwaps
        ? "New looks for the piece you picked · it keeps its Grocy location and stock."
        : HINTS[category];

  return (
    <motion.section
      ref={measureTray}
      aria-label="Build catalog"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, transition: { duration: 0.15, ease: [0.3, 0, 1, 1] } }}
      transition={reducedMotion ? { duration: 0.15 } : PANEL_SPRING}
      className="absolute inset-x-2 bottom-2 z-30 flex max-h-[66%] flex-col sm:max-h-[55%] gap-2 rounded-[24px] border-[1.5px] border-border bg-card/95 p-2.5 shadow-[0_-8px_28px_-12px_rgba(74,59,46,.35)] backdrop-blur-sm sm:inset-x-3 sm:bottom-3"
    >
      {/* Phones put the categories on their own row so each chip keeps its label. */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <div role="tablist" aria-label="Catalog" className="flex shrink-0 gap-1 rounded-full bg-muted/70 p-1">
          {MODES.map((option) => {
            const OptionIcon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={mode === option.value}
                onClick={() => {
                  setMode(option.value);
                  setCollapsed(false);
                }}
                className={chip(mode === option.value)}
              >
                <OptionIcon size={18} weight="duotone" aria-hidden />
                <span className="max-sm:sr-only">{option.label}</span>
                {option.value === "inventory" && boxCount > 0 && (
                  <span className="tabular rounded-full bg-sage-deep px-1.5 text-[11px] text-primary-foreground">{boxCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {mode === "shop" && (
          <div role="tablist" aria-label="Category" className="flex min-w-0 flex-1 gap-1 max-sm:order-last max-sm:basis-full overflow-x-auto rounded-full bg-muted/40 p-1">
            {CATEGORIES.map((option) => {
              const CategoryIcon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={category === option.value}
                  onClick={() => {
                    setCategory(option.value);
                    setCollapsed(false);
                  }}
                  className={chip(category === option.value)}
                >
                  <CategoryIcon size={18} weight="duotone" aria-hidden />
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Show the catalog" : "Tuck the catalog away"}
          onClick={() => setCollapsed((tucked) => !tucked)}
          className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out hover:bg-muted/60"
        >
          {collapsed ? <CaretUpIcon size={18} weight="bold" aria-hidden /> : <CaretDownIcon size={18} weight="bold" aria-hidden />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="flex min-h-0 flex-col gap-2"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {showingSwaps && (
                <button
                  type="button"
                  onClick={() => selectDecorPiece(null)}
                  className="flex h-8 shrink-0 items-center gap-1 rounded-full border-[1.5px] border-border px-3 text-xs font-semibold transition-colors duration-150 ease-out hover:bg-muted/60 pointer-coarse:h-11"
                >
                  <PlusIcon size={14} weight="bold" aria-hidden />
                  Add another piece instead
                </button>
              )}
              {hint && <p className="min-w-0 flex-1 text-xs max-sm:hidden text-muted-foreground">{hint}</p>}
            </div>

            <div className="relative">
            <ul
              key={`${mode}-${category}-${pickedStorage}`}
              ref={(strip) => {
                stripRef.current = strip;
                if (strip) readEdges(strip);
              }}
              onScroll={(event) => readEdges(event.currentTarget)}
              className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pt-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {tiles.length > 0 ? (
                tiles
              ) : (
                <li className="w-full rounded-[18px] border-2 border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  {mode === "inventory" ? "Your box is empty. Buy decor in the Shop." : "Nothing here yet."}
                </li>
              )}
            </ul>
            {/* Page arrows like a game catalog; touch screens swipe the strip instead. */}
            {PAGE_DIRECTIONS.map((direction) => {
              const hidden = direction === -1 ? edges.atStart : edges.atEnd;
              const PageIcon = direction === -1 ? CaretLeftIcon : CaretRightIcon;
              return (
                <button
                  key={direction}
                  type="button"
                  aria-label={direction === -1 ? "Previous items" : "More items"}
                  tabIndex={hidden ? -1 : undefined}
                  onClick={() => page(direction)}
                  className={`absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-border bg-card shadow-paper transition-[opacity,transform] duration-150 ease-out hover:scale-105 active:scale-95 pointer-coarse:hidden ${
                    direction === -1 ? "-left-1" : "-right-1"
                  } ${hidden ? "pointer-events-none opacity-0" : ""}`}
                >
                  <PageIcon size={18} weight="bold" aria-hidden />
                </button>
              );
            })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
