import assert from "node:assert/strict";
import { test } from "node:test";
import { sceneItemsFor } from "../src/lib/room/items.ts";

const shapeOf = (name, unitName, groupName = "Produce", kind = "food") =>
  sceneItemsFor([
    { key: "1-1", productId: 1, name, unitName, groupName, kind, amount: 1, status: "fresh", isRunningLow: false },
  ])[0].shape;

test("fresh food gets its own model", () => {
  assert.equal(shapeOf("Eggs", "pcs", "Dairy & eggs"), "egg");
  assert.equal(shapeOf("Kyuri cucumber", "pcs"), "cucumber");
  assert.equal(shapeOf("Bananas", "bunch"), "banana");
  assert.equal(shapeOf("Thai basil", "bunch"), "greens");
  assert.equal(shapeOf("Sourdough loaf", "pcs", "Rice & grains"), "bread");
  assert.equal(shapeOf("Chicken breast", "pack", "Meat & fish"), "meat");
});

test("names are checked in order and packaging wins", () => {
  assert.equal(shapeOf("Egg tofu", "pcs", "Dairy & eggs"), "eggTofu");
  assert.equal(shapeOf("Silken tofu", "pcs", "Dairy & eggs"), "tofu");
  assert.equal(shapeOf("Orange juice", "carton", "Drinks"), "carton");
  assert.equal(shapeOf("Coconut milk", "can", "Pantry staples"), "can");
  assert.equal(shapeOf("Shampoo", "bottle", "Bathroom", "supply"), "bottle");
});

test("pantry staples get their own model", () => {
  assert.equal(shapeOf("Fish sauce", "bottle", "Sauces & seasoning"), "sauceBottle");
  assert.equal(shapeOf("Greek yogurt", "cup", "Dairy & eggs"), "cup");
  assert.equal(shapeOf("Vanilla ice cream", "cup", "Frozen"), "cup");
  assert.equal(shapeOf("Instant noodles", "pack", "Pantry staples"), "noodles");
  assert.equal(shapeOf("Egg tofu", "tube", "Dairy & eggs"), "eggTofu");
  assert.equal(shapeOf("Butter", "pack", "Dairy & eggs"), "butter");
  assert.equal(shapeOf("Shrimp", "bag", "Meat & fish"), "shrimp");
  assert.equal(shapeOf("Frozen dumplings", "bag", "Frozen"), "dumplings");
  assert.equal(shapeOf("Frozen edamame", "bag", "Frozen"), "edamame");
  assert.equal(shapeOf("Jasmine rice", "kg", "Rice & grains"), "riceSack");
  assert.equal(shapeOf("Toothpaste", "tube", "Bathroom", "supply"), "toothpaste");
});

test("snacks keep their packaging even when named after food", () => {
  assert.equal(shapeOf("Shrimp crackers", "bag", "Snacks"), "bag");
  assert.equal(shapeOf("Rice crackers", "pack", "Snacks"), "box");
});
