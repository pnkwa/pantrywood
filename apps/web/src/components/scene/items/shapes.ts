import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  SplineCurve,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ItemShape } from "../types";

type PartColor = "body" | "accent" | `#${string}`;
type Vec3 = [number, number, number];

export type Part = {
  geometry: () => BufferGeometry;
  offset: Vec3;
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

const cylinder = (key: string, radius: number, height: number, segments = 20) =>
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
    () => new RoundedBoxGeometry(width, height, depth, 3, radius),
  );

/** A smooth outline (radius, height) from the bottom centre to the top centre, spun around y. */
const latheOf = (outline: [number, number][], segments = 28) =>
  new LatheGeometry(
    new SplineCurve(outline.map(([radius, height]) => new Vector2(radius, height))).getPoints(36),
    segments,
  );

/** `tilt` leans it around z before it moves to `center`. */
const ellipsoid = (radius: number, scale: Vec3, center: Vec3, tilt = 0) =>
  new SphereGeometry(radius, 20, 14).scale(...scale).rotateZ(tilt).translate(...center);

/** Moves every vertex, for bumps, lobes and bends; normals follow. */
const deform = (geometry: BufferGeometry, move: (point: Vector3) => void) => {
  const positions = geometry.getAttribute("position");
  const point = new Vector3();
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    move(point);
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
};

const scaleAround = (point: Vector3, factor: number) => {
  point.x *= factor;
  point.z *= factor;
};

/** Leaves fanned evenly around the y axis. */
const leafRing = (count: number, leaf: () => BufferGeometry) =>
  mergeGeometries(
    Array.from({ length: count }, (_, index) => leaf().rotateY((index / count) * Math.PI * 2)),
  );

const flatShaded = (geometry: BufferGeometry) => {
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();
  return faceted;
};

const banana = (lean: number, x: number) =>
  deform(new CapsuleGeometry(0.034, 0.19, 6, 12, 6), (point) => {
    point.x += 2.6 * point.y * point.y;
  })
    .rotateZ(lean)
    .translate(x, 0.14, 0);

const steakOutline = () => {
  const outline = new Shape();
  outline.moveTo(-0.15, 0);
  outline.bezierCurveTo(-0.16, 0.1, -0.02, 0.12, 0.05, 0.08);
  outline.bezierCurveTo(0.12, 0.1, 0.17, 0.04, 0.15, -0.03);
  outline.bezierCurveTo(0.13, -0.11, -0.13, -0.11, -0.15, 0);
  return outline;
};

/** A shrimp lying on its side: a tapering, ringed body curled into a C. */
const shrimpBody = () => {
  const curl = 0.11;
  return deform(new CapsuleGeometry(0.042, 0.22, 6, 14, 12).rotateZ(Math.PI / 2), (point) => {
    const along = (point.x + 0.153) / 0.306;
    const ring = (1 - 0.45 * along) * (1 + 0.07 * Math.cos(point.x * 70));
    point.y *= ring;
    point.z *= ring;
    const angle = point.x / curl;
    const radius = curl - point.y;
    point.set(radius * Math.sin(angle), curl - radius * Math.cos(angle) + 0.03, point.z);
  });
};

/** One pleated dumpling, its folds gathered at the top. */
const dumpling = (x: number, turn: number) =>
  deform(latheOf([[0, 0], [0.058, 0.004], [0.064, 0.03], [0.045, 0.068], [0.014, 0.09], [0, 0.094]], 32), (point) => {
    scaleAround(point, 1 + 0.07 * Math.cos(10 * Math.atan2(point.z, point.x)) * (point.y / 0.09));
  })
    .scale(1.15, 1, 0.9)
    .rotateY(turn)
    .translate(x, 0, 0);

/** An edamame pod: three beans showing through, lying along x. */
const edamamePod = (x: number, z: number, turn: number) =>
  deform(new CapsuleGeometry(0.026, 0.11, 4, 10, 12).rotateZ(Math.PI / 2), (point) => {
    const bean = 1 + 0.22 * Math.abs(Math.cos(point.x * 27));
    point.y *= bean * 0.85;
    point.z *= bean;
    point.y += 3 * point.x * point.x;
  })
    .rotateY(turn)
    .translate(x, 0.03, z);

const FRESH_GREEN = "#6FA64A";
const DEEP_GREEN = "#4C8A36";
const STEM_BROWN = "#6B4A2E";

/** Items stand on y = 0 and face +z. Packaging takes the product's colors; produce keeps its own. */
export const SHAPES: Record<ItemShape, { parts: Part[] }> = {
  jar: {
    parts: [
      {
        geometry: sharedGeometry("jar-body", () =>
          latheOf([[0, 0], [0.12, 0.005], [0.13, 0.05], [0.13, 0.2], [0.11, 0.25], [0.1, 0.26], [0, 0.26]]),
        ),
        offset: [0, 0, 0],
        color: "body",
      },
      {
        geometry: cylinder("jar-label", 0.132, 0.08, 28),
        offset: [0, 0.13, 0],
        color: "#FFFBF3",
      },
      {
        geometry: sharedGeometry("jar-lid", () =>
          latheOf([[0, 0], [0.115, 0], [0.118, 0.05], [0.1, 0.065], [0, 0.066]]),
        ),
        offset: [0, 0.25, 0],
        color: "accent",
      },
    ],
  },
  can: {
    parts: [
      {
        geometry: cylinder("can-body", 0.11, 0.22),
        offset: [0, 0.12, 0],
        color: "#D9CCB0",
      },
      {
        geometry: cylinder("can-rim", 0.105, 0.015),
        offset: [0, 0.0075, 0],
        color: "#C9BB9C",
      },
      {
        geometry: cylinder("can-rim", 0.105, 0.015),
        offset: [0, 0.2375, 0],
        color: "#C9BB9C",
      },
      {
        geometry: cylinder("can-label", 0.113, 0.14),
        offset: [0, 0.12, 0],
        color: "body",
      },
    ],
  },
  carton: {
    parts: [
      {
        geometry: roundedBox("carton-body", 0.2, 0.3, 0.2, 0.02),
        offset: [0, 0.15, 0],
        color: "#FFFBF3",
      },
      {
        geometry: roundedBox("carton-band", 0.205, 0.12, 0.205, 0.015),
        offset: [0, 0.07, 0],
        color: "body",
      },
      {
        // A three-sided prism lying along x: the gable roof.
        geometry: sharedGeometry("carton-roof", () =>
          flatShaded(
            new CylinderGeometry(0.115, 0.115, 0.195, 3)
              .rotateZ(Math.PI / 2)
              .rotateX(-Math.PI / 2)
              .scale(1, 0.6, 1)
              .translate(0, 0.335, 0),
          ),
        ),
        offset: [0, 0, 0],
        color: "#FFFBF3",
      },
      {
        geometry: roundedBox("carton-ridge", 0.2, 0.04, 0.02, 0.008),
        offset: [0, 0.4, 0],
        color: "#FFFBF3",
      },
      {
        geometry: cylinder("carton-cap", 0.03, 0.03, 14),
        offset: [0.05, 0.36, 0.05],
        color: "accent",
      },
    ],
  },
  bag: {
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
    parts: [
      {
        geometry: cylinder("roll-body", 0.13, 0.24, 24),
        offset: [0, 0.12, 0],
        color: "body",
      },
      {
        geometry: cylinder("roll-core", 0.04, 0.245, 12),
        offset: [0, 0.12, 0],
        color: "#C9A77C",
      },
    ],
  },
  bottle: {
    parts: [
      {
        geometry: sharedGeometry("bottle-body", () =>
          latheOf([[0, 0], [0.085, 0.005], [0.092, 0.04], [0.092, 0.24], [0.07, 0.3], [0.045, 0.33], [0.045, 0.36], [0, 0.36]]),
        ),
        offset: [0, 0, 0],
        color: "body",
      },
      {
        geometry: cylinder("bottle-label", 0.095, 0.12),
        offset: [0, 0.13, 0],
        color: "#FFFBF3",
      },
      {
        geometry: cylinder("bottle-cap", 0.048, 0.06, 16),
        offset: [0, 0.39, 0],
        color: "accent",
      },
    ],
  },
  spool: {
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
  egg: {
    parts: [
      {
        geometry: sharedGeometry("egg", () =>
          latheOf([[0, 0], [0.06, 0.012], [0.088, 0.08], [0.078, 0.16], [0.045, 0.222], [0, 0.24]]),
        ),
        offset: [0, 0, 0],
        color: "#F1DDB8",
      },
    ],
  },
  apple: {
    parts: [
      {
        geometry: sharedGeometry("apple-body", () =>
          latheOf([[0, 0.03], [0.07, 0.004], [0.125, 0.06], [0.136, 0.14], [0.112, 0.215], [0.055, 0.24], [0, 0.215]]),
        ),
        offset: [0, 0, 0],
        color: "#D9503F",
      },
      {
        geometry: sharedGeometry("apple-stem", () =>
          new CylinderGeometry(0.008, 0.011, 0.07, 8).rotateZ(-0.25).translate(0.006, 0.245, 0),
        ),
        offset: [0, 0, 0],
        color: STEM_BROWN,
      },
      {
        geometry: sharedGeometry("apple-leaf", () =>
          ellipsoid(0.05, [1, 0.22, 0.48], [0.05, 0.27, 0], 0.5),
        ),
        offset: [0, 0, 0],
        color: FRESH_GREEN,
      },
    ],
  },
  orange: {
    parts: [
      {
        geometry: sharedGeometry("citrus-body", () =>
          deform(ellipsoid(0.125, [1, 0.92, 1], [0, 0.115, 0]), (point) =>
            scaleAround(point, 1 + 0.012 * Math.sin(point.x * 160) * Math.sin(point.z * 160)),
          ),
        ),
        offset: [0, 0, 0],
        color: "#EE8A2E",
      },
      {
        geometry: sharedGeometry("citrus-nub", () => ellipsoid(0.02, [1, 0.5, 1], [0, 0.23, 0])),
        offset: [0, 0, 0],
        color: DEEP_GREEN,
      },
    ],
  },
  lime: {
    parts: [
      {
        geometry: sharedGeometry("lime-body", () => ellipsoid(0.09, [1.1, 0.95, 1], [0, 0.086, 0])),
        offset: [0, 0, 0],
        color: "#8DB04A",
      },
      {
        geometry: sharedGeometry("lime-nub", () => ellipsoid(0.016, [1, 0.6, 1], [0, 0.17, 0])),
        offset: [0, 0, 0],
        color: DEEP_GREEN,
      },
    ],
  },
  tomato: {
    parts: [
      {
        geometry: sharedGeometry("tomato-body", () =>
          deform(ellipsoid(0.125, [1, 0.8, 1], [0, 0.1, 0]), (point) =>
            scaleAround(point, 1 + 0.035 * Math.cos(5 * Math.atan2(point.z, point.x))),
          ),
        ),
        offset: [0, 0, 0],
        color: "#E0452F",
      },
      {
        geometry: sharedGeometry("tomato-calyx", () =>
          mergeGeometries([
            leafRing(5, () => ellipsoid(0.045, [1, 0.18, 0.35], [0.035, 0.2, 0], -0.25)),
            new CylinderGeometry(0.009, 0.012, 0.05, 8).translate(0, 0.225, 0),
          ]),
        ),
        offset: [0, 0, 0],
        color: DEEP_GREEN,
      },
    ],
  },
  potato: {
    parts: [
      {
        geometry: sharedGeometry("potato", () =>
          deform(ellipsoid(0.12, [1.2, 0.75, 0.9], [0, 0.09, 0]), (point) =>
            scaleAround(point, 1 + 0.05 * Math.sin(point.x * 38 + 1) * Math.sin(point.y * 42) * Math.cos(point.z * 30)),
          ),
        ),
        offset: [0, 0, 0],
        color: "#C9A15E",
      },
    ],
  },
  carrot: {
    parts: [
      {
        geometry: sharedGeometry("carrot-root", () =>
          deform(latheOf([[0, 0], [0.018, 0.04], [0.045, 0.13], [0.064, 0.22], [0.058, 0.25], [0, 0.256]]), (point) =>
            scaleAround(point, 1 - 0.06 * Math.max(0, Math.sin(point.y * 70)) ** 6),
          ),
        ),
        offset: [0, 0, 0],
        color: "#EE7F2D",
      },
      {
        geometry: sharedGeometry("carrot-tops", () =>
          mergeGeometries(
            [-0.4, 0, 0.4].map((lean) =>
              new CapsuleGeometry(0.018, 0.08, 4, 10).translate(0, 0.055, 0).rotateZ(lean).translate(0, 0.25, 0),
            ),
          ),
        ),
        offset: [0, 0, 0],
        color: FRESH_GREEN,
      },
    ],
  },
  cucumber: {
    parts: [
      {
        geometry: sharedGeometry("cucumber-body", () =>
          deform(new CapsuleGeometry(0.06, 0.2, 8, 20, 10), (point) =>
            scaleAround(point, 1 + 0.05 * Math.max(0, Math.sin(Math.atan2(point.z, point.x) * 7) * Math.sin(point.y * 90)) ** 3),
          )
            .rotateZ(0.12)
            .translate(0, 0.16, 0),
        ),
        offset: [0, 0, 0],
        color: "#4E8A3A",
      },
      {
        geometry: sharedGeometry("cucumber-stem", () =>
          new CylinderGeometry(0.012, 0.016, 0.03, 8).rotateZ(0.12).translate(-0.02, 0.32, 0),
        ),
        offset: [0, 0, 0],
        color: "#3E6E2E",
      },
    ],
  },
  banana: {
    parts: [
      {
        geometry: sharedGeometry("banana-fingers", () =>
          mergeGeometries([banana(0.3, -0.07), banana(0.05, -0.01), banana(-0.2, 0.05)]),
        ),
        offset: [0, 0, 0],
        color: "#F2CB45",
      },
      {
        geometry: roundedBox("banana-crown", 0.17, 0.03, 0.05, 0.012),
        offset: [-0.01, 0.285, 0],
        color: "#A8B84A",
      },
    ],
  },
  mushroom: {
    parts: [
      {
        geometry: sharedGeometry("mushroom-stem", () =>
          latheOf([[0, 0], [0.055, 0.004], [0.05, 0.06], [0.045, 0.13], [0, 0.13]]),
        ),
        offset: [0, 0, 0],
        color: "#EFE3CF",
      },
      {
        geometry: sharedGeometry("mushroom-cap", () =>
          latheOf([[0, 0.11], [0.11, 0.115], [0.13, 0.145], [0.115, 0.205], [0.06, 0.24], [0, 0.245]]),
        ),
        offset: [0, 0, 0],
        color: "#F6F0E6",
      },
    ],
  },
  greens: {
    parts: [
      {
        geometry: sharedGeometry("greens-stalks", () =>
          latheOf([[0, 0], [0.06, 0.008], [0.075, 0.06], [0.055, 0.15], [0.05, 0.19], [0, 0.19]]),
        ),
        offset: [0, 0, 0],
        color: "#E6EED2",
      },
      {
        geometry: sharedGeometry("greens-leaves", () =>
          mergeGeometries([
            leafRing(5, () => ellipsoid(0.065, [0.42, 1.45, 1], [0.055, 0.26, 0], -0.35)),
            ellipsoid(0.06, [1, 1.5, 0.5], [0, 0.28, 0]),
          ]),
        ),
        offset: [0, 0, 0],
        color: "#5FA046",
      },
    ],
  },
  pepper: {
    parts: [
      {
        geometry: sharedGeometry("pepper-body", () =>
          deform(latheOf([[0, 0.012], [0.08, 0], [0.118, 0.06], [0.122, 0.16], [0.1, 0.22], [0.04, 0.236], [0, 0.226]]), (point) =>
            scaleAround(point, 1 + 0.09 * Math.cos(4 * Math.atan2(point.z, point.x))),
          ),
        ),
        offset: [0, 0, 0],
        color: "#F08A2B",
      },
      {
        geometry: sharedGeometry("pepper-stem", () =>
          mergeGeometries([
            new CylinderGeometry(0.035, 0.04, 0.02, 12).translate(0, 0.232, 0),
            new CylinderGeometry(0.012, 0.014, 0.06, 8).rotateZ(-0.35).translate(0.01, 0.26, 0),
          ]),
        ),
        offset: [0, 0, 0],
        color: DEEP_GREEN,
      },
    ],
  },
  corn: {
    parts: [
      {
        geometry: sharedGeometry("corn-cob", () =>
          deform(
            latheOf([[0, 0.02], [0.055, 0.03], [0.07, 0.1], [0.064, 0.2], [0.04, 0.27], [0, 0.285]], 42),
            (point) =>
              scaleAround(
                point,
                1 + 0.07 * Math.abs(Math.sin(Math.atan2(point.z, point.x) * 7)) * Math.abs(Math.sin(point.y * 75)),
              ),
          ),
        ),
        offset: [0, 0, 0],
        color: "#F2C94C",
      },
      {
        geometry: sharedGeometry("corn-husk", () =>
          mergeGeometries(
            [0.4, Math.PI - 0.4].map((angle) =>
              ellipsoid(0.05, [0.3, 1.9, 0.7], [0.06, 0.08, 0], -0.25).rotateY(angle),
            ),
          ),
        ),
        offset: [0, 0, 0],
        color: "#8DB04A",
      },
      {
        geometry: cylinder("corn-stalk", 0.018, 0.04, 10),
        offset: [0, 0.3, 0],
        color: "#C9A86A",
      },
    ],
  },
  meat: {
    parts: [
      {
        geometry: sharedGeometry("meat-slab", () =>
          new ExtrudeGeometry(steakOutline(), {
            depth: 0.04,
            bevelEnabled: true,
            bevelThickness: 0.015,
            bevelSize: 0.015,
            bevelSegments: 4,
            curveSegments: 20,
          })
            .rotateX(-Math.PI / 2)
            .translate(0, 0.015, 0),
        ),
        offset: [0, 0, 0],
        color: "#F6E7DC",
      },
      {
        geometry: sharedGeometry("meat-lean", () =>
          mergeGeometries([
            ellipsoid(0.07, [1.1, 0.12, 0.62], [-0.06, 0.07, 0.005]),
            ellipsoid(0.055, [1, 0.12, 0.7], [0.07, 0.07, -0.015]),
            ellipsoid(0.03, [1.2, 0.12, 0.7], [0.05, 0.07, 0.055]),
          ]),
        ),
        offset: [0, 0, 0],
        color: "#E8877A",
      },
    ],
  },
  tofu: {
    parts: [
      {
        geometry: roundedBox("tofu-block", 0.22, 0.12, 0.16, 0.02),
        offset: [-0.03, 0.06, -0.01],
        color: "#FBF3DF",
      },
      {
        geometry: sharedGeometry("tofu-beans", () =>
          mergeGeometries([
            ellipsoid(0.022, [1.15, 0.9, 1], [0.06, 0.02, 0.09]),
            ellipsoid(0.022, [1.15, 0.9, 1], [0.105, 0.02, 0.07]),
            ellipsoid(0.022, [1.15, 0.9, 1], [0.1, 0.02, 0.115]),
          ]),
        ),
        offset: [0, 0, 0],
        color: "#E2C36A",
      },
    ],
  },
  bread: {
    parts: [
      {
        geometry: roundedBox("bread-base", 0.28, 0.12, 0.2, 0.035),
        offset: [0, 0.06, 0],
        color: "#D9A25E",
      },
      {
        geometry: sharedGeometry("bread-dome", () => ellipsoid(0.1, [1.42, 0.65, 0.98], [0, 0.12, 0])),
        offset: [0, 0, 0],
        color: "#D9A25E",
      },
      {
        // The cut end shows the crumb.
        geometry: sharedGeometry("bread-crumb", () =>
          ellipsoid(0.1, [0.12, 0.75, 0.88], [0.132, 0.1, 0]),
        ),
        offset: [0, 0, 0],
        color: "#F6E6C4",
      },
    ],
  },
  sauceBottle: {
    parts: [
      {
        geometry: sharedGeometry("sauce-bottle", () =>
          latheOf([[0, 0], [0.075, 0.005], [0.08, 0.04], [0.08, 0.24], [0.055, 0.3], [0.03, 0.34], [0.03, 0.38], [0, 0.38]]),
        ),
        offset: [0, 0, 0],
        color: "#6B4A2E",
      },
      {
        geometry: cylinder("sauce-label", 0.083, 0.1, 24),
        offset: [0, 0.13, 0],
        color: "#FFF6E2",
      },
      {
        geometry: cylinder("sauce-cap", 0.035, 0.05, 16),
        offset: [0, 0.405, 0],
        color: "accent",
      },
    ],
  },
  cup: {
    parts: [
      {
        geometry: sharedGeometry("cup-tub", () => latheOf([[0, 0], [0.09, 0], [0.095, 0.015], [0.118, 0.17], [0, 0.17]])),
        offset: [0, 0, 0],
        color: "#FFFBF3",
      },
      {
        geometry: sharedGeometry("cup-band", () => new CylinderGeometry(0.116, 0.104, 0.07, 28, 1, true)),
        offset: [0, 0.095, 0],
        color: "body",
      },
      {
        geometry: cylinder("cup-lid", 0.126, 0.018, 28),
        offset: [0, 0.178, 0],
        color: "accent",
      },
    ],
  },
  noodles: {
    parts: [
      {
        geometry: sharedGeometry("noodle-cup", () => latheOf([[0, 0], [0.085, 0], [0.09, 0.01], [0.115, 0.19], [0, 0.19]])),
        offset: [0, 0, 0],
        color: "#FFFBF3",
      },
      {
        geometry: sharedGeometry("noodle-band", () => new CylinderGeometry(0.111, 0.096, 0.09, 28, 1, true)),
        offset: [0, 0.1, 0],
        color: "#E0452F",
      },
      {
        geometry: cylinder("noodle-lid", 0.12, 0.014, 28),
        offset: [0, 0.197, 0],
        color: "#E7DDC9",
      },
      {
        geometry: roundedBox("noodle-tab", 0.06, 0.012, 0.05, 0.005),
        offset: [0.11, 0.2, 0.05],
        color: "#E7DDC9",
      },
    ],
  },
  eggTofu: {
    parts: [
      {
        geometry: sharedGeometry("egg-tofu", () => new CylinderGeometry(0.05, 0.05, 0.23, 20).rotateZ(Math.PI / 2)),
        offset: [0, 0.05, 0],
        color: "#F2D27A",
      },
      {
        geometry: sharedGeometry("egg-tofu-clips", () =>
          mergeGeometries([-0.125, 0.125].map((x) => new BoxGeometry(0.025, 0.07, 0.035).translate(x, 0.05, 0))),
        ),
        offset: [0, 0, 0],
        color: "#C8755A",
      },
    ],
  },
  butter: {
    parts: [
      {
        geometry: roundedBox("butter-wrapper", 0.19, 0.1, 0.13, 0.015),
        offset: [-0.045, 0.05, 0],
        color: "#E9C46E",
      },
      {
        geometry: roundedBox("butter-block", 0.09, 0.094, 0.124, 0.012),
        offset: [0.1, 0.047, 0],
        color: "#F8E3A0",
      },
    ],
  },
  shrimp: {
    parts: [
      {
        geometry: sharedGeometry("shrimp-body", shrimpBody),
        offset: [0, 0, 0],
        color: "#F08A6A",
      },
      {
        geometry: sharedGeometry("shrimp-tail", () =>
          mergeGeometries([
            ellipsoid(0.035, [1.2, 0.35, 0.8], [0.13, 0.13, 0.02], 0.6),
            ellipsoid(0.035, [1.2, 0.35, 0.8], [0.13, 0.13, -0.02], 0.6),
          ]),
        ),
        offset: [0, 0, 0],
        color: "#E06A50",
      },
    ],
  },
  dumplings: {
    parts: [
      {
        geometry: sharedGeometry("dumplings", () => mergeGeometries([dumpling(-0.09, 0.3), dumpling(0, -0.2), dumpling(0.09, 0.5)])),
        offset: [0, 0, 0],
        color: "#F6EDDC",
      },
    ],
  },
  edamame: {
    parts: [
      {
        geometry: sharedGeometry("edamame", () =>
          mergeGeometries([edamamePod(-0.04, 0.02, 0.3), edamamePod(0.04, -0.01, -0.25), edamamePod(0, 0.05, 0.05)]),
        ),
        offset: [0, 0, 0],
        color: "#8DB04A",
      },
    ],
  },
  riceSack: {
    parts: [
      {
        geometry: roundedBox("rice-sack", 0.26, 0.27, 0.17, 0.07),
        offset: [0, 0.135, 0],
        color: "#F3E9D6",
      },
      {
        geometry: sharedGeometry("rice-sack-neck", () =>
          mergeGeometries([new CylinderGeometry(0.05, 0.07, 0.05, 16).translate(0, 0.29, 0), ellipsoid(0.07, [1.1, 0.5, 0.8], [0, 0.33, 0])]),
        ),
        offset: [0, 0, 0],
        color: "#F3E9D6",
      },
      {
        geometry: cylinder("rice-sack-tie", 0.055, 0.02, 16),
        offset: [0, 0.305, 0],
        color: "accent",
      },
      {
        geometry: roundedBox("rice-sack-label", 0.15, 0.09, 0.01, 0.006),
        offset: [0, 0.13, 0.086],
        color: "#E2B25C",
      },
    ],
  },
  toothpaste: {
    parts: [
      {
        geometry: sharedGeometry("toothpaste-tube", () =>
          deform(new CapsuleGeometry(0.045, 0.2, 6, 16, 8).rotateZ(Math.PI / 2), (point) => {
            // Squeezed flat towards the crimped end.
            const flat = 1 - 0.6 * Math.max(0, (point.x - 0.02) / 0.12);
            point.y *= flat * 0.8;
            point.z *= 1 + 0.2 * (1 - flat);
          }).translate(0.02, 0.04, 0),
        ),
        offset: [0, 0, 0],
        color: "#FFFBF3",
      },
      {
        geometry: sharedGeometry("toothpaste-stripe", () => new CylinderGeometry(0.047, 0.047, 0.06, 20, 1, true).rotateZ(Math.PI / 2)),
        offset: [-0.02, 0.04, 0],
        color: "body",
      },
      {
        geometry: sharedGeometry("toothpaste-cap", () => new CylinderGeometry(0.03, 0.03, 0.04, 14).rotateZ(Math.PI / 2)),
        offset: [-0.125, 0.04, 0],
        color: "accent",
      },
    ],
  },
};

export const markerGeometry = sharedGeometry(
  "marker",
  () => new BoxGeometry(1, 1, 1),
);
