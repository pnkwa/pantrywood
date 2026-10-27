import assert from "node:assert/strict";
import { test } from "node:test";
import { dropDestination, isPutAwayName, itemRows, PUT_AWAY_NAME } from "../src/lib/pantry/put-away.ts";

const item = (name, amount = 1, inFreezer = false) => ({ key: name, name, amount, inFreezer });

test("the holding place is found by its name, whatever the case or spacing", () => {
  assert.ok(isPutAwayName(PUT_AWAY_NAME));
  assert.ok(isPutAwayName("  to put away "));
  assert.ok(!isPutAwayName("Pantry Shelf"));
});

test("items waiting to be put away come first, then placed items by name with where they are", () => {
  const rows = itemRows(
    [item("Rice"), item("Eggs"), item("Gone", 0)],
    [
      { name: "Pantry Shelf", items: [item("Soy sauce"), item("Empty", 0)] },
      { name: "Fridge", items: [item("Milk"), item("Ice cream", 1, true)] },
    ],
  );
  assert.deepEqual(
    rows.map((row) => [row.item.name, row.place]),
    [
      ["Eggs", null],
      ["Rice", null],
      ["Ice cream", "Fridge · freezer"],
      ["Milk", "Fridge"],
      ["Soy sauce", "Pantry Shelf"],
    ],
  );
});

test("a drop on a shelf goes to the piece, and a drop on a freezer shelf to its freezer", () => {
  assert.equal(dropDestination({ zone: "main", locationId: 1, locationIsFreezer: false, freezerId: 7 }), 1);
  assert.equal(dropDestination({ zone: "freezer", locationId: 1, locationIsFreezer: false, freezerId: 7 }), 7);
  assert.equal(dropDestination({ zone: "freezer", locationId: 7, locationIsFreezer: true, freezerId: 7 }), 7);
  assert.equal(dropDestination({ zone: "freezer", locationId: 1, locationIsFreezer: false, freezerId: null }), null);
});
