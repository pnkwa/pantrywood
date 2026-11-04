import type { DecorPlacement, RoomLayout, Rotation, StoragePlacement, WallSide } from "@pantrywood/shared";
import type { StorageKind } from "@/components/scene/types";
import {
  catalogItem,
  STARTER_PEGBOARD,
  STARTER_STORAGE,
  storageFootprint,
  type CatalogItem,
  type DecorCatalogItem,
  type StorageCatalogItem,
} from "@/data/catalog";
import {
  canPlace,
  cellNear,
  firstFreeCell,
  insideWall,
  rectFor,
  ROOM_CELLS,
  wallCellNear,
  rotatedSize,
  WALL_ROWS,
  type GridCell,
  type Rect,
  type Size,
} from "./grid";
import type { PlacedLocation } from "./layout";

// Decorate rules over the saved room layout. Storage pieces are bound to Grocy locations;
// everything here only rewrites Pantrywood's own layout and never calls Grocy.

/** Pieces are addressed as "storage:<location id>" or "decor:<placement id>". */
export type PieceKey = `storage:${number}` | `decor:${string}`;

export const storageKey = (locationId: number): PieceKey => `storage:${locationId}`;
export const decorKey = (placementId: string): PieceKey => `decor:${placementId}`;

type Layer = "floor" | "rug" | "wall";

/** The wall shelf and wall cabinet hang on a wall's grid instead of standing on the floor's. */
export const isOnFloor = (kind: StorageKind) => kind !== "makerShelf" && kind !== "wallCabinet";

/** How far a wall-hung piece's model origin sits below the middle of its wall cells (the cabinet's origin is its bottom). */
export const WALL_PIECE_DROP: Partial<Record<StorageKind, number>> = { wallCabinet: 0.9 };

/** How far a wall-hung piece's model origin stands out from the wall (half its depth). */
export const WALL_PIECE_DEPTH: Partial<Record<StorageKind, number>> = { makerShelf: 0.38, wallCabinet: 0.28 };

export const storageWallOf = (placement: StoragePlacement): WallSide => placement.wall ?? "right";

const QUARTER_TURN = Math.PI / 2;

export const rotationY = (rotation: Rotation) => rotation * QUARTER_TURN;

const toRotation = (turns: number): Rotation => {
  const normalized = ((Math.round(turns) % 4) + 4) % 4;
  return normalized === 1 ? 1 : normalized === 2 ? 2 : normalized === 3 ? 3 : 0;
};

const defaultPlacement = (location: PlacedLocation): StoragePlacement => {
  if (!isOnFloor(location.kind)) {
    // Its slot is a point on the back wall; the wall grid counts columns along x and rows down from the top.
    const size = storageFootprint(location.kind);
    const middleY = location.position[1] + (WALL_PIECE_DROP[location.kind] ?? 0);
    return { locationId: location.locationId, itemId: STARTER_STORAGE[location.kind] ?? null, cell: wallCellNear(location.position[0], middleY, size), rotation: 0 };
  }
  const rotation = toRotation(location.rotationY / QUARTER_TURN);
  const size = rotatedSize(storageFootprint(location.kind), rotation);
  return {
    locationId: location.locationId,
    itemId: STARTER_STORAGE[location.kind] ?? null,
    cell: cellNear(location.position[0], location.position[2], size),
    rotation,
  };
};

/**
 * Each Grocy location's piece: the saved placement, or where the room put it before any decorating.
 * Saved pieces go down first; a piece that would overlap one already down (a second shelf starting
 * in the first one's slot) moves to the first free spot, or into the box when the room is full.
 */
export const storagePlacements = (layout: RoomLayout, placed: readonly PlacedLocation[]): StoragePlacement[] => {
  const savedFor = (location: PlacedLocation) => {
    const saved = layout.storage.find((placement) => placement.locationId === location.locationId);
    // A style for another model (say, a basket that is now read as a second shelf) gets the kind's starter look.
    if (saved && storageItemKind(saved.itemId) !== location.kind) return { ...saved, itemId: STARTER_STORAGE[location.kind] ?? null };
    return saved;
  };
  const taken: Rect[] = layout.decor.flatMap((placement) => {
    const item = decorItem(placement.itemId);
    return item?.layer === "floor" ? [rectFor(placement.cell, item.footprint, placement.rotation)] : [];
  });
  const resolve = (location: PlacedLocation, placement: StoragePlacement): StoragePlacement => {
    if (placement.stored || !isOnFloor(location.kind)) return placement;
    const size = rotatedSize(storageSize(placement, location.kind), placement.rotation);
    const cell = canPlace(rectFor(placement.cell, size, 0), taken) ? placement.cell : firstFreeCell(size, taken);
    if (!cell) return { ...placement, stored: true };
    taken.push(rectFor(cell, size, 0));
    return { ...placement, cell };
  };
  const resolved = new Map<number, StoragePlacement>();
  for (const location of placed) {
    const saved = savedFor(location);
    if (saved) resolved.set(location.locationId, resolve(location, saved));
  }
  for (const location of placed) {
    if (!resolved.has(location.locationId)) resolved.set(location.locationId, resolve(location, defaultPlacement(location)));
  }
  return placed.flatMap((location) => resolved.get(location.locationId) ?? []);
};

const storageItemKind = (itemId: string | null) => {
  const item = catalogItem(itemId);
  return item?.category === "storage" ? item.model.kind : undefined;
};

export const storageSize = (placement: StoragePlacement, kind: StorageKind): Size =>
  catalogItem(placement.itemId)?.footprint ?? storageFootprint(kind);

const decorItem = (itemId: string): DecorCatalogItem | undefined => {
  const item = catalogItem(itemId);
  return item?.category === "decor" ? item : undefined;
};

/** `wall`: which wall a wall piece hangs on; pieces only collide on the same layer and wall. */
type Piece = { key: PieceKey; layer: Layer; rect: Rect; wall: WallSide | null };

export const wallOf = (placement: DecorPlacement): WallSide => placement.wall ?? "right";

/** Every piece that takes up grid cells, with the layer it collides on. */
const piecesOf = (layout: RoomLayout, storage: readonly StoragePlacement[], kinds: ReadonlyMap<number, StorageKind>) => {
  const pieces: Piece[] = [];
  for (const placement of storage) {
    const kind = kinds.get(placement.locationId);
    if (!kind || placement.stored) continue;
    const onWall = !isOnFloor(kind);
    pieces.push({
      key: storageKey(placement.locationId),
      layer: onWall ? "wall" : "floor",
      rect: rectFor(placement.cell, storageSize(placement, kind), placement.rotation),
      wall: onWall ? storageWallOf(placement) : null,
    });
  }
  for (const placement of layout.decor) {
    const item = decorItem(placement.itemId);
    if (!item) continue;
    // On the wall layer the cell is a column (from the back corner) and a row on that wall.
    pieces.push({
      key: decorKey(placement.id),
      layer: item.layer,
      rect: rectFor(placement.cell, item.footprint, placement.rotation),
      wall: item.layer === "wall" ? wallOf(placement) : null,
    });
  }
  return pieces;
};

export type RoomContext = {
  layout: RoomLayout;
  storage: readonly StoragePlacement[];
  kinds: ReadonlyMap<number, StorageKind>;
};

const obstaclesFor = (room: RoomContext, key: PieceKey, layer: Layer, wall: WallSide | null = null) =>
  piecesOf(room.layout, room.storage, room.kinds)
    .filter((piece) => piece.key !== key && piece.layer === layer && piece.wall === wall)
    .map((piece) => piece.rect);

const findPiece = (room: RoomContext, key: PieceKey) =>
  piecesOf(room.layout, room.storage, room.kinds).find((piece) => piece.key === key);

/** Writes every storage placement into the layout, so a change to one piece also saves the defaults. */
const withStorage = (room: RoomContext, update: (placement: StoragePlacement) => StoragePlacement): RoomLayout => ({
  ...room.layout,
  storage: [
    ...room.storage.map(update),
    // A location that was just added may not be in the room yet; keep its saved spot.
    ...room.layout.storage.filter((saved) => !room.storage.some((placement) => placement.locationId === saved.locationId)),
  ],
});

const withDecor = (room: RoomContext, update: (placement: DecorPlacement) => DecorPlacement): RoomLayout => ({
  ...room.layout,
  decor: room.layout.decor.map(update),
});

/** Moves a piece so its corner sits on `cell` (and, for wall pieces, onto `wall`). null when it would overlap or leave the room. */
export const movePiece = (room: RoomContext, key: PieceKey, cell: GridCell, wall?: WallSide): RoomLayout | null => {
  const piece = findPiece(room, key);
  if (!piece) return null;
  const targetWall = piece.wall === null ? null : (wall ?? piece.wall);
  const target: Rect = { ...piece.rect, x: cell[0], z: cell[1] };
  if (!canPlace(target, obstaclesFor(room, key, piece.layer, targetWall))) return null;
  if (targetWall && !insideWall(target)) return null;
  return key.startsWith("storage:")
    ? withStorage(room, (placement) =>
        storageKey(placement.locationId) === key ? { ...placement, cell, ...(targetWall ? { wall: targetWall } : {}) } : placement,
      )
    : withDecor(room, (placement) =>
        decorKey(placement.id) === key ? { ...placement, cell, ...(targetWall ? { wall: targetWall } : {}) } : placement,
      );
};

/** Hangs a wall piece on the other wall, in the same spot or the nearest free one there. */
export const switchWall = (room: RoomContext, key: PieceKey): RoomLayout | null => {
  const piece = findPiece(room, key);
  if (!piece?.wall) return null;
  const otherWall: WallSide = piece.wall === "right" ? "left" : "right";
  const size: Size = [piece.rect.width, piece.rect.depth];
  const here = movePiece(room, key, [piece.rect.x, piece.rect.z], otherWall);
  if (here) return here;
  const spot = wallSpot(size, obstaclesFor(room, key, "wall", otherWall));
  return spot ? movePiece(room, key, spot, otherWall) : null;
};

/** Turns a piece 90° on the spot. null when the turned piece doesn't fit. */
export const rotatePiece = (room: RoomContext, key: PieceKey): RoomLayout | null => {
  const piece = findPiece(room, key);
  if (!piece || piece.wall) return null;
  const turned: Rect = { ...piece.rect, width: piece.rect.depth, depth: piece.rect.width };
  if (!canPlace(turned, obstaclesFor(room, key, piece.layer))) return null;
  const turn = (rotation: Rotation) => toRotation(rotation + 1);
  return key.startsWith("storage:")
    ? withStorage(room, (placement) =>
        storageKey(placement.locationId) === key ? { ...placement, rotation: turn(placement.rotation) } : placement,
      )
    : withDecor(room, (placement) =>
        decorKey(placement.id) === key ? { ...placement, rotation: turn(placement.rotation) } : placement,
      );
};

/** Storage furniture of the same model kind: what "Swap style" can choose from. */
export const swapChoices = (catalog: readonly CatalogItem[], kind: StorageKind): StorageCatalogItem[] =>
  catalog.filter((item): item is StorageCatalogItem => item.category === "storage" && item.model.kind === kind);

export const swapStyle = (room: RoomContext, locationId: number, itemId: string): RoomLayout =>
  withStorage(room, (placement) => (placement.locationId === locationId ? { ...placement, itemId } : placement));

/** Pieces with props to dress them up (cloth, basket, runner, radio), which can also be kept plain. */
export const hasProps = (kind: StorageKind) => kind === "fridge" || kind === "suppliesCabinet" || kind === "wallCabinet";

/** Dresses a storage piece up with its props, or keeps it plain. */
export const setPlain = (room: RoomContext, locationId: number, plain: boolean): RoomLayout =>
  withStorage(room, (placement) =>
    // Left out when dressed, so saved rooms only carry it for the pieces kept plain.
    placement.locationId === locationId ? { ...placement, plain: plain || undefined } : placement,
  );

/** Puts a cosmetic piece back in the owned box. Storage furniture stays: it holds a Grocy location. */
export const putAway = (layout: RoomLayout, placementId: string): RoomLayout => ({
  ...layout,
  decor: layout.decor.filter((placement) => placement.id !== placementId),
});

/** Takes a storage piece out of the room. Its Grocy location and stock stay as they are. */
export const putAwayStorage = (room: RoomContext, locationId: number): RoomLayout =>
  withStorage(room, (placement) => (placement.locationId === locationId ? { ...placement, stored: true } : placement));

/** Puts a stored piece back: in its old spot when that is free, else the free spot nearest the middle. */
export const placeStorageBack = (room: RoomContext, locationId: number): RoomLayout | null => {
  const placement = room.storage.find((candidate) => candidate.locationId === locationId);
  const kind = room.kinds.get(locationId);
  if (!placement || !kind) return null;
  const others = piecesOf(room.layout, room.storage, room.kinds)
    .filter((piece) => piece.layer === "floor")
    .map((piece) => piece.rect);
  const size = rotatedSize(storageSize(placement, kind), placement.rotation);
  const fitsOldSpot = !isOnFloor(kind) || canPlace(rectFor(placement.cell, size, 0), others);
  const cell = fitsOldSpot ? placement.cell : firstFreeCell(size, others);
  if (!cell) return null;
  return withStorage(room, (candidate) =>
    candidate.locationId === locationId ? { ...candidate, cell, stored: false } : candidate,
  );
};

/** A new storage location's piece in the first free floor spot. null when the room is full. */
export const placeNewStorage = (room: RoomContext, locationId: number, item: StorageCatalogItem): RoomLayout | null => {
  const others = piecesOf(room.layout, room.storage, room.kinds)
    .filter((piece) => piece.layer === "floor")
    .map((piece) => piece.rect);
  const cell = firstFreeCell(item.footprint, others);
  return cell
    ? { ...room.layout, storage: [...withStorage(room, (placement) => placement).storage, { locationId, itemId: item.id, cell, rotation: 0 }] }
    : null;
};

/** An empty room: every piece put away. Wallpaper and floor stay. */
export const clearRoom = (room: RoomContext): RoomLayout => ({
  ...withStorage(room, (placement) => ({ ...placement, stored: true })),
  decor: [],
});

/** The first free spot on the back wall, from the top row down. */
const wallSpot = (size: Size, others: readonly Rect[]): GridCell | null => {
  for (let z = 0; z + size[1] <= WALL_ROWS; z++) {
    for (let x = 0; x + size[0] <= ROOM_CELLS; x++) {
      if (canPlace({ x, z, width: size[0], depth: size[1] }, others)) return [x, z];
    }
  }
  return null;
};

/** Places an owned decor piece in the first free spot on its layer (right wall first, then left). null when it's full. */
export const placeDecor = (room: RoomContext, itemId: string, placementId: string): RoomLayout | null => {
  const item = decorItem(itemId);
  if (!item) return null;
  const others = (wall: WallSide | null) =>
    piecesOf(room.layout, room.storage, room.kinds)
      .filter((piece) => piece.layer === item.layer && piece.wall === wall)
      .map((piece) => piece.rect);
  const add = (cell: GridCell, wall?: WallSide): RoomLayout => ({
    ...room.layout,
    decor: [...room.layout.decor, { id: placementId, itemId, cell, rotation: 0, ...(wall ? { wall } : {}) }],
  });
  if (item.layer !== "wall") {
    const cell = firstFreeCell(item.footprint, others(null));
    return cell ? add(cell) : null;
  }
  for (const wall of ["right", "left"] satisfies WallSide[]) {
    const cell = wallSpot(item.footprint, others(wall));
    if (cell) return add(cell, wall);
  }
  return null;
};

export type Whereabouts = "floor" | "rug" | "leftWall" | "rightWall" | "box";

export const whereIs = (room: RoomContext, placement: DecorPlacement | undefined): Whereabouts => {
  const item = placement ? decorItem(placement.itemId) : undefined;
  if (!placement || !item) return "box";
  if (item.layer !== "wall") return item.layer;
  return wallOf(placement) === "left" ? "leftWall" : "rightWall";
};

/** Takes an item into the box for free: decor gets another copy each time; everything else is kept once. */
export const own = (layout: RoomLayout, item: CatalogItem): RoomLayout =>
  item.category !== "decor" && layout.owned.includes(item.id) ? layout : { ...layout, owned: [...layout.owned, item.id] };

/** "In room" when a placed piece, the wallpaper or the floor uses this catalog item. */
export const isInRoom = (room: RoomContext, itemId: string) =>
  room.layout.wallpaper === itemId ||
  (room.layout.pegboard ?? STARTER_PEGBOARD) === itemId ||
  room.layout.floor === itemId ||
  room.storage.some((placement) => placement.itemId === itemId && !placement.stored) ||
  room.layout.decor.some((placement) => placement.itemId === itemId);

export const pieceInfo = (room: RoomContext, key: string) => {
  if (key.startsWith("storage:")) {
    const locationId = Number(key.slice("storage:".length));
    const placement = room.storage.find((candidate) => candidate.locationId === locationId);
    const kind = room.kinds.get(locationId);
    if (!placement || !kind) return undefined;
    const onWall = !isOnFloor(kind);
    return {
      cell: placement.cell,
      size: rotatedSize(storageSize(placement, kind), placement.rotation),
      itemId: placement.itemId,
      layer: (onWall ? "wall" : "floor") satisfies Layer,
      wall: onWall ? storageWallOf(placement) : null,
    };
  }
  const placement = room.layout.decor.find((candidate) => decorKey(candidate.id) === key);
  const item = placement ? decorItem(placement.itemId) : undefined;
  if (!placement || !item) return undefined;
  return {
    cell: placement.cell,
    size: rotatedSize(item.footprint, placement.rotation),
    itemId: placement.itemId,
    layer: item.layer satisfies Layer,
    wall: item.layer === "wall" ? wallOf(placement) : null,
  };
};
