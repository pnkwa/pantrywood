import assert from "node:assert/strict";
import { test } from "node:test";
import { daylightAt, minutesNow, withLightsOff } from "../src/lib/room/daylight.ts";

const MORNING = { sunColor: "#FFEBCF", sunIntensity: 2.3, skyIntensity: 2.6, ambientIntensity: 0.28, glow: 0.15, moonlight: 0 };
const numbers = (light) => [light.sunIntensity, light.skyIntensity, light.ambientIntensity, light.glow];

test("midday matches today's room light", () => {
  assert.deepEqual(daylightAt(720), MORNING);
});

test("evening is dimmer with full glow", () => {
  const evening = daylightAt(1200);
  assert.equal(evening.glow, 1);
  assert.ok(evening.skyIntensity < MORNING.skyIntensity);
});

test("late afternoon sits between", () => {
  assert.equal(daylightAt(1020).glow, 0.6);
  assert.equal(daylightAt(1020).sunColor, "#FFCB8E");
});

test("no jump across midnight", () => {
  assert.ok(Math.abs(daylightAt(1439).glow - daylightAt(0).glow) < 0.01);
});

test("no jump at a keyframe edge", () => {
  const before = numbers(daylightAt(1019));
  const after = numbers(daylightAt(1021));
  before.forEach((value, index) => assert.ok(Math.abs(value - after[index]) < 0.05));
});

test("dawn blends from night to morning", () => {
  const dawn = daylightAt(390);
  assert.ok(dawn.glow < 1 && dawn.glow > MORNING.glow);
});

test("minutes since local midnight", () => {
  assert.equal(minutesNow(new Date(2026, 9, 29, 17, 30)), 1050);
});

test("light a hair away counts as settled, even when the colour is a step off", async () => {
  const { nearlySame } = await import("../src/lib/room/daylight.ts");
  const day = daylightAt(720);
  assert.equal(nearlySame(day, { ...day, sunColor: "#FEEACE", glow: day.glow + 0.001 }), true);
  assert.equal(nearlySame(day, daylightAt(1200)), false);
});

test("lights off at night: the lamps go out, the room dims and moonlight comes in at the window", () => {
  const lit = daylightAt(1200);
  const dark = withLightsOff(lit);
  assert.equal(dark.glow, 0);
  assert.equal(dark.moonlight, 1);
  assert.ok(dark.skyIntensity < lit.skyIntensity * 0.7);
  assert.ok(dark.ambientIntensity < lit.ambientIntensity);
});

test("lights off by day: only the lamps go out, the sun still lights the room", () => {
  const lit = daylightAt(720);
  const dark = withLightsOff(lit);
  assert.equal(dark.glow, 0);
  assert.ok(dark.skyIntensity > lit.skyIntensity * 0.9);
  assert.ok(dark.moonlight < 0.2);
});
