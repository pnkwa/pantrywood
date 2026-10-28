import assert from "node:assert/strict";
import { test } from "node:test";
import { fridgeSurfaces, PICK_HEIGHT, pickHeightFor } from "../src/lib/inside/fridge-surfaces.ts";
import { defaultLayout, insideSpecFor } from "../src/lib/inside/layout.ts";

const sections = defaultLayout(insideSpecFor("fridge", false)).sections;
const surfaces = fridgeSurfaces(sections);
const inTab = (tab) => surfaces.filter((surface) => sections.find((section) => section.id === surface.sectionId)?.tab === tab);
const DIVIDER = 3.28;

test("every default fridge section gets a surface", () => {
  assert.deepEqual(surfaces.map((surface) => surface.sectionId).sort(), sections.map((section) => section.id).sort());
  assert.equal(surfaces.length, 10);
});

test("main shelves sit between the crispers and the freezer divider", () => {
  const shelves = inTab("main").filter((surface) => surface.y > 0.3);
  assert.equal(shelves.length, 3);
  for (const shelf of shelves) assert.ok(shelf.y > 0.3 + 0.42 && shelf.y < DIVIDER);
});

test("freezer shelves sit above the divider", () => {
  for (const shelf of inTab("freezer")) {
    assert.ok(shelf.y >= DIVIDER - 1e-9);
    assert.equal(shelf.part, "freezer");
  }
});

test("crispers stand side by side without overlapping", () => {
  const [first, second] = inTab("main").filter((surface) => surface.part === "crisper");
  assert.ok(first && second && first.x + first.width < second.x);
});

test("a lower notch is a lower shelf", () => {
  const shelfAt = (notch) =>
    fridgeSurfaces([{ id: "s", tab: "main", type: "wire", notch }])[0];
  assert.ok(shelfAt(5).y < shelfAt(1).y);
});

test("door bins live on the door", () => {
  for (const bin of inTab("door")) assert.equal(bin.part, "door");
});

test("shelves stop short of the walls, so angled items don't hang past them", () => {
  for (const surface of surfaces.filter((surface) => surface.part !== "door")) {
    assert.ok(surface.x >= -0.85 - 1e-9 && surface.x + surface.width <= 0.85 + 1e-9);
  }
});

test("the space that picks a shelf stops at the shelf above it, so no two shelves share any of it", () => {
  const crowded = fridgeSurfaces([...sections, { id: "extra", tab: "freezer", type: "wire", notch: 2 }]);
  for (const surface of crowded) {
    const top = surface.y + pickHeightFor(crowded, surface);
    assert.ok(pickHeightFor(crowded, surface) <= PICK_HEIGHT);
    for (const other of crowded) {
      const sameSpace = (other.part === "door") === (surface.part === "door");
      const overlapX = other.x < surface.x + surface.width && other.x + other.width > surface.x;
      if (other !== surface && sameSpace && overlapX && other.y > surface.y) assert.ok(top <= other.y + 1e-9, `${surface.sectionId} reaches into ${other.sectionId}`);
    }
  }
});
