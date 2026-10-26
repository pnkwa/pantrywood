"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Box3, MathUtils, OrthographicCamera, Vector3, type Group } from "three";
import { catalogItem } from "@/data/catalog";
import { Shape } from "./DecorPieces";
import { StorageModel } from "./Storage";
import { Lights } from "./StorageRoomScene";
import { thumbnailStore } from "./thumbnail-store";

// The room camera's angle, so a thumbnail looks like the piece standing in the room.
const ELEVATION = MathUtils.degToRad(35);
const AZIMUTH = MathUtils.degToRad(45);
const VIEW_OFFSET = new Vector3(
  Math.cos(ELEVATION) * Math.sin(AZIMUTH),
  Math.sin(ELEVATION),
  Math.cos(ELEVATION) * Math.cos(AZIMUTH),
).multiplyScalar(30);
// The canvas matches a tile picture (w-full × h-19), so tall and wide pieces both fill it.
const MARGIN = 1.06;

const ModelFor = ({ itemId }: { itemId: string }) => {
  const item = catalogItem(itemId);
  if (item?.category === "storage") return <StorageModel kind={item.model.kind} palette={item.model.palette} items={[]} />;
  if (item?.category === "decor" && item.model.shape !== "pegboard") {
    return (
      <Shape
        decor={{ id: item.id, shape: item.model.shape, colors: item.model.colors, position: [0, 0, 0], rotationY: 0, size: item.footprint }}
        still
      />
    );
  }
  return null;
};

/** Mounts one model, frames it, draws one frame and keeps the picture. */
const Snapshot = ({ itemId }: { itemId: string }) => {
  const groupRef = useRef<Group>(null);
  const get = useThree((state) => state.get);

  useLayoutEffect(() => {
    const { gl, scene, camera, size } = get();
    const group = groupRef.current;
    if (!group || !(camera instanceof OrthographicCamera)) return;
    const box = new Box3().setFromObject(group);
    if (box.isEmpty()) {
      thumbnailStore.save(itemId, "");
      return;
    }
    const center = box.getCenter(new Vector3());
    camera.position.copy(center).add(VIEW_OFFSET);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    let halfWidth = 0;
    let halfHeight = 0;
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const inView = new Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          halfWidth = Math.max(halfWidth, Math.abs(inView.x));
          halfHeight = Math.max(halfHeight, Math.abs(inView.y));
        }
      }
    }
    camera.zoom = Math.min(size.width / (halfWidth * 2 * MARGIN), size.height / (halfHeight * 2 * MARGIN));
    camera.updateProjectionMatrix();
    gl.render(scene, camera);
    thumbnailStore.save(itemId, gl.domElement.toDataURL("image/png"));
  }, [itemId, get]);

  return (
    <group ref={groupRef}>
      <ModelFor itemId={itemId} />
    </group>
  );
};

/**
 * An offscreen canvas that turns catalog pieces into pictures of their real 3D models, so the
 * build tray shows the furniture as it will stand in the room. One WebGL context for all of them.
 */
export const ThumbnailStudio = () => {
  const itemId = useSyncExternalStore(thumbnailStore.subscribe, thumbnailStore.next, () => null);
  return (
    <div aria-hidden className="pointer-events-none fixed top-0 -left-[10000px] h-38 w-60">
      <Canvas frameloop="never" flat orthographic dpr={2} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}>
        <Lights shadowMapSize={512} />
        {itemId && <Snapshot key={itemId} itemId={itemId} />}
      </Canvas>
    </div>
  );
};
