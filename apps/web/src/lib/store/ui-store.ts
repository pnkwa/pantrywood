import { create } from "zustand";
import type { CatalogItem } from "@/data/catalog";

export type Selection =
  | { type: "storage"; locationId: number }
  | {
      type: "item";
      /** The storage piece it is shown in. */
      locationId: number;
      productId: number;
      /** Pins the exact item when the product sits in two compartments. */
      itemKey?: string;
    }
  | null;

/** "entering": the camera is gliding to a storage piece before its inside view shows. */
export type RoomView = "room" | "entering" | "inside";

export type Toast = {
  id: number;
  message: string;
  tone: "info" | "error";
};

type UiState = {
  selection: Selection;
  hoveredLocationId: number | null;
  view: RoomView;
  /** The storage piece that is open (or opening), by Grocy location id. */
  insideLocationId: number | null;
  flyingItemKey: string | null;
  toasts: Toast[];
  /** 2D fallback for the 3D room (slow phones, or a plain list is simply easier). */
  listView: boolean;
  setListView: (listView: boolean) => void;
  /** Decorate mode (DESIGN.md section 14): pieces are picked for the toolbar, the catalog replaces the panel. */
  decorating: boolean;
  /** "storage:<location id>" or "decor:<placement id>". */
  decorPiece: string | null;
  moving: boolean;
  setDecorating: (decorating: boolean) => void;
  selectDecorPiece: (key: string | null) => void;
  setMoving: (moving: boolean) => void;
  /** The pegboard's board view, and the piece picked on it for the side panel. */
  boardOpen: boolean;
  boardPiece: string | null;
  /** Phones and tablets: the board's and Decorate's panel is a bottom sheet, open only when asked for so the room or board stays visible. */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  openBoard: () => void;
  closeBoard: () => void;
  selectBoardPiece: (id: string | null) => void;
  /** A storage piece waiting to be added as a new Grocy location called `name`; `confirm` adds it. */
  addingStorage: { item: CatalogItem; name: string; confirm: () => void } | null;
  askToAddStorage: (item: CatalogItem, name: string, confirm: () => void) => void;
  closeAddingStorage: () => void;
  /** The list of every item with where it is, waiting ones first. Shown where the storage panel goes. */
  /** The room's light switch: off, the lamps go out and at night the room goes dark and moonlit. */
  lightsOn: boolean;
  toggleLights: () => void;
  itemListOpen: boolean;
  openItemList: () => void;
  selectStorage: (locationId: number) => void;
  selectItem: (locationId: number, productId: number, itemKey?: string) => void;
  clearSelection: () => void;
  clearFlyingItem: () => void;
  setHoveredLocation: (locationId: number | null) => void;
  openInside: (locationId: number) => void;
  showInside: () => void;
  closeInside: () => void;
  showToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
};

const TOAST_SECONDS = 4;
let nextToastId = 1;

export const useUiStore = create<UiState>()((set, get) => ({
  selection: null,
  hoveredLocationId: null,
  view: "room",
  insideLocationId: null,
  flyingItemKey: null,
  toasts: [],
  listView: false,
  setListView: (listView) => set({ listView, hoveredLocationId: null }),
  decorating: false,
  decorPiece: null,
  moving: false,
  setDecorating: (decorating) =>
    set({
      decorating,
      decorPiece: null,
      moving: false,
      selection: null,
      listView: false,
      view: "room",
      hoveredLocationId: null,
      boardOpen: false,
      sheetOpen: false,
    }),
  boardOpen: false,
  boardPiece: null,
  sheetOpen: false,
  setSheetOpen: (open) => set({ sheetOpen: open }),
  openBoard: () =>
    set({ boardOpen: true, boardPiece: null, sheetOpen: false, selection: null, view: "room", hoveredLocationId: null }),
  closeBoard: () => set({ boardOpen: false, boardPiece: null, sheetOpen: false }),
  selectBoardPiece: (id) => set({ boardPiece: id }),
  selectDecorPiece: (key) => set({ decorPiece: key, moving: false }),
  setMoving: (moving) => set({ moving }),
  addingStorage: null,
  askToAddStorage: (item, name, confirm) => set({ addingStorage: { item, name, confirm } }),
  closeAddingStorage: () => set({ addingStorage: null }),
  lightsOn: true,
  toggleLights: () => set((state) => ({ lightsOn: !state.lightsOn })),
  itemListOpen: false,
  openItemList: () => set({ itemListOpen: true, selection: null }),
  selectStorage: (locationId) =>
    set({ selection: { type: "storage", locationId }, itemListOpen: false }),
  selectItem: (locationId, productId, itemKey) =>
    set({
      itemListOpen: false,
      selection: { type: "item", locationId, productId, itemKey },
      flyingItemKey: itemKey ?? `${locationId}-${productId}`,
    }),
  clearSelection: () => set({ selection: null, itemListOpen: false }),
  clearFlyingItem: () => set({ flyingItemKey: null }),
  setHoveredLocation: (locationId) => set({ hoveredLocationId: locationId }),
  openInside: (locationId) =>
    set({
      view: "entering",
      insideLocationId: locationId,
      selection: { type: "storage", locationId },
      hoveredLocationId: null,
    }),
  showInside: () => {
    if (get().view === "entering") set({ view: "inside" });
  },
  closeInside: () => set({ view: "room" }),
  showToast: (message, tone = "info") => {
    const id = nextToastId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => get().dismissToast(id), TOAST_SECONDS * 1000);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
