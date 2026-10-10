"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Vector3, type Group } from "three";
import type { Highlight } from "./interaction";

type ScreenPoint = { x: number; y: number };

const cross = (origin: ScreenPoint, first: ScreenPoint, second: ScreenPoint) =>
  (first.x - origin.x) * (second.y - origin.y) -
  (first.y - origin.y) * (second.x - origin.x);

/** Andrew's monotone chain. */
const convexHull = (points: ScreenPoint[]): ScreenPoint[] => {
  const sorted = [...points].sort(
    (first, second) => first.x - second.x || first.y - second.y,
  );
  const build = (input: ScreenPoint[]) => {
    const hull: ScreenPoint[] = [];
    for (const point of input) {
      while (hull.length >= 2) {
        const last = hull[hull.length - 1];
        const beforeLast = hull[hull.length - 2];
        if (!last || !beforeLast || cross(beforeLast, last, point) > 0) break;
        hull.pop();
      }
      hull.push(point);
    }
    hull.pop();
    return hull;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
};

const STROKES: Record<Exclude<Highlight, "none">, string> = {
  hover: "#FFFBF3",
  selected: "#5E7550",
};

type StorageOutlineProps = {
  /** width, height, depth, center height */
  box: [number, number, number, number];
  highlight: Highlight;
  tagLayer: HTMLElement | null;
};

/** A 2D silhouette around the piece, like the mockup: cream on hover, sage when selected. */
export const StorageOutline = ({ box, highlight, tagLayer }: StorageOutlineProps) => {
  const groupRef = useRef<Group>(null);
  const strokeRef = useRef<SVGPolygonElement>(null);
  const shadowRef = useRef<SVGPolygonElement>(null);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const portal = useMemo(
    () => (tagLayer ? { current: tagLayer } : undefined),
    [tagLayer],
  );
  // Keeps the last color while fading out, so a selected outline doesn't flash cream.
  const [stroke, setStroke] = useState(STROKES.hover);
  if (highlight !== "none" && stroke !== STROKES[highlight]) {
    setStroke(STROKES[highlight]);
  }
  useEffect(() => invalidate(), [highlight, invalidate]);

  const corners = useMemo(() => {
    const [width, height, depth, centerY] = box;
    return [-1, 1].flatMap((signX) =>
      [-1, 1].flatMap((signY) =>
        [-1, 1].map(
          (signZ) =>
            new Vector3(
              (signX * width) / 2,
              centerY + (signY * height) / 2,
              (signZ * depth) / 2,
            ),
        ),
      ),
    );
  }, [box]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group || highlight === "none") return;
    group.updateWorldMatrix(true, false);
    const projected = corners.map((corner) => {
      const point = corner.clone().applyMatrix4(group.matrixWorld).project(camera);
      return {
        x: ((point.x + 1) / 2) * size.width,
        y: ((1 - point.y) / 2) * size.height,
      };
    });
    const points = convexHull(projected)
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ");
    strokeRef.current?.setAttribute("points", points);
    shadowRef.current?.setAttribute("points", points);
  });

  return (
    <group ref={groupRef}>
      <Html
        portal={portal}
        calculatePosition={() => [0, 0]}
        zIndexRange={[1, 0]}
        style={{ pointerEvents: "none" }}
      >
        <svg
          width={size.width}
          height={size.height}
          aria-hidden
          className={`overflow-visible transition-opacity duration-150 ease-out ${
            highlight === "none" ? "opacity-0" : "opacity-100"
          }`}
        >
          <polygon
            ref={shadowRef}
            fill="none"
            stroke="rgba(74, 59, 46, 0.18)"
            strokeWidth={6}
            strokeLinejoin="round"
          />
          <polygon
            ref={strokeRef}
            fill="none"
            stroke={stroke}
            strokeWidth={3.5}
            strokeLinejoin="round"
          />
        </svg>
      </Html>
    </group>
  );
};
