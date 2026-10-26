"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import type { Highlight } from "./interaction";

const TOOLBAR_GAP = 14;
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
  outlineKey: string;
  /** width, height, depth, center height */
  box: [number, number, number, number];
  highlight: Highlight;
  overlay: SceneOverlay;
};

/** Traces the piece's screen silhouette into its DOM outline, like the mockup. */
export const StorageOutline = ({ outlineKey, box, highlight, overlay }: StorageOutlineProps) => {
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

  // One scratch vector for the per-frame projection, so a highlighted outline makes no garbage.
  const [point] = useState(() => new Vector3());

  useFrame(() => {
    const group = groupRef.current;
    const outline = overlay.outlines.get(outlineKey);
    if (!group || !outline || highlight === "none") return;
    group.updateWorldMatrix(true, false);
    const projected = corners.map((corner) => {
      point.copy(corner).applyMatrix4(group.matrixWorld).project(camera);
      return {
        x: ((point.x + 1) / 2) * size.width,
        y: ((1 - point.y) / 2) * size.height,
      };
    });
    const points = convexHull(projected)
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ");
    for (const polygon of outline.children) polygon.setAttribute("points", points);

    // Decorate's toolbar sits just under the picked piece, or above it when that would leave the room.
    const toolbar = highlight === "editing" ? overlay.anchors.get("toolbar") : undefined;
    if (toolbar) {
      const xs = projected.map((corner) => corner.x);
      const ys = projected.map((corner) => corner.y);
      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const left = Math.min(Math.max(8, centerX - toolbar.offsetWidth / 2), size.width - toolbar.offsetWidth - 8);
      const below = Math.max(...ys) + TOOLBAR_GAP;
      const top =
        below + toolbar.offsetHeight <= size.height - 8 ? below : Math.max(8, Math.min(...ys) - toolbar.offsetHeight - TOOLBAR_GAP);
      toolbar.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
      toolbar.style.visibility = "visible";
    }
  });

  return <group ref={groupRef} />;
};
