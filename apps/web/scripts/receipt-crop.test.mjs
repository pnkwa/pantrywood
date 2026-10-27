import assert from "node:assert/strict";
import { test } from "node:test";
import { isWholePhoto, moveCorner, WHOLE_PHOTO, yInCrop } from "../src/lib/receipt/crop.ts";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test("moving a corner resizes the frame from that corner only", () => {
  const rect = moveCorner(WHOLE_PHOTO, "topLeft", 0.2, 0.1);
  close(rect.x, 0.2);
  close(rect.y, 0.1);
  close(rect.x + rect.width, 1);
  close(rect.y + rect.height, 1);
  const smaller = moveCorner(rect, "bottomRight", -0.3, -0.2);
  close(smaller.x + smaller.width, 0.7);
  close(smaller.y + smaller.height, 0.8);
});

test("the frame stays inside the photo and never collapses", () => {
  const outside = moveCorner(WHOLE_PHOTO, "topLeft", -0.5, -0.5);
  assert.deepEqual(outside, WHOLE_PHOTO);
  const crushed = moveCorner(WHOLE_PHOTO, "bottomRight", -2, -2);
  close(crushed.width, 0.1);
  close(crushed.height, 0.1);
});

test("line heights move into the cropped picture, and the whole photo is recognised", () => {
  const rect = { x: 0.2, y: 0.25, width: 0.5, height: 0.5 };
  close(yInCrop(0.5, rect), 0.5);
  close(yInCrop(0.25, rect), 0);
  close(yInCrop(0.9, rect), 1);
  assert.ok(isWholePhoto(WHOLE_PHOTO));
  assert.ok(!isWholePhoto(rect));
});
