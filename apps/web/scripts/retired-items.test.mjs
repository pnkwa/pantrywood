import assert from "node:assert/strict";
import { test } from "node:test";
import { retireItems } from "../src/lib/room/retired-items.ts";

const room = (overrides) => ({
  owned: [],
  wallpaper: "square-tile-wainscot",
  floor: "cream-blue-checker",
  storage: [],
  decor: [],
  ...overrides,
});
const decor = (id, itemId, cell = [1, 1]) => ({ id, itemId, cell, rotation: 0 });

test("removed wallpaper, floor and pegboard become the kept ones", () => {
  const retired = retireItems(room({ wallpaper: "washi-grid", floor: "tatami", pegboard: "walnut-pegboard" }));
  assert.equal(retired.wallpaper, "square-tile-wainscot");
  assert.equal(retired.floor, "cream-blue-checker");
  assert.equal(retired.pegboard, "oat-pegboard");
});

test("removed storage styles become the kind's kept piece", () => {
  const placement = { locationId: 3, itemId: "oak-panel-fridge", cell: [2, 2], rotation: 90 };
  assert.deepEqual(retireItems(room({ storage: [placement] })).storage, [{ ...placement, itemId: "retro-fridge-cream" }]);
});

test("only one cat stays placed", () => {
  const retired = retireItems(room({ decor: [decor("a", "napping-cat", [3, 6]), decor("b", "midnight-cat"), decor("c", "cocoa-mask-cat")] }));
  assert.deepEqual(retired.decor, [decor("a", "napping-cat", [3, 6])]);
});

test("the cat bed is dropped", () => {
  const retired = retireItems(room({ decor: [decor("bed", "sleepy-cat-bed"), decor("rug", "jute-round-rug")] }));
  assert.deepEqual(retired.decor, [decor("rug", "butter-oval-rug")]);
});

test("owned has no removed ids and no duplicates", () => {
  const retired = retireItems(room({ owned: ["tatami", "cream-blue-checker", "midnight-cat", "napping-cat", "sleepy-cat-bed"] }));
  assert.deepEqual([...retired.owned].sort(), ["cream-blue-checker", "napping-cat"]);
});

test("unknown ids are left alone", () => {
  const retired = retireItems(room({ decor: [decor("x", "something-else")], owned: ["something-else"] }));
  assert.deepEqual(retired.decor, [decor("x", "something-else")]);
  assert.deepEqual(retired.owned, ["something-else"]);
});

test("every retired id is gone from the catalog and every target exists", async () => {
  const { RETIRED } = await import("../src/lib/room/retired-items.ts");
  const { CATALOG } = await import("../src/data/catalog.ts");
  const ids = new Set(CATALOG.map((item) => item.id));
  for (const [retired, kept] of Object.entries(RETIRED)) {
    assert.equal(ids.has(retired), false, `${retired} is still in the catalog`);
    if (kept !== null) assert.equal(ids.has(kept), true, `${kept} is missing`);
  }
});

test("copies already owned stay owned", () => {
  const retired = retireItems(room({ owned: ["butter-oval-rug", "butter-oval-rug", "jute-round-rug", "napping-cat"] }));
  assert.deepEqual(retired.owned, ["butter-oval-rug", "butter-oval-rug", "napping-cat"]);
});

test("a redesigned room starts from the new default arrangement", async () => {
  const { resetArrangement } = await import("../src/lib/room/retired-items.ts");
  const starter = [decor("starter-window", "gingham-window", [4, 0])];
  const saved = room({
    owned: ["napping-cat"],
    pegboard: "oat-pegboard",
    storage: [{ locationId: 1, itemId: "retro-fridge-cream", cell: [2, 2], rotation: 0 }],
    decor: [decor("mine", "napping-cat", [7, 7])],
  });
  const reset = resetArrangement(saved, starter);
  assert.deepEqual(reset.storage, []);
  assert.deepEqual(reset.decor, starter);
  assert.equal(reset.pegboard, "oat-pegboard");
  assert.deepEqual(reset.owned, ["napping-cat", "gingham-window"]);
});
