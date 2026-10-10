import { BoxGeometry, CylinderGeometry, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ItemShape } from "../types";

type PartColor = "body" | "accent" | `#${string}`;

export type Part = {
  geometry: () => BufferGeometry;
  offset: [number, number, number];
  color: PartColor;
};

const geometryCache = new Map<string, BufferGeometry>();

const sharedGeometry = (key: string, create: () => BufferGeometry) => () => {
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const geometry = create();
  geometryCache.set(key, geometry);
  return geometry;
};

const cylinder = (key: string, radius: number, height: number, segments = 16) =>
  sharedGeometry(
    key,
    () => new CylinderGeometry(radius, radius, height, segments),
  );

const cylinderAlongZ = (key: string, radius: number, height: number) =>
  sharedGeometry(key, () =>
    new CylinderGeometry(radius, radius, height, 20).rotateX(Math.PI / 2),
  );

const roundedBox = (
  key: string,
  width: number,
  height: number,
  depth: number,
  radius: number,
) =>
  sharedGeometry(
    key,
    () => new RoundedBoxGeometry(width, height, depth, 2, radius),
  );

/** Items stand on y = 0 and face +z. */
export const SHAPES: Record<
  ItemShape,
  { width: number; height: number; parts: Part[] }
> = {
  jar: {
    width: 0.3,
    height: 0.32,
    parts: [
      {
        geometry: cylinder("jar-body", 0.13, 0.26),
        offset: [0, 0.13, 0],
        color: "body",
      },
      {
        geometry: cylinder("jar-lid", 0.14, 0.06),
        offset: [0, 0.29, 0],
        color: "accent",
      },
    ],
  },
  can: {
    width: 0.26,
    height: 0.24,
    parts: [
      {
        geometry: cylinder("can-body", 0.11, 0.24),
        offset: [0, 0.12, 0],
        color: "#D9CCB0",
      },
      {
        geometry: cylinder("can-label", 0.113, 0.13),
        offset: [0, 0.12, 0],
        color: "body",
      },
    ],
  },
  carton: {
    width: 0.24,
    height: 0.38,
    parts: [
      {
        geometry: roundedBox("carton-body", 0.2, 0.32, 0.2, 0.03),
        offset: [0, 0.16, 0],
        color: "#FFFBF3",
      },
      {
        geometry: roundedBox("carton-band", 0.205, 0.14, 0.205, 0.02),
        offset: [0, 0.14, 0],
        color: "body",
      },
      {
        geometry: cylinder("carton-cap", 0.035, 0.05, 10),
        offset: [0, 0.345, 0.04],
        color: "accent",
      },
    ],
  },
  bag: {
    width: 0.32,
    height: 0.33,
    parts: [
      {
        geometry: roundedBox("bag-body", 0.3, 0.28, 0.15, 0.07),
        offset: [0, 0.14, 0],
        color: "body",
      },
      {
        geometry: roundedBox("bag-fold", 0.3, 0.05, 0.12, 0.02),
        offset: [0, 0.3, 0],
        color: "accent",
      },
    ],
  },
  box: {
    width: 0.32,
    height: 0.24,
    parts: [
      {
        geometry: roundedBox("box-body", 0.3, 0.24, 0.18, 0.03),
        offset: [0, 0.12, 0],
        color: "body",
      },
      {
        geometry: roundedBox("box-label", 0.16, 0.1, 0.01, 0.005),
        offset: [0, 0.13, 0.091],
        color: "#FFFBF3",
      },
    ],
  },
  roll: {
    width: 0.28,
    height: 0.24,
    parts: [
      {
        geometry: cylinder("roll-body", 0.13, 0.24, 20),
        offset: [0, 0.12, 0],
        color: "body",
      },
      {
        geometry: cylinder("roll-core", 0.04, 0.245, 10),
        offset: [0, 0.12, 0],
        color: "#C9A77C",
      },
    ],
  },
  bottle: {
    width: 0.22,
    height: 0.42,
    parts: [
      {
        geometry: cylinder("bottle-body", 0.09, 0.3),
        offset: [0, 0.15, 0],
        color: "body",
      },
      {
        geometry: cylinder("bottle-neck", 0.05, 0.06, 12),
        offset: [0, 0.33, 0],
        color: "body",
      },
      {
        geometry: cylinder("bottle-cap", 0.045, 0.06, 12),
        offset: [0, 0.39, 0],
        color: "accent",
      },
    ],
  },
  spool: {
    width: 0.38,
    height: 0.36,
    parts: [
      {
        geometry: cylinderAlongZ("spool-filament", 0.155, 0.11),
        offset: [0, 0.18, 0],
        color: "body",
      },
      {
        geometry: cylinderAlongZ("spool-flange", 0.18, 0.02),
        offset: [0, 0.18, 0.065],
        color: "#EADFC9",
      },
      {
        geometry: cylinderAlongZ("spool-flange", 0.18, 0.02),
        offset: [0, 0.18, -0.065],
        color: "#EADFC9",
      },
      {
        geometry: cylinderAlongZ("spool-hub", 0.05, 0.135),
        offset: [0, 0.18, 0],
        color: "#8C6A4A",
      },
    ],
  },
};

export const markerGeometry = sharedGeometry(
  "marker",
  () => new BoxGeometry(1, 1, 1),
);
