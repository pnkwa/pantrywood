import { useMemo } from "react";
import type { WallSide } from "@pantrywood/shared";
import type { FloorSurface, SceneDecor, SceneStorage, StorageKind, WallSurface } from "@/components/scene/types";
import { catalogItem, STARTER_FLOOR, STARTER_WALLPAPER } from "@/data/catalog";
import type { Pantry } from "@/lib/pantry/model";
import { decorKey, isOnFloor, rotationY, storagePlacements, storageSize, storageWallOf, WALL_PIECE_DEPTH, WALL_PIECE_DROP, wallOf, type RoomContext } from "./decorate";
import { rectFor, wallCenterY, worldCenter } from "./grid";
import { sceneItemsFor } from "./items";
import { placeLocations } from "./layout";
import { useRoomStore } from "./room-store";
import { BOARD_COLS, BOARD_ROWS } from "@/lib/board/board";
import { useBoardStore } from "@/lib/board/board-store";
import { useInsideStore } from "@/lib/inside/inside-store";
import { sceneShelvesFor } from "@/lib/inside/plan";
import { boardLookFor, planesFor } from "@/lib/board/look";

const RUG_HEIGHT = 0.012;
/** Wall pieces hang just off the wall: the right wall stands at z = -5, the left at x = -5. */
const ON_WALL = -4.95;

/** Where a wall piece hangs, from its distance along the wall (from the back corner) and its height. */
export const wallPose = (
  wall: WallSide,
  along: number,
  height: number,
): Pick<SceneDecor, "position" | "rotationY"> =>
  wall === "left"
    ? { position: [ON_WALL, height, along], rotationY: Math.PI / 2 }
    : { position: [along, height, ON_WALL], rotationY: 0 };

/** Where a wall-hung storage piece's model goes: its origin dropped below its cells' middle and stood out from the wall. */
export const wallStoragePose = (
  kind: StorageKind,
  wall: WallSide,
  along: number,
  middleY: number,
): Pick<SceneStorage, "position" | "rotationY"> => {
  const pose = wallPose(wall, along, middleY - (WALL_PIECE_DROP[kind] ?? 0));
  const out = (WALL_PIECE_DEPTH[kind] ?? 0) - 0.05;
  const [x, y, z] = pose.position;
  return { position: wall === "left" ? [x + out, y, z] : [x, y, z + out], rotationY: pose.rotationY };
};

const wallFor = (itemId: string): WallSurface => {
  const item = catalogItem(itemId) ?? catalogItem(STARTER_WALLPAPER);
  return item?.category === "wallpaper" ? item.material : { pattern: "wainscot", base: "#F7EFE1", line: "#DCE3DD" };
};

const floorFor = (itemId: string): FloorSurface => {
  const item = catalogItem(itemId) ?? catalogItem(STARTER_FLOOR);
  return item?.category === "floor" ? item.material : { pattern: "checker", base: "#F3E7CF", line: "#D3E2E6" };
};

export type Room = {
  storages: SceneStorage[];
  /** Put away in Decorate: out of the room, but still Grocy locations with their stock. */
  storedAway: SceneStorage[];
  decor: SceneDecor[];
  wall: WallSurface;
  floor: FloorSurface;
  /** What the Decorate rules need to check moves, swaps and themes. */
  context: RoomContext;
};

export const useRoom = (pantry: Pantry | null): Room => {
  const layout = useRoomStore((state) => state.layout);
  const boardPieces = useBoardStore((state) => state.board.pieces);
  const insideLayouts = useInsideStore((state) => state.layouts);
  return useMemo(() => {
    const locations = pantry?.locations ?? [];
    const placed = placeLocations(
      locations.map((location) => ({ id: location.id, name: location.name, isFreezer: location.isFreezer })),
    );
    const kinds = new Map<number, StorageKind>(placed.map((location) => [location.locationId, location.kind]));
    const storage = storagePlacements(layout, placed);
    const locationById = new Map(locations.map((location) => [location.id, location]));

    const allStorages = placed.flatMap((spot): SceneStorage[] => {
      const location = locationById.get(spot.locationId);
      const placement = storage.find((candidate) => candidate.locationId === spot.locationId);
      if (!location || !placement) return [];
      const item = catalogItem(placement.itemId);
      const onFloor = isOnFloor(spot.kind);
      const rect = rectFor(placement.cell, storageSize(placement, spot.kind), placement.rotation);
      const [x, z] = worldCenter(rect);
      const pose = onFloor
        ? { position: [x, 0, z] satisfies [number, number, number], rotationY: rotationY(placement.rotation) }
        : wallStoragePose(spot.kind, storageWallOf(placement), x, wallCenterY(rect));
      return [
        {
          locationId: spot.locationId,
          kind: spot.kind,
          sink: spot.sink,
          plain: placement.plain ?? false,
          palette: item?.category === "storage" ? item.model.palette : null,
          ...pose,
          items: sceneItemsFor(location.items),
          shelves: sceneShelvesFor(spot.kind, location, insideLayouts[location.id]),
          tag: {
            name: location.name,
            itemCount: location.counts.itemCount,
            useSoon: location.counts.useSoon,
            expired: location.counts.expired,
            low: location.counts.low,
          },
        },
      ];
    });

    const decor = layout.decor.flatMap((placement): SceneDecor[] => {
      const item = catalogItem(placement.itemId);
      if (item?.category !== "decor") return [];
      const onWall = item.layer === "wall";
      const rect = rectFor(placement.cell, item.footprint, placement.rotation);
      const [x, z] = worldCenter(rect);
      return [
        {
          id: decorKey(placement.id),
          shape: item.model.shape,
          colors: item.model.colors,
          // On a wall, x is the distance along it from the back corner.
          ...(onWall
            ? wallPose(wallOf(placement), x, wallCenterY(rect))
            : { position: [x, item.layer === "rug" ? RUG_HEIGHT : 0, z], rotationY: rotationY(placement.rotation) }),
          size: item.footprint,
          ...(item.model.shape === "pegboard"
            ? {
                board: {
                  ...boardLookFor(layout.pegboard),
                  columns: BOARD_COLS,
                  rows: BOARD_ROWS,
                  planes: planesFor(boardPieces),
                },
              }
            : {}),
        },
      ];
    });

    const isStored = (storageItem: SceneStorage) =>
      storage.some((placement) => placement.locationId === storageItem.locationId && placement.stored);

    return {
      storages: allStorages.filter((storageItem) => !isStored(storageItem)),
      storedAway: allStorages.filter(isStored),
      decor,
      wall: wallFor(layout.wallpaper),
      floor: floorFor(layout.floor),
      context: { layout, storage, kinds },
    };
  }, [pantry, layout, boardPieces, insideLayouts]);
};
