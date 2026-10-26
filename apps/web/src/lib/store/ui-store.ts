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
  /** A catalog item waiting for the Buy dialog; `confirm` spends the leaves and uses it. */
  purchase: { item: CatalogItem; confirm: () => void } | null;
  askToBuy: (item: CatalogItem, confirm: () => void) => void;
  closePurchase: () => void;
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
  purchase: null,
  askToBuy: (item, confirm) => set({ purchase: { item, confirm } }),
  closePurchase: () => set({ purchase: null }),
  selectStorage: (locationId) =>
    set({ selection: { type: "storage", locationId } }),
  selectItem: (locationId, productId, itemKey) =>
    set({
      selection: { type: "item", locationId, productId, itemKey },
      flyingItemKey: itemKey ?? `${locationId}-${productId}`,
    }),
  clearSelection: () => set({ selection: null }),
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
