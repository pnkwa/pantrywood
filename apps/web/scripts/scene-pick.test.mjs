import assert from "node:assert/strict";
import { test } from "node:test";
import { pickScene, setScenePicker } from "../src/lib/inside/scene-pick.ts";

test("no scene, no pick", () => {
  setScenePicker(null);
  assert.equal(pickScene(10, 10), null);
});

test("a set picker answers", () => {
  setScenePicker((clientX) => (clientX > 5 ? { sectionId: "main-1", x: 0.25 } : null));
  assert.deepEqual(pickScene(10, 10), { sectionId: "main-1", x: 0.25 });
  assert.equal(pickScene(1, 10), null);
  setScenePicker(null);
});
