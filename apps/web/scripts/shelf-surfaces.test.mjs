import assert from "node:assert/strict";
import { test } from "node:test";
import { arrangesIn3d, shelfSurfaces } from "../src/lib/inside/surfaces.ts";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
const tiers = (tab, notches) => notches.map((notch, index) => ({ id: `${tab}-${index + 1}`, tab, type: "board", notch }));

test("the default pantry tiers sit on the 3D shelf's own boards", () => {
  const surfaces = shelfSurfaces("pantryShelf", tiers("main", [1, 3, 5, 7]));
  // The model's boards: tops at 3.6, 2.4, 1.2 and the base at 0.12.
  [3.6, 2.4, 1.2, 0.12].forEach((y, index) => close(surfaces[index].y, y));
});

test("a tier moved to another notch moves its board in 3D, and the cabinet's two tiers match its model", () => {
  close(shelfSurfaces("pantryShelf", tiers("main", [2]))[0].y, 3.0);
  const cabinet = shelfSurfaces("suppliesCabinet", tiers("main", [2, 5]));
  close(cabinet[0].y, 1.32);
  close(cabinet[1].y, 0.14);
});

test("other pieces still fill their shelves themselves", () => {
  assert.ok(arrangesIn3d("pantryShelf") && arrangesIn3d("suppliesCabinet"));
  assert.ok(!arrangesIn3d("fridge"));
  assert.deepEqual(shelfSurfaces("fridge", tiers("main", [1])), []);
});
