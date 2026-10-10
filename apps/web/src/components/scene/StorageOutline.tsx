"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import type { Highlight } from "./interaction";
import type { SceneOverlay } from "./overlay";

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

type StorageOutlineProps = {
  locationId: number;
  /** width, height, depth, center height */
  box: [number, number, number, number];
  highlight: Highlight;
  overlay: SceneOverlay;
};

/** Traces the piece's screen silhouette into its DOM outline, like the mockup. */
export const StorageOutline = ({ locationId, box, highlight, overlay }: StorageOutlineProps) => {
  const groupRef = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
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
    const outline = overlay.outlines.get(locationId);
    if (!group || !outline || highlight === "none") return;
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
    for (const polygon of outline.children) polygon.setAttribute("points", points);
  });

  return <group ref={groupRef} />;
};
