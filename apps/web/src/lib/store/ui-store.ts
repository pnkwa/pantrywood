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

/** "enteringDoor": the camera is gliding to the fridge before the 2D door shows. */
export type RoomView = "room" | "enteringDoor" | "fridgeDoor";

export type Toast = {
  id: number;
  message: string;
  tone: "info" | "error";
};

type UiState = {
  selection: Selection;
  hoveredLocationId: number | null;
  view: RoomView;
  fridgeLocationId: number | null;
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
  /** A catalog item waiting for the Buy dialog; `confirm` spends the leaves and uses it. */
  purchase: { item: CatalogItem; confirm: () => void } | null;
  askToBuy: (item: CatalogItem, confirm: () => void) => void;
  closePurchase: () => void;
  selectStorage: (locationId: number) => void;
  selectItem: (locationId: number, productId: number, itemKey?: string) => void;
  clearSelection: () => void;
  clearFlyingItem: () => void;
  setHoveredLocation: (locationId: number | null) => void;
  openFridgeDoor: (locationId: number) => void;
  showFridgeDoor: () => void;
  closeFridgeDoor: () => void;
  showToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
};

const TOAST_SECONDS = 4;
let nextToastId = 1;

export const useUiStore = create<UiState>()((set, get) => ({
  selection: null,
  hoveredLocationId: null,
  view: "room",
  fridgeLocationId: null,
  flyingItemKey: null,
  toasts: [],
  listView: false,
  setListView: (listView) => set({ listView, hoveredLocationId: null }),
  decorating: false,
  decorPiece: null,
  moving: false,
  setDecorating: (decorating) =>
    set({ decorating, decorPiece: null, moving: false, selection: null, listView: false, view: "room", hoveredLocationId: null }),
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
  openFridgeDoor: (locationId) =>
    set({
      view: "enteringDoor",
      fridgeLocationId: locationId,
      selection: { type: "storage", locationId },
      hoveredLocationId: null,
    }),
  showFridgeDoor: () => {
    if (get().view === "enteringDoor") set({ view: "fridgeDoor" });
  },
  closeFridgeDoor: () => set({ view: "room" }),
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
