import assert from "node:assert/strict";
import { test } from "node:test";
import { newStorageName, placeLocations, storageKindFor } from "../src/lib/room/layout.ts";

const location = (id, name) => ({ id, name, isFreezer: false });

test("a second piece of the same kind stays that kind", () => {
  const placed = placeLocations([location(1, "Fridge"), location(2, "Garage fridge"), location(3, "Pantry shelf"), location(4, "Pantry shelf 2")]);
  assert.deepEqual(placed.map((piece) => piece.kind), ["fridge", "fridge", "pantryShelf", "pantryShelf"]);
});

test("extra maker shelves become baskets, and baskets never drop out", () => {
  const names = ["Maker shelf", "Filament", ...Array.from({ length: 6 }, (_, index) => `Misc ${index}`)];
  const placed = placeLocations(names.map((name, index) => location(index, name)));
  assert.equal(placed.length, names.length);
  assert.deepEqual(placed.slice(0, 2).map((piece) => piece.kind), ["makerShelf", "basket"]);
});

test("a new location's name reads back as its kind and skips taken numbers", () => {
  for (const kind of ["fridge", "pantryShelf", "counter", "suppliesCabinet", "basket"]) {
    assert.equal(storageKindFor({ name: newStorageName(kind, []), isFreezer: false }), kind, kind);
  }
  assert.equal(newStorageName("pantryShelf", ["Pantry shelf 2", "pantry shelf 3"]), "Pantry shelf 4");
});

test("rice, snack and crate locations become pantry shelves", () => {
  for (const name of ["Rice Bin", "Snack Box", "Crates", "ข้าวสาร"]) assert.equal(storageKindFor({ name, isFreezer: false }), "pantryShelf", name);
});

test("extra pantry locations become baskets, so only one tall pantry shelf stands in the room", () => {
  const placed = placeLocations([location(1, "Pantry Shelf"), location(2, "Snack Box"), location(3, "Rice Bin")]);
  assert.deepEqual(placed.map((piece) => piece.kind), ["pantryShelf", "basket", "basket"]);
  assert.notDeepEqual(placed[1].position, placed[2].position);
});

test("a snack box with no pantry shelf to share with still gets the tall shelf", () => {
  assert.deepEqual(placeLocations([location(1, "Snack Box"), location(2, "Fridge")]).map((piece) => piece.kind), ["pantryShelf", "fridge"]);
});

test("a sink location is a counter with the sink, in its own spot beside the counter", () => {
  const placed = placeLocations([location(1, "Counter"), location(2, "Sink cabinet")]);
  assert.deepEqual(placed.map((piece) => [piece.kind, piece.sink]), [["counter", false], ["counter", true]]);
  assert.notDeepEqual(placed[0].position, placed[1].position);
});

test("a wall shelf location hangs on the wall, not as a pantry shelf", () => {
  assert.equal(storageKindFor({ name: "Wall Shelf", isFreezer: false }), "makerShelf");
});

test("a wall cabinet hangs on the wall; the home supplies cabinet stays on the floor", () => {
  assert.equal(storageKindFor({ name: "Wall Cabinet", isFreezer: false }), "wallCabinet");
  assert.equal(storageKindFor({ name: "Home Supplies", isFreezer: false }), "suppliesCabinet");
  const placed = placeLocations([location(1, "Wall Cabinet"), location(2, "Wall cupboard")]);
  assert.deepEqual(placed.map((piece) => piece.kind), ["wallCabinet", "basket"]);
});

test("a table location is a table, and a new one reads back as one", () => {
  assert.equal(storageKindFor({ name: "Dining Table", isFreezer: false }), "table");
  assert.equal(storageKindFor({ name: "โต๊ะกินข้าว", isFreezer: false }), "table");
  assert.equal(storageKindFor({ name: newStorageName("table", []), isFreezer: false }), "table");
});
