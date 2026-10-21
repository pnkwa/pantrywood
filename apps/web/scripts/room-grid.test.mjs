import assert from "node:assert/strict";
import { test } from "node:test";
import { canPlace, cellNear, firstFreeCell, insideWall, rectFor, rotatedSize, wallCellNear, wallCenterY, worldCenter } from "../src/lib/room/grid.ts";

const fridge = rectFor([4, 0], [2, 2], 0);

test("a quarter turn swaps width and depth", () => {
  assert.deepEqual(rotatedSize([3, 1], 1), [1, 3]);
  assert.deepEqual(rotatedSize([3, 1], 2), [3, 1]);
});

test("pieces can't overlap or leave the room", () => {
  assert.equal(canPlace(rectFor([5, 1], [1, 1], 0), [fridge]), false);
  assert.equal(canPlace(rectFor([6, 0], [1, 1], 0), [fridge]), true);
  assert.equal(canPlace(rectFor([8, 0], [3, 1], 0), []), false);
  assert.equal(canPlace(rectFor([9, 0], [3, 1], 1), []), true);
});

test("touching edges is not an overlap", () => {
  assert.equal(canPlace(rectFor([2, 0], [2, 2], 0), [fridge]), true);
});

test("cells and world positions line up", () => {
  assert.deepEqual(worldCenter(fridge), [0, -4]);
  assert.deepEqual(cellNear(0, -4, [2, 2]), [4, 0]);
  assert.deepEqual(cellNear(-9, 9, [2, 2]), [0, 8]);
});

test("a new piece lands nearest the middle, around taken cells", () => {
  assert.deepEqual(firstFreeCell([2, 2], []), [4, 4]);
  assert.deepEqual(firstFreeCell([2, 2], [rectFor([4, 4], [2, 2], 0)]), [4, 2]);
  assert.equal(firstFreeCell([11, 1], []), null);
});

test("wall pieces snap to a column and a row, and stay on the wall", () => {
  assert.deepEqual(wallCellNear(2.5, 3.6, [3, 2]), [6, 1]);
  assert.deepEqual(wallCellNear(-9, 9, [1, 1]), [0, 0]);
  assert.deepEqual(wallCellNear(9, -9, [2, 2]), [8, 3]);
  assert.ok(Math.abs(wallCenterY(rectFor([6, 1], [3, 2], 0)) - 3.6) < 1e-9);
  assert.equal(insideWall(rectFor([0, 4], [1, 2], 0)), false);
});
