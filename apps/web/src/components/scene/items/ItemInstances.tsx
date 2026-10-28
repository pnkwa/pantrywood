"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { z } from "zod";
import {
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Intersection,
} from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { ItemMarker } from "../types";
import { markerGeometry, SHAPES, type Part } from "./shapes";
import type { MarkerPlacement, Placement } from "./arrange";

const itemMaterial = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
const markerMaterial = new MeshBasicMaterial();

const MARKER_COLORS: Record<ItemMarker, string> = {
  soon: "#E2B25C",
  expired: "#A8533A",
  low: "#C8755A",
};

const MARKER_SIZE = 0.1;
const PRODUCT_IDS_KEY = "productIds";

const ProductIdsSchema = z.array(z.number().nullable());

/** The product of the item instance a ray hit, or null when it hit something else. */
export const itemProductIdAt = (intersection: Intersection): number | null => {
  if (intersection.instanceId === undefined) return null;
  const parsed = ProductIdsSchema.safeParse(intersection.object.userData[PRODUCT_IDS_KEY]);
  return parsed.success ? (parsed.data[intersection.instanceId] ?? null) : null;
};
const POP_SECONDS = 0.35;
// On-demand rendering means the first frame after a pause can report a huge delta.
const MAX_FRAME_SECONDS = 1 / 30;
const POP_OVERSHOOT = 1.6;

type Instance = {
  productId: number | null;
  /** The part grows from here, so each item pops from its own base. */
  base: Vector3;
  offset: Vector3;
  rotation: Quaternion;
  size: Vector3;
  color: Color;
};

type Batch = { id: string; geometry: Part["geometry"]; instances: Instance[] };

const batchPlacements = (placements: readonly Placement[]): Batch[] => {
  const batches = new Map<string, Batch>();
  for (const placement of placements) {
    const rotation = new Quaternion().setFromEuler(
      new Euler(0, placement.rotationY, 0),
    );
    const scale = placement.scale ?? 1;
    SHAPES[placement.shape].parts.forEach((part, partIndex) => {
      const id = `${placement.shape}-${partIndex}`;
      const batch = batches.get(id) ?? {
        id,
        geometry: part.geometry,
        instances: [],
      };
      const color =
        part.color === "body"
          ? placement.color
          : part.color === "accent"
            ? placement.accent
            : part.color;
      batch.instances.push({
        productId: placement.productId,
        base: new Vector3(...placement.position),
        offset: new Vector3(...part.offset).multiplyScalar(scale).applyQuaternion(rotation),
        rotation,
        size: new Vector3(scale, scale, scale),
        color: new Color(color),
      });
      batches.set(id, batch);
    });
  }
  return [...batches.values()];
};

const markerInstances = (markers: readonly MarkerPlacement[]): Instance[] => {
  const rotation = new Quaternion().setFromEuler(
    new Euler(Math.PI / 4, Math.PI / 4, 0),
  );
  return markers.map((marker) => ({
    productId: null,
    base: new Vector3(...marker.position),
    offset: new Vector3(),
    rotation,
    size: new Vector3(MARKER_SIZE, MARKER_SIZE, MARKER_SIZE),
    color: new Color(MARKER_COLORS[marker.marker]),
  }));
};

const easeOutBack = (progress: number) =>
  1 +
  (POP_OVERSHOOT + 1) * Math.pow(progress - 1, 3) +
  POP_OVERSHOOT * Math.pow(progress - 1, 2);

const PopProgressContext = createContext<RefObject<number>>({ current: 1 });

const scratchMatrix = new Matrix4();
const scratchPosition = new Vector3();
const scratchScale = new Vector3();

const writeInstances = (
  mesh: InstancedMesh,
  instances: readonly Instance[],
  scale: number,
) => {
  instances.forEach((instance, index) => {
    scratchPosition
      .copy(instance.offset)
      .multiplyScalar(scale)
      .add(instance.base);
    scratchScale.copy(instance.size).multiplyScalar(Math.max(scale, 0.0001));
    mesh.setMatrixAt(
      index,
      scratchMatrix.compose(scratchPosition, instance.rotation, scratchScale),
    );
  });
  mesh.instanceMatrix.needsUpdate = true;
};

type InstanceBatchProps = {
  geometry: Part["geometry"];
  material: MeshStandardMaterial | MeshBasicMaterial;
  instances: readonly Instance[];
  shadows?: boolean;
};

const InstanceBatch = ({
  geometry,
  material,
  instances,
  shadows,
}: InstanceBatchProps) => {
  const meshRef = useRef<InstancedMesh>(null);
  const progress = useContext(PopProgressContext);
  const settled = useRef(false);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    instances.forEach((instance, index) =>
      mesh.setColorAt(index, instance.color),
    );
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    writeInstances(mesh, instances, easeOutBack(progress.current));
    mesh.computeBoundingSphere();
    settled.current = progress.current >= 1;
  }, [instances, progress]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || settled.current) return;
    writeInstances(mesh, instances, easeOutBack(progress.current));
    settled.current = progress.current >= 1;
  });

  return (
    <instancedMesh
      key={instances.length}
      ref={meshRef}
      args={[geometry(), material, instances.length]}
      castShadow={shadows}
      receiveShadow={shadows}
      userData={{ [PRODUCT_IDS_KEY]: instances.map((instance) => instance.productId) }}
    />
  );
};

const usePopIn = () => {
  const reducedMotion = useReducedMotion();
  const progress = useRef(reducedMotion ? 1 : 0);
  const invalidate = useThree((state) => state.invalidate);

  useFrame((_, delta) => {
    if (progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + Math.min(delta, MAX_FRAME_SECONDS) / POP_SECONDS);
    invalidate();
  });

  useLayoutEffect(() => {
    if (reducedMotion) progress.current = 1;
    invalidate();
  }, [reducedMotion, invalidate]);

  return progress;
};

type ItemInstancesProps = {
  placements: readonly Placement[];
  markers: readonly MarkerPlacement[];
};

/** One InstancedMesh per shape part, in the storage piece's local space so items move with it. */
export const ItemInstances = ({ placements, markers }: ItemInstancesProps) => {
  const batches = useMemo(() => batchPlacements(placements), [placements]);
  const markerBatch = useMemo(() => markerInstances(markers), [markers]);
  const progress = usePopIn();

  return (
    <PopProgressContext.Provider value={progress}>
      {batches.map((batch) => (
        <InstanceBatch
          key={batch.id}
          geometry={batch.geometry}
          material={itemMaterial}
          instances={batch.instances}
          shadows
        />
      ))}
      {markerBatch.length > 0 && (
        <InstanceBatch
          geometry={markerGeometry}
          material={markerMaterial}
          instances={markerBatch}
        />
      )}
    </PopProgressContext.Provider>
  );
};
