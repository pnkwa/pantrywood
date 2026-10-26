import assert from "node:assert/strict";
import { test } from "node:test";
import { freeCount, ownAll, ownedCount, placedCount } from "../src/lib/room/inventory.ts";

const room = { owned: ["rug", "rug", "lamp"], decor: [{ itemId: "rug" }] };

test("each copy bought counts, and each placement uses one", () => {
  assert.equal(ownedCount(room, "rug"), 2);
  assert.equal(placedCount(room, "rug"), 1);
  assert.equal(freeCount(room, "rug"), 1);
  assert.equal(freeCount(room, "lamp"), 1);
  assert.equal(freeCount(room, "clock"), 0);
});

test("a free count never goes below zero", () => {
  assert.equal(freeCount({ owned: [], decor: [{ itemId: "rug" }] }, "rug"), 0);
});

test("owning a theme adds what's missing once and keeps extra copies", () => {
  assert.deepEqual(ownAll(["rug", "rug"], ["rug", "oak", "oak", "tatami"]), ["rug", "rug", "oak", "tatami"]);
});
