"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Euler, InstancedMesh, Matrix4, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { ItemMarker } from "../types";
import { MARKER_GEOMETRY, SHAPES, type Part } from "./shapes";
import type { MarkerPlacement, Placement } from "./arrange";

/*
 * Draws placed items with one InstancedMesh per shape part, in the parent's local space,
 * so items move with their storage piece. Items pop in from their own base with a small
 * settle (DESIGN.md section 10); with reduced motion they are simply there.
 */

const itemMaterial = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
const markerMaterial = new MeshBasicMaterial();

const MARKER_COLORS: Record<ItemMarker, string> = {
  soon: "#E2B25C",
  expired: "#A8533A",
  low: "#C8755A",
};

const POP_SECONDS = 0.35;

type Instance = {
  /** Where the item stands; the part grows from here. */
  base: Vector3;
  /** Part offset from the base, already rotated. */
  offset: Vector3;
  rotation: Quaternion;
  size: Vector3;
  color: Color;
};

type Batch = { id: string; geometry: Part["geometry"]; instances: Instance[] };

function batchPlacements(placements: readonly Placement[]): Batch[] {
  const batches = new Map<string, Batch>();
  for (const placement of placements) {
    const rotation = new Quaternion().setFromEuler(new Euler(0, placement.rotationY, 0));
    SHAPES[placement.shape].parts.forEach((part, index) => {
      const id = `${placement.shape}-${index}`;
      const batch = batches.get(id) ?? { id, geometry: part.geometry, instances: [] };
      batch.instances.push({
        base: new Vector3(...placement.position),
        offset: new Vector3(...part.offset).applyQuaternion(rotation),
        rotation,
        size: new Vector3(1, 1, 1),
        color: new Color(
          part.color === "body" ? placement.color : part.color === "accent" ? placement.accent : part.color,
        ),
      });
      batches.set(id, batch);
    });
  }
  return [...batches.values()];
}

function markerInstances(markers: readonly MarkerPlacement[]): Instance[] {
  const rotation = new Quaternion().setFromEuler(new Euler(Math.PI / 4, Math.PI / 4, 0));
  return markers.map((m) => ({
    base: new Vector3(...m.position),
    offset: new Vector3(),
    rotation,
    size: new Vector3(0.1, 0.1, 0.1),
    color: new Color(MARKER_COLORS[m.marker]),
  }));
}

/** 0 → 1 with a small overshoot (easeOutBack). */
function pop(t: number) {
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

const PopContext = createContext<RefObject<number>>({ current: 1 });

const tmpMatrix = new Matrix4();
const tmpPosition = new Vector3();
const tmpScale = new Vector3();

function writeInstances(mesh: InstancedMesh, instances: readonly Instance[], scale: number) {
  instances.forEach((instance, i) => {
    tmpPosition.copy(instance.offset).multiplyScalar(scale).add(instance.base);
    tmpScale.copy(instance.size).multiplyScalar(Math.max(scale, 0.0001));
    mesh.setMatrixAt(i, tmpMatrix.compose(tmpPosition, instance.rotation, tmpScale));
  });
  mesh.instanceMatrix.needsUpdate = true;
}

function InstanceBatch({
  geometry,
  material,
  instances,
  shadows,
}: {
  geometry: Part["geometry"];
  material: MeshStandardMaterial | MeshBasicMaterial;
  instances: readonly Instance[];
  shadows?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  const progress = useContext(PopContext);
  const settled = useRef(false);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    instances.forEach((instance, i) => mesh.setColorAt(i, instance.color));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    writeInstances(mesh, instances, pop(progress.current));
    mesh.computeBoundingSphere();
    settled.current = progress.current >= 1;
  }, [instances, progress]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || settled.current) return;
    writeInstances(mesh, instances, pop(progress.current));
    settled.current = progress.current >= 1;
  });

  return (
    <instancedMesh
      key={instances.length}
      ref={ref}
      args={[geometry(), material, instances.length]}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  );
}

/** Drives one shared pop-in progress for a storage piece's items. */
function usePopIn() {
  const reducedMotion = useReducedMotion();
  const progress = useRef(reducedMotion ? 1 : 0);
  const invalidate = useThree((state) => state.invalidate);

  useFrame((_, delta) => {
    if (progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + delta / POP_SECONDS);
    invalidate();
  });

  useLayoutEffect(() => {
    if (reducedMotion) progress.current = 1;
    invalidate();
  }, [reducedMotion, invalidate]);

  return progress;
}

export function ItemInstances({
  placements,
  markers,
}: {
  placements: readonly Placement[];
  markers: readonly MarkerPlacement[];
}) {
  const batches = useMemo(() => batchPlacements(placements), [placements]);
  const markerBatch = useMemo(() => markerInstances(markers), [markers]);
  const progress = usePopIn();

  return (
    <PopContext.Provider value={progress}>
      {batches.map((batch) => (
        <InstanceBatch key={batch.id} geometry={batch.geometry} material={itemMaterial} instances={batch.instances} shadows />
      ))}
      {markerBatch.length > 0 && (
        <InstanceBatch geometry={MARKER_GEOMETRY} material={markerMaterial} instances={markerBatch} />
      )}
    </PopContext.Provider>
  );
}
