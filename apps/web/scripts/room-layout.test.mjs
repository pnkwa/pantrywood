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
  for (const kind of ["fridge", "pantryShelf", "counter", "suppliesCabinet", "crates", "riceBin", "basket"]) {
    assert.equal(storageKindFor({ name: newStorageName(kind, []), isFreezer: false }), kind, kind);
  }
  assert.equal(newStorageName("pantryShelf", ["Pantry shelf 2", "pantry shelf 3"]), "Pantry shelf 4");
});
