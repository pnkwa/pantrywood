// The Decorate floor grid: 10 × 10 cells of 50 cm over the room's -5…5 floor.
// No "@/" imports: scripts/room-grid.test.mjs runs this file directly with Node.

export const ROOM_CELLS = 10;
const ROOM_HALF = ROOM_CELLS / 2;

export type GridCell = [x: number, z: number];
export type Size = [width: number, depth: number];
export type QuarterTurns = 0 | 1 | 2 | 3;
/** Cells a piece covers: its corner cell plus its size. */
export type Rect = { x: number; z: number; width: number; depth: number };

export const rotatedSize = ([width, depth]: Size, rotation: QuarterTurns): Size =>
  rotation % 2 === 1 ? [depth, width] : [width, depth];

export const rectFor = (cell: GridCell, size: Size, rotation: QuarterTurns): Rect => {
  const [width, depth] = rotatedSize(size, rotation);
  return { x: cell[0], z: cell[1], width, depth };
};

export const insideRoom = (rect: Rect) =>
  rect.x >= 0 && rect.z >= 0 && rect.x + rect.width <= ROOM_CELLS && rect.z + rect.depth <= ROOM_CELLS;

export const overlaps = (first: Rect, second: Rect) =>
  first.x < second.x + second.width &&
  second.x < first.x + first.width &&
  first.z < second.z + second.depth &&
  second.z < first.z + first.depth;

export const canPlace = (rect: Rect, others: readonly Rect[]) =>
  insideRoom(rect) && others.every((other) => !overlaps(rect, other));

export const worldCenter = (rect: Rect): [x: number, z: number] => [
  -ROOM_HALF + rect.x + rect.width / 2,
  -ROOM_HALF + rect.z + rect.depth / 2,
];

/** The corner cell that puts a piece's middle nearest a world point, kept inside the room. */
export const cellNear = (worldX: number, worldZ: number, size: Size): GridCell => {
  const [width, depth] = size;
  const clamp = (value: number, span: number) => Math.min(ROOM_CELLS - span, Math.max(0, value));
  return [
    clamp(Math.round(worldX + ROOM_HALF - width / 2), width),
    clamp(Math.round(worldZ + ROOM_HALF - depth / 2), depth),
  ];
};

// The back wall as a grid too: same 10 columns as the floor, rows counted down from near the top.
export const WALL_ROWS = 5;
const WALL_TOP = 5.6;

export const insideWall = (rect: Rect) => insideRoom(rect) && rect.z + rect.depth <= WALL_ROWS;

/** World height of the middle of a wall piece, whose rect's z is its top row and depth its rows. */
export const wallCenterY = (rect: Rect) => WALL_TOP - rect.z - rect.depth / 2;

/** The column and row that put a wall piece's middle nearest a point on the wall, kept on the wall. */
export const wallCellNear = (worldX: number, worldY: number, [width, rows]: Size): GridCell => [
  Math.min(ROOM_CELLS - width, Math.max(0, Math.round(worldX + ROOM_HALF - width / 2))),
  Math.min(WALL_ROWS - rows, Math.max(0, Math.round(WALL_TOP - worldY - rows / 2))),
];

/** The free spot nearest the middle of the room, so a new piece lands where it can be seen. */
export const firstFreeCell = (size: Size, others: readonly Rect[]): GridCell | null => {
  const [width, depth] = size;
  let best: GridCell | null = null;
  let bestDistance = Infinity;
  for (let z = 0; z + depth <= ROOM_CELLS; z++) {
    for (let x = 0; x + width <= ROOM_CELLS; x++) {
      if (!canPlace({ x, z, width, depth }, others)) continue;
      const distance = Math.hypot(x + width / 2 - ROOM_HALF, z + depth / 2 - ROOM_HALF);
      if (distance < bestDistance) {
        best = [x, z];
        bestDistance = distance;
      }
    }
  }
  return best;
};
