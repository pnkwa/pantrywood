import assert from "node:assert/strict";
import { test } from "node:test";
import { BACK, firstFreeX, footprintFor, FRONT, ITEM_WIDTH, placeInRow, placeOnShelf, spotsFor, spotsInRows, spreadEvenly } from "../src/lib/inside/shelf-place.ts";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
const xOf = (spots, key) => spots.find((spot) => spot.key === key)?.x;
const noOverlaps = (spots) => {
  const sorted = [...spots].sort((first, second) => first.x - second.x);
  for (let index = 1; index < sorted.length; index++) assert.ok(sorted[index].x - sorted[index - 1].x >= ITEM_WIDTH - 1e-9);
  for (const spot of sorted) assert.ok(spot.x >= ITEM_WIDTH / 2 - 1e-9 && spot.x <= 1 - ITEM_WIDTH / 2 + 1e-9);
};

test("an item stays where it was dropped on an empty shelf, and never hangs over an end", () => {
  close(xOf(placeOnShelf([], "milk", 0.3), "milk"), 0.3);
  close(xOf(placeOnShelf([], "milk", 0), "milk"), ITEM_WIDTH / 2);
  close(xOf(placeOnShelf([], "milk", 1), "milk"), 1 - ITEM_WIDTH / 2);
});

test("neighbours slide aside just enough, and items far away don't move", () => {
  const spots = [{ key: "jam", x: 0.42 }, { key: "rice", x: 0.86 }];
  const placed = placeOnShelf(spots, "milk", 0.5);
  noOverlaps(placed);
  close(xOf(placed, "milk"), 0.5);
  close(xOf(placed, "jam"), 0.5 - ITEM_WIDTH);
  close(xOf(placed, "rice"), 0.86);
});

test("with no room between a neighbour and the end, the dropped item moves over instead of hanging off", () => {
  const half = ITEM_WIDTH / 2;
  const placed = placeOnShelf([{ key: "jam", x: half }, { key: "rice", x: half + ITEM_WIDTH }], "milk", half + ITEM_WIDTH * 0.8);
  noOverlaps(placed);
  close(xOf(placed, "jam"), half);
  close(xOf(placed, "milk"), half + ITEM_WIDTH);
  close(xOf(placed, "rice"), half + 2 * ITEM_WIDTH);
});

test("moving an item along the shelf keeps one copy of it", () => {
  const placed = placeOnShelf([{ key: "milk", x: 0.2 }, { key: "jam", x: 0.85 }], "milk", 0.55);
  assert.equal(placed.length, 2);
  close(xOf(placed, "milk"), 0.55);
  noOverlaps(placed);
});

test("a full shelf takes nothing more", () => {
  const full = spreadEvenly(Array.from({ length: Math.floor(1 / ITEM_WIDTH) }, (_, index) => `item${index}`));
  assert.equal(placeOnShelf(full, "milk", 0.5), null);
  assert.ok(placeOnShelf(full, "item0", 0.5));
});

test("old order-only spots spread evenly, and Put here finds the first gap from the left", () => {
  assert.deepEqual(spreadEvenly(["a", "b"]).map((spot) => spot.x), [0.25, 0.75]);
  close(firstFreeX([]), ITEM_WIDTH / 2);
  close(firstFreeX([{ key: "a", x: ITEM_WIDTH / 2 }]), ITEM_WIDTH * 1.5);
  close(firstFreeX([{ key: "a", x: 0.5 }]), ITEM_WIDTH / 2);
});

test("saved positions are kept and an item without one takes the first free gap", () => {
  const spots = spotsFor(["jam", "milk", "rice"], [0.5, undefined, 0.9]);
  close(xOf(spots, "jam"), 0.5);
  close(xOf(spots, "rice"), 0.9);
  close(xOf(spots, "milk"), ITEM_WIDTH / 2);
  assert.deepEqual(spotsFor(["a", "b"], [undefined, undefined]).map((spot) => spot.x), [0.25, 0.75]);
});

test("items take the room their model needs: three wide bags fill a shelf, slim bottles fit more", () => {
  const sack = footprintFor(0.32, 1.25);
  const bottle = footprintFor(0.22, 1.25);
  assert.ok(sack > ITEM_WIDTH && bottle < ITEM_WIDTH);
  const widthOf = (key) => (key.startsWith("sack") ? sack : bottle);
  let spots = [];
  for (const key of ["sack1", "sack2", "sack3"]) spots = placeOnShelf(spots, key, 0.5, widthOf);
  assert.equal(placeOnShelf(spots, "sack4", 0.5, widthOf), null);
  let bottles = [];
  for (const key of ["b1", "b2", "b3", "b4", "b5"]) bottles = placeOnShelf(bottles, key, 0.5, widthOf);
  assert.equal(bottles.length, 5);
  const sorted = [...bottles].sort((first, second) => first.x - second.x);
  for (let index = 1; index < sorted.length; index++) assert.ok(sorted[index].x - sorted[index - 1].x >= bottle - 1e-9);
});

test("in a narrower section an item takes more of it", () => {
  close(footprintFor(0.32, 0.92), (0.32 / 0.92));
  assert.ok(footprintFor(0.32, 0.92) > footprintFor(0.32, 1.9));
});

test("a spot is as wide as the room draws the model, on any shelf", () => {
  // Three eggs (0.6 together) on the pantry shelf's 2.64-wide boards.
  close(footprintFor(0.6, 2.64) * 2.64, 0.6);
});

test("a size you choose stays within limits and rounds to 5%", async () => {
  const { clampSize, MAX_SIZE, MIN_SIZE } = await import("../src/lib/inside/shelf-place.ts");
  assert.equal(clampSize(3), MAX_SIZE);
  assert.equal(clampSize(0.1), MIN_SIZE);
  assert.equal(clampSize(1.234), 1.25);
});

test("bring to front and send to back put an item past everything else on its shelf", async () => {
  const { layerFor } = await import("../src/lib/inside/shelf-place.ts");
  assert.equal(layerFor([], "front"), 1);
  assert.equal(layerFor([0, 2, -1], "front"), 3);
  assert.equal(layerFor([0, 2, -1], "back"), -2);
  assert.equal(layerFor([3], "back"), -1);
});

test("turning steps by 45° and wraps around", async () => {
  const { nextTurn } = await import("../src/lib/inside/shelf-place.ts");
  assert.equal(nextTurn(0, "right"), 45);
  assert.equal(nextTurn(315, "right"), 0);
  assert.equal(nextTurn(0, "left"), 315);
  assert.equal(nextTurn(90, "left"), 45);
});

test("a back-row drop slides only back-row neighbours, and the front row stays put", () => {
  const spots = [{ key: "milk", x: 0.5 }, { key: "jam", x: 0.5, row: BACK }];
  const placed = placeInRow(spots, "eggs", 0.5, BACK);
  close(xOf(placed, "milk"), 0.5);
  assert.equal(placed.find((spot) => spot.key === "eggs")?.row, BACK);
  noOverlaps(placed.filter((spot) => spot.row === BACK));
});

test("moving an item to the other row takes it out of its old one", () => {
  const placed = placeInRow([{ key: "milk", x: 0.3 }, { key: "jam", x: 0.7 }], "milk", 0.3, BACK);
  assert.deepEqual(placed.filter((spot) => (spot.row ?? FRONT) === FRONT).map((spot) => spot.key), ["jam"]);
  assert.equal(placed.find((spot) => spot.key === "milk")?.row, BACK);
});

test("a full row says so even when the other row has room", () => {
  const front = [0, 1, 2, 3].map((index) => ({ key: `front${index}`, x: (index + 0.5) / 4 }));
  assert.equal(placeInRow(front, "milk", 0.5, FRONT, () => 0.25), null);
  assert.ok(placeInRow(front, "milk", 0.5, BACK, () => 0.25));
});

test("each row lays out on its own, and an unset row means the front", () => {
  const spots = spotsInRows(["milk", "jam", "eggs"], [0.5, 0.5, undefined], [undefined, BACK, undefined]);
  close(xOf(spots, "jam"), 0.5);
  assert.equal(spots.find((spot) => spot.key === "jam")?.row, BACK);
  noOverlaps(spots.filter((spot) => spot.row === undefined));
});
