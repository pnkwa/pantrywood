// No "@/" imports: scripts/shelf-place.test.mjs runs this file directly with Node.

/**
 * Where things stand along a shelf, like on a real one: each item keeps the spot it was dropped at (its
 * centre, 0 = left end, 1 = right end) and takes up its own width of the shelf. Nothing overlaps within a row;
 * a deep shelf has a back row too (`row` 1), each packed on its own.
 */
export type ShelfSpot = { key: string; x: number; row?: number };

export const FRONT = 0;
export const BACK = 1;

/** How much of a shelf something of unknown shape takes. */
export const ITEM_WIDTH = 0.24;

/**
 * The share of a shelf `shelfWidth` scene units wide that an item `modelWidth` wide takes (its 3D model, copies
 * and all): the same width the room draws it at, so both views line up.
 */
export const footprintFor = (modelWidth: number, shelfWidth: number) => modelWidth / shelfWidth;

/** How big you may make an item, and the step the − / + buttons take. */
export const MIN_SIZE = 0.6;
export const MAX_SIZE = 1.5;
export const SIZE_STEP = 0.1;

/** The layer that puts an item in front of (or behind) everything else on its shelf, given the others' layers. */
export const layerFor = (otherLayers: readonly number[], direction: "front" | "back") =>
  direction === "front" ? Math.max(0, ...otherLayers) + 1 : Math.min(0, ...otherLayers) - 1;

const TURN_STEP = 45;

/** An item's turn on its shelf after one step left or right, in degrees (0–315). */
export const nextTurn = (turn: number, direction: "left" | "right") =>
  (((turn + (direction === "right" ? TURN_STEP : -TURN_STEP)) % 360) + 360) % 360;

/** A size you chose, kept within the limits and rounded to the nearest 5%. */
export const clampSize = (size: number) => Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, size)) * 20) / 20;

/** Each item's width on this shelf, by key. */
export type WidthOf = (key: string) => number;
const regular: WidthOf = () => ITEM_WIDTH;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const EPSILON = 1e-9;
const sumOf = (spots: readonly ShelfSpot[], widthOf: WidthOf) => spots.reduce((sum, spot) => sum + widthOf(spot.key), 0);

/** Old spots only had an order: spread them evenly once, left to right. */
export const spreadEvenly = (keys: readonly string[]): ShelfSpot[] =>
  keys.map((key, index) => ({ key, x: (index + 0.5) / keys.length }));

/**
 * Puts `key` at `x` (or as close as fits) and slides its neighbours aside just enough, keeping their order.
 * Returns null when the shelf is full. The item may already be on the shelf (a move along it).
 */
export const placeOnShelf = (spots: readonly ShelfSpot[], key: string, x: number, widthOf: WidthOf = regular): ShelfSpot[] | null => {
  const width = widthOf(key);
  const others = spots.filter((spot) => spot.key !== key);
  if (sumOf(others, widthOf) + width > 1 + EPSILON) return null;
  const target = clamp(x, width / 2, 1 - width / 2);
  const left = others.filter((spot) => spot.x < target).sort((first, second) => second.x - first.x);
  const right = others.filter((spot) => spot.x >= target).sort((first, second) => first.x - second.x);
  // Room for the neighbours on each side decides how far the dropped item itself may sit from the edges.
  const placedX = clamp(target, width / 2 + sumOf(left, widthOf), 1 - width / 2 - sumOf(right, widthOf));
  const result: ShelfSpot[] = [{ key, x: placedX }];
  let edge = placedX - width / 2;
  for (const spot of left) {
    const half = widthOf(spot.key) / 2;
    const spotX = Math.min(spot.x, edge - half);
    result.push({ key: spot.key, x: spotX });
    edge = spotX - half;
  }
  edge = placedX + width / 2;
  for (const spot of right) {
    const half = widthOf(spot.key) / 2;
    const spotX = Math.max(spot.x, edge + half);
    result.push({ key: spot.key, x: spotX });
    edge = spotX + half;
  }
  return result.sort((first, second) => first.x - second.x);
};

/** Where "Put here" drops something `width` wide: the first gap from the left wide enough, else the right end. */
export const firstFreeX = (spots: readonly ShelfSpot[], width = ITEM_WIDTH, widthOf: WidthOf = regular) => {
  const sorted = [...spots].sort((first, second) => first.x - second.x);
  let edge = 0;
  for (const spot of sorted) {
    const half = widthOf(spot.key) / 2;
    if (spot.x - half - edge >= width - EPSILON) return edge + width / 2;
    edge = spot.x + half;
  }
  return Math.min(edge + width / 2, 1);
};

/**
 * Spots for a shelf's items in order, from their saved positions (undefined when not saved). Items with a
 * position keep it; the rest take the first free gaps. A shelf with no positions at all is spread evenly.
 */
export const spotsFor = (keys: readonly string[], saved: readonly (number | undefined)[], widthOf: WidthOf = regular): ShelfSpot[] => {
  if (saved.every((x) => x === undefined)) return spreadEvenly(keys);
  let spots: ShelfSpot[] = keys.flatMap((key, index) => {
    const x = saved[index];
    return x === undefined ? [] : [{ key, x }];
  });
  keys.forEach((key, index) => {
    if (saved[index] !== undefined) return;
    // A full shelf still shows it, overlapping at the right end, rather than hiding stock.
    spots = placeOnShelf(spots, key, firstFreeX(spots, widthOf(key), widthOf), widthOf) ?? [...spots, { key, x: 1 - widthOf(key) / 2 }];
  });
  return spots;
};

const rowOf = (spot: ShelfSpot) => spot.row ?? FRONT;

/**
 * `placeOnShelf` within one row of a shelf: neighbours in that row slide aside, the other row stays put.
 * Null when that row is full.
 */
export const placeInRow = (spots: readonly ShelfSpot[], key: string, x: number, row: number, widthOf: WidthOf = regular): ShelfSpot[] | null => {
  const others = spots.filter((spot) => spot.key !== key);
  const placed = placeOnShelf(others.filter((spot) => rowOf(spot) === row), key, x, widthOf);
  if (!placed) return null;
  const rowSpots = placed.map((spot) => (row === FRONT ? { key: spot.key, x: spot.x } : { ...spot, row }));
  return [...others.filter((spot) => rowOf(spot) !== row), ...rowSpots].sort((first, second) => first.x - second.x);
};

/** `spotsFor` with each item in its saved row (front when unset); every row is laid out on its own. */
export const spotsInRows = (
  keys: readonly string[],
  saved: readonly (number | undefined)[],
  rows: readonly (number | undefined)[],
  widthOf: WidthOf = regular,
): ShelfSpot[] =>
  [FRONT, BACK].flatMap((row) => {
    const inRow = keys.map((key, index) => ({ key, x: saved[index], row: rows[index] ?? FRONT })).filter((entry) => entry.row === row);
    const spots = spotsFor(inRow.map((entry) => entry.key), inRow.map((entry) => entry.x), widthOf);
    return row === FRONT ? spots : spots.map((spot) => ({ ...spot, row }));
  });
