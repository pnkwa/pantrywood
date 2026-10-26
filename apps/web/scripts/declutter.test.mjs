import assert from "node:assert/strict";
import { test } from "node:test";
import { crowdedTags, tagRank } from "../src/lib/room/declutter.ts";

const tag = (id, left, top, rank) => ({ id, left, top, width: 120, height: 24, rank });

test("of two overlapping tags, the less urgent one shrinks", () => {
  const crowded = crowdedTags([tag(1, 0, 0, 1000), tag(2, 60, 10, 3000)]);
  assert.deepEqual([...crowded], [1]);
});

test("tags apart from each other all stay full size", () => {
  assert.equal(crowdedTags([tag(1, 0, 0, 1), tag(2, 200, 0, 2), tag(3, 0, 100, 3)]).size, 0);
});

test("a shrunk tag no longer blocks the ones behind it", () => {
  // 3 covers 2, and 2 would cover 1; with 2 shrunk, 1 has room.
  const crowded = crowdedTags([tag(1, 0, 0, 1), tag(2, 100, 0, 2), tag(3, 200, 0, 3)]);
  assert.deepEqual([...crowded], [2]);
});

test("past its date outranks use soon, which outranks running low", () => {
  const expired = tagRank({ expired: 1, useSoon: 0, low: 0, itemCount: 1 });
  const soon = tagRank({ expired: 0, useSoon: 5, low: 0, itemCount: 40 });
  const low = tagRank({ expired: 0, useSoon: 0, low: 3, itemCount: 40 });
  assert.ok(expired > soon && soon > low && low > tagRank({ expired: 0, useSoon: 0, low: 0, itemCount: 40 }));
});
