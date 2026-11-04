// No imports: scripts/daylight.test.mjs runs this file directly with Node.

/**
 * The storage room's light at one moment: the sun, the sky and fill light, how strongly lamps and the window glow
 * warm (0–1), and how much cool moonlight shows at the window instead (0–1, only with the lights switched off).
 */
export type Daylight = {
  sunColor: string;
  sunIntensity: number;
  skyIntensity: number;
  ambientIntensity: number;
  glow: number;
  moonlight: number;
};

// A strong sun over a softer fill: a bright room with clear light and shade.
const DAY: Daylight = { sunColor: "#FFEBCF", sunIntensity: 2.3, skyIntensity: 2.6, ambientIntensity: 0.28, glow: 0.15, moonlight: 0 };
const GOLDEN: Daylight = { sunColor: "#FFCB8E", sunIntensity: 2.4, skyIntensity: 2.3, ambientIntensity: 0.26, glow: 0.6, moonlight: 0 };
const NIGHT: Daylight = { sunColor: "#CDBEDD", sunIntensity: 1.2, skyIntensity: 2.0, ambientIntensity: 0.24, glow: 1, moonlight: 0 };

const DAY_MINUTES = 24 * 60;

/** Minutes since local midnight, and the light there; between two keyframes it blends, wrapping past midnight. */
const KEYFRAMES: readonly [minutes: number, light: Daylight][] = [
  [360, NIGHT],
  [420, DAY],
  [900, DAY],
  [1020, GOLDEN],
  [1140, NIGHT],
  [360 + DAY_MINUTES, NIGHT],
];

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

const channels = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

const mixColor = (from: string, to: string, amount: number) => {
  const target = channels(to);
  return `#${channels(from)
    .map((channel, index) => Math.round(lerp(channel, target[index] ?? channel, amount)).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
};

/** `amount` of the way from one light to another (0 = `from`, 1 = `to`). */
export const blendDaylight = (from: Daylight, to: Daylight, amount: number): Daylight => ({
  sunColor: mixColor(from.sunColor, to.sunColor, amount),
  sunIntensity: lerp(from.sunIntensity, to.sunIntensity, amount),
  skyIntensity: lerp(from.skyIntensity, to.skyIntensity, amount),
  ambientIntensity: lerp(from.ambientIntensity, to.ambientIntensity, amount),
  glow: lerp(from.glow, to.glow, amount),
  moonlight: lerp(from.moonlight, to.moonlight, amount),
});

/**
 * The room with its lights switched off: the lamps and window glow go out, and the darker it is outside the more the
 * room dims and the window turns to cool moonlight. By day only the lamps change; the sun still lights the room.
 */
export const withLightsOff = (light: Daylight): Daylight => {
  // How far into the evening it is: the clock's glow runs from 0.15 at midday to 1 at night.
  const night = Math.max(0, Math.min(1, (light.glow - 0.15) / 0.85));
  return {
    sunColor: mixColor(light.sunColor, "#9FB4E0", night),
    sunIntensity: light.sunIntensity * (1 - night * 0.45),
    skyIntensity: light.skyIntensity * (1 - night * 0.5),
    ambientIntensity: light.ambientIntensity * (1 - night * 0.4),
    glow: 0,
    moonlight: night,
  };
};

export const daylightAt = (minutes: number): Daylight => {
  // Before 06:00 counts as the end of the previous night, so the night keyframes wrap.
  const time = minutes < 360 ? minutes + DAY_MINUTES : minutes;
  const nextIndex = KEYFRAMES.findIndex(([at]) => at >= time);
  const next = KEYFRAMES[nextIndex];
  const previous = KEYFRAMES[nextIndex - 1];
  if (!next) return NIGHT;
  if (!previous) return next[1];
  return blendDaylight(previous[1], next[1], (time - previous[0]) / (next[0] - previous[0]));
};

/** Close enough to stop easing: numbers within 0.002, colour channels within 2 (rounding stalls an eased colour short). */
export const nearlySame = (shown: Daylight, target: Daylight) => {
  const targetChannels = channels(target.sunColor);
  return (
    channels(shown.sunColor).every((channel, index) => Math.abs(channel - (targetChannels[index] ?? channel)) <= 2) &&
    [
      [shown.sunIntensity, target.sunIntensity],
      [shown.skyIntensity, target.skyIntensity],
      [shown.ambientIntensity, target.ambientIntensity],
      [shown.glow, target.glow],
      [shown.moonlight, target.moonlight],
    ].every(([from = 0, to = 0]) => Math.abs(from - to) < 0.002)
  );
};

export const minutesNow = (date: Date) => date.getHours() * 60 + date.getMinutes();
