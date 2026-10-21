import assert from "node:assert/strict";
import { test } from "node:test";
import { LEAVES_FOR_USING_IN_TIME, leavesForUsing } from "../src/lib/room/leaves.ts";

test("using something up before or on its date earns leaves", () => {
  assert.equal(leavesForUsing("2026-10-20", "2026-10-13"), LEAVES_FOR_USING_IN_TIME);
  assert.equal(leavesForUsing("2026-10-13", "2026-10-13"), LEAVES_FOR_USING_IN_TIME);
});

test("past its date, never expiring or undated earns nothing", () => {
  assert.equal(leavesForUsing("2026-10-12", "2026-10-13"), 0);
  assert.equal(leavesForUsing("2999-12-31", "2026-10-13"), 0);
  assert.equal(leavesForUsing(null, "2026-10-13"), 0);
});
