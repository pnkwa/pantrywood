"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { InstancedMesh, Mesh, Vector3, type Group, type Object3D } from "three";
import type { Highlight } from "./interaction";
import type { SceneOverlay } from "./overlay";

const TOOLBAR_GAP = 14;
/** Enough points to follow a round barrel or a fridge's rounded top, few enough to hull every frame. */
const MAX_OUTLINE_POINTS = 600;

/** Vertices of a mesh, in its own space; the projection applies its current matrix, so lifts and springs follow. */
type Sample = { object: Object3D; points: Vector3[] };

/** A spread of vertices from every visible mesh of the model next to the outline (instanced items sit inside it). */
const sampleModel = (root: Object3D): Sample[] => {
  const meshes: Mesh[] = [];
  root.traverseVisible((child) => {
    if (child instanceof Mesh && !(child instanceof InstancedMesh)) meshes.push(child);
  });
  const perMesh = Math.max(8, Math.floor(MAX_OUTLINE_POINTS / Math.max(1, meshes.length)));
  return meshes.map((mesh) => {
    const position = mesh.geometry.getAttribute("position");
    const stride = Math.max(1, Math.ceil(position.count / perMesh));
    const points: Vector3[] = [];
    for (let index = 0; index < position.count; index += stride) {
      points.push(new Vector3().fromBufferAttribute(position, index));
    }
    return { object: mesh, points };
  });
};

type ToolbarAnchorProps = {
  /** width, height, depth, center height: used until the model has meshes to measure. */
  box: [number, number, number, number];
  highlight: Highlight;
  overlay: SceneOverlay;
};

/** Keeps the edit toolbar next to the picked piece, measured from the model itself rather than its hit box. */
export const ToolbarAnchor = ({ box, highlight, overlay }: ToolbarAnchorProps) => {
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

  // One scratch vector for the per-frame projection.
  const [point] = useState(() => new Vector3());
  // Sampled when a highlight starts, so a restyled piece is sampled afresh next time.
  const samples = useRef<Sample[] | null>(null);

  useFrame(() => {
    const group = groupRef.current;
    const toolbar = overlay.anchors.get("toolbar");
    if (highlight !== "editing") samples.current = null;
    if (!group || !toolbar || highlight !== "editing") return;
    const root = group.parent ?? group;
    root.updateWorldMatrix(true, true);
    samples.current ??= sampleModel(root);
    const toScreen = () => ({
      x: ((point.x + 1) / 2) * size.width,
      y: ((1 - point.y) / 2) * size.height,
    });
    const fromModel = samples.current.flatMap(({ object, points }) =>
      points.map((vertex) => {
        point.copy(vertex).applyMatrix4(object.matrixWorld).project(camera);
        return toScreen();
      }),
    );
    // A model with no meshes yet (still loading) falls back to its hit box.
    const projected =
      fromModel.length > 0
        ? fromModel
        : corners.map((corner) => {
            point.copy(corner).applyMatrix4(group.matrixWorld).project(camera);
            return toScreen();
          });
    // The toolbar sits just under the picked piece, or above it when that would leave the room.
    const xs = projected.map((corner) => corner.x);
    const ys = projected.map((corner) => corner.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const left = Math.min(Math.max(8, centerX - toolbar.offsetWidth / 2), size.width - toolbar.offsetWidth - 8);
    const below = Math.max(...ys) + TOOLBAR_GAP;
    const top =
      below + toolbar.offsetHeight <= size.height - 8 ? below : Math.max(8, Math.min(...ys) - toolbar.offsetHeight - TOOLBAR_GAP);
    toolbar.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
    toolbar.style.visibility = "visible";
  });

  return <group ref={groupRef} />;
};
