import type { RoomLayout, WallSide } from "@pantrywood/shared";
import type { AccessoryCatalogItem, CatalogItem, RoomTheme } from "@/data/catalog";
import { useBoardStore } from "@/lib/board/board-store";
import { CATALOG, catalogItem } from "@/data/catalog";
import { useUiStore } from "@/lib/store/ui-store";
import {
  applyTheme,
  buy,
  clearRoom,
  decorKey,
  isOnFloor,
  movePiece,
  placeDecor,
  placeStorageBack,
  putAway,
  putAwayStorage,
  rotatePiece,
  swapChoices,
  swapStyle,
  switchWall,
  type PieceKey,
  type RoomContext,
} from "./decorate";
import type { GridCell } from "./grid";
import { useRoomStore } from "./room-store";

/** Each accessory hangs once: if it's already on the board, it's picked instead of copied. */
export const hangAccessory = (item: AccessoryCatalogItem) => {
  const { board, add } = useBoardStore.getState();
  const { selectBoardPiece, showToast } = useUiStore.getState();
  const hanging = board.pieces.find((piece) => piece.kind === "accessory" && piece.itemId === item.id);
  if (hanging) return selectBoardPiece(hanging.id);
  const id = crypto.randomUUID();
  const [w, h] = item.model.size;
  add({ id, kind: "accessory", itemId: item.id, w, h });
  selectBoardPiece(id);
  showToast(`${item.name} is on the pegboard`);
};

const isPieceKey = (key: string): key is PieceKey => key.startsWith("storage:") || key.startsWith("decor:");

const locationOf = (key: string) => (key.startsWith("storage:") ? Number(key.slice("storage:".length)) : null);

export const useDecorate = (room: RoomContext) => {
  const change = useRoomStore((state) => state.change);
  const undo = useRoomStore((state) => state.undo);
  const canUndo = useRoomStore((state) => state.history.length > 0);
  const showToast = useUiStore((state) => state.showToast);
  const selectDecorPiece = useUiStore((state) => state.selectDecorPiece);
  const setMoving = useUiStore((state) => state.setMoving);
  const askToBuy = useUiStore((state) => state.askToBuy);
  const { layout } = room;

  const commit = (next: ReturnType<typeof movePiece>, blocked: string) => {
    if (next) change(next);
    else showToast(blocked, "error");
    return next !== null;
  };

  /** Uses an item: straight away when it's owned, otherwise once the Buy dialog is confirmed. */
  const withOwned = (item: CatalogItem, apply: (owned: RoomLayout) => void) => {
    if (layout.owned.includes(item.id)) return apply(layout);
    if (layout.leaves < item.price) {
      showToast(`${item.name} needs ${item.price - layout.leaves} more leaves`, "error");
      return;
    }
    askToBuy(item, () => {
      const bought = buy(layout, item);
      if (bought) apply(bought);
    });
  };

  const pieceKind = (key: string) => {
    const locationId = locationOf(key);
    return locationId === null ? undefined : room.kinds.get(locationId);
  };

  return {
    canUndo,
    undo,
    /** Catalog styles a storage piece can swap to (same model, so it still fits the location). */
    swapOptions: (key: string) => {
      const kind = pieceKind(key);
      return kind ? swapChoices(CATALOG, kind) : [];
    },
    canMove: (key: string) => {
      const kind = pieceKind(key);
      return key.startsWith("decor:") || (kind !== undefined && isOnFloor(kind));
    },
    swap: (key: string, itemId: string) => {
      const locationId = locationOf(key);
      const item = catalogItem(itemId);
      if (locationId === null || !item) return;
      withOwned(item, (owned) => change(swapStyle({ ...room, layout: owned }, locationId, itemId)));
    },
    rotate: (key: string) => isPieceKey(key) && commit(rotatePiece(room, key), "No room to turn it there"),
    fits: (key: string, cell: GridCell, wall?: WallSide) => isPieceKey(key) && movePiece(room, key, cell, wall) !== null,
    moveTo: (key: string, cell: GridCell, wall?: WallSide) =>
      isPieceKey(key) && commit(movePiece(room, key, cell, wall), "Something is already in that spot"),
    switchWall: (key: string) =>
      isPieceKey(key) && commit(switchWall(room, key), "No free spot on the other wall"),
    /** Decor goes back to the owned box; storage leaves the room but keeps its Grocy location and stock. */
    putAway: (key: string) => {
      const locationId = locationOf(key);
      if (locationId !== null) change(putAwayStorage(room, locationId));
      else if (key.startsWith("decor:")) change(putAway(layout, key.slice("decor:".length)));
      else return;
      selectDecorPiece(null);
    },
    placeStorageBack: (locationId: number) =>
      commit(placeStorageBack(room, locationId), "No free spot for it right now. Move something first"),
    clearRoom: () => {
      change(clearRoom(room));
      selectDecorPiece(null);
    },
    /** A catalog card: buy if needed, then use it (wallpaper, floor, a new decor piece, or a swap). */
    chooseItem: (item: CatalogItem, selectedKey: string | null) => {
      if (item.category === "pegboard") {
        withOwned(item, (owned) => {
          if (item.kind === "board") {
            change({ ...owned, pegboard: item.id });
            return;
          }
          if (owned !== layout) change(owned);
          hangAccessory(item);
        });
        return;
      }
      if (item.category === "storage") {
        const kind = selectedKey ? pieceKind(selectedKey) : undefined;
        const locationId = selectedKey ? locationOf(selectedKey) : null;
        if (locationId !== null && kind === item.model.kind) {
          withOwned(item, (owned) => change(swapStyle({ ...room, layout: owned }, locationId, item.id)));
        } else {
          showToast("Pick a matching storage piece in the room, then choose its new style");
        }
        return;
      }
      // You own one of each piece: if it's already out, pick that one up instead of a copy.
      const placedAlready = layout.decor.find((placement) => placement.itemId === item.id);
      if (placedAlready) {
        selectDecorPiece(decorKey(placedAlready.id));
        return;
      }
      withOwned(item, (owned) => {
        if (item.category === "wallpaper") return change({ ...owned, wallpaper: item.id });
        if (item.category === "floor") return change({ ...owned, floor: item.id });
        if (item.category === "shelfItem") {
          if (owned !== layout) change(owned);
          showToast(`${item.name} is yours. Shelf items go inside a shelf, coming with the inside view`);
          return;
        }
        const placementId = crypto.randomUUID();
        const placed = placeDecor({ ...room, layout: owned }, item.id, placementId);
        if (placed) {
          change(placed);
          // Like picking it up from the catalog: it follows the pointer until it's set down.
          selectDecorPiece(decorKey(placementId));
          setMoving(true);
          useUiStore.getState().setSheetOpen(false);
        } else {
          if (owned !== layout) change(owned);
          showToast("No free spot for it right now. Move something first", "error");
        }
      });
    },
    applyTheme: (theme: RoomTheme) => {
      change(applyTheme(room, theme));
      showToast(`${theme.name} applied`);
    },
  };
};
