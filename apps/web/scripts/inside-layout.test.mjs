import assert from "node:assert/strict";
import { test } from "node:test";
import { removeWhiteBackground } from "../src/lib/inside/cutout.ts";
import {
  UNSORTED,
  addSection,
  arrange,
  defaultLayout,
  freeNotch,
  insideSpecFor,
  moveShelf,
  placeItem,
  removeSection,
  shelfBands,
} from "../src/lib/inside/layout.ts";

const fridge = insideSpecFor("fridge", false);
const milk = { key: "1-1", zone: "main" };
const eggs = { key: "1-2", zone: "main" };
const dumplings = { key: "7-12", zone: "freezer" };

test("unplaced items stand on the top shelf of a tab in their zone", () => {
  const arranged = arrange(fridge, defaultLayout(fridge), [milk, eggs, dumplings]);
  assert.deepEqual(arranged.get("main-1"), ["1-1", "1-2"]);
  assert.deepEqual(arranged.get("freezer-1"), ["7-12"]);
});

test("placing an item saves its spot and the order of its new neighbours", () => {
  const layout = defaultLayout(fridge);
  const moved = placeItem(layout, arrange(fridge, layout, [milk, eggs]), "1-2", "main-2", 0);
  const arranged = arrange(fridge, moved, [milk, eggs]);
  assert.deepEqual(arranged.get("main-1"), ["1-1"]);
  assert.deepEqual(arranged.get("main-2"), ["1-2"]);
  const reordered = placeItem(moved, arranged, "1-1", "main-2", 0);
  assert.deepEqual(arrange(fridge, reordered, [milk, eggs]).get("main-2"), ["1-1", "1-2"]);
});

test("a saved spot in the wrong zone is ignored, so freezer stock never shows on a fridge shelf", () => {
  const layout = { ...defaultLayout(fridge), slots: { "7-12": { section: "main-2", order: 0 } } };
  assert.deepEqual(arrange(fridge, layout, [dumplings]).get("freezer-1"), ["7-12"]);
});

test("shelves move along free notches only", () => {
  const layout = defaultLayout(fridge);
  assert.equal(moveShelf(layout, fridge, "main-1", 3), null);
  assert.equal(moveShelf(layout, fridge, "main-1", 6), null);
  assert.equal(moveShelf(layout, fridge, "main-1", 2)?.sections.find((section) => section.id === "main-1")?.notch, 2);
});

test("a new shelf takes the free notch nearest the middle", () => {
  const layout = defaultLayout(fridge);
  const main = fridge.tabs[0];
  assert.equal(freeNotch(layout, main), 2);
  const added = addSection(layout, fridge, "main", "new-shelf");
  assert.equal(added?.sections.find((section) => section.id === "new-shelf")?.notch, 2);
});

test("removing a shelf moves its items to Unsorted; a removed bag empties into the loose pile", () => {
  const layout = defaultLayout(fridge);
  const removed = removeSection(layout, fridge, arrange(fridge, layout, [milk]), "main-1");
  assert.deepEqual(arrange(fridge, removed, [milk]).get(UNSORTED), ["1-1"]);

  const basket = insideSpecFor("basket", false);
  const withBag = addSection(defaultLayout(basket), basket, "main", "bag-1");
  const bagged = placeItem(withBag, arrange(basket, withBag, [milk]), "1-1", "bag-1", 0);
  const emptied = removeSection(bagged, basket, arrange(basket, bagged, [milk]), "bag-1");
  assert.deepEqual(arrange(basket, emptied, [milk]).get("main-loose-1"), ["1-1"]);
});

test("each shelf's band runs from the shelf above down to its own line", () => {
  const bands = shelfBands(defaultLayout(fridge).sections.filter((section) => section.tab === "main"), 6);
  assert.deepEqual(
    bands.map((band) => [band.top, band.bottom]),
    [[0, 2 / 6], [2 / 6, 4 / 6], [4 / 6, 1]],
  );
});

test("only white touching the edge is cleared, so a white label inside the item stays", () => {
  const white = [255, 255, 255, 255];
  const red = [200, 40, 40, 255];
  // 5 × 5: a red ring with a white centre, on a white background.
  const pixels = new Uint8ClampedArray(
    [
      [white, white, white, white, white],
      [white, red, red, red, white],
      [white, red, white, red, white],
      [white, red, red, red, white],
      [white, white, white, white, white],
    ].flat(2),
  );
  removeWhiteBackground(pixels, 5, 5);
  const alphaAt = (x, y) => pixels[(y * 5 + x) * 4 + 3];
  assert.equal(alphaAt(0, 0), 0);
  assert.equal(alphaAt(1, 1), 255);
  assert.equal(alphaAt(2, 2), 255);
});

test("the default icon comes from the name first, then the freezer, the group and the unit", async () => {
  const { iconFor } = await import("../src/lib/inside/icon-for.ts");
  const item = (fields) => ({ name: "", thaiName: null, groupName: "", unitName: "", inFreezer: false, ...fields });
  assert.equal(iconFor(item({ name: "Fish sauce" })), "fishSauce");
  assert.equal(iconFor(item({ name: "Something", thaiName: "น้ำปลา" })), "fishSauce");
  assert.equal(iconFor(item({ name: "Dumplings", inFreezer: true })), "frozenBag");
  assert.equal(iconFor(item({ name: "Kimchi", groupName: "Sauces & condiments" })), "squeezeSauce");
  assert.equal(iconFor(item({ name: "Mystery", unitName: "bottle" })), "water");
  assert.equal(iconFor(item({ name: "Mystery" })), "paperBag");
});
