"use client";

import { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState, type ComponentRef, type Ref } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MapControls, OrthographicCamera } from "@react-three/drei";
import { MathUtils, Vector3, type OrthographicCamera as OrthographicCameraImpl } from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type MapControlsImpl = ComponentRef<typeof MapControls>;

export type CameraApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

const ELEVATION = MathUtils.degToRad(35);
const AZIMUTH = MathUtils.degToRad(45);
const CAMERA_DISTANCE = 40;
const HOME_TARGET = new Vector3(0, 2.2, 0);
const CAMERA_OFFSET = new Vector3(
  Math.cos(ELEVATION) * Math.sin(AZIMUTH),
  Math.sin(ELEVATION),
  Math.cos(ELEVATION) * Math.cos(AZIMUTH),
).multiplyScalar(CAMERA_DISTANCE);

const PAN_LIMIT = 4.5;
const MAX_ZOOM_FACTOR = 3.5;
const MIN_ZOOM_FACTOR = 0.85;
const ZOOM_STEP = 1.4;
const GLIDE_SPEED = 9;
const FIT_MARGIN_X = 1.06;
const FIT_MARGIN_Y = 1.08;

const ROOM_CORNERS = [-5.8, 5.8].flatMap((cornerX) =>
  [-0.9, 6.7].flatMap((cornerY) => [-5.8, 5.8].map((cornerZ) => new Vector3(cornerX, cornerY, cornerZ))),
);

const fitZoom = (camera: OrthographicCameraImpl, width: number, height: number) => {
  camera.updateMatrixWorld();
  let halfWidth = 0;
  let halfHeight = 0;
  for (const corner of ROOM_CORNERS) {
    const inView = corner.clone().applyMatrix4(camera.matrixWorldInverse);
    halfWidth = Math.max(halfWidth, Math.abs(inView.x));
    halfHeight = Math.max(halfHeight, Math.abs(inView.y));
  }
  return Math.min(width / (halfWidth * 2 * FIT_MARGIN_X), height / (halfHeight * 2 * FIT_MARGIN_Y));
};

type Goal = { zoom: number; target: Vector3 | null };

export const CameraRig = ({ ref }: { ref?: Ref<CameraApi> }) => {
  const cameraRef = useRef<OrthographicCameraImpl>(null);
  // drei rebuilds the controls when the default camera changes, so they're only reached through props or this ref.
  const controlsRef = useRef<MapControlsImpl>(null);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const reducedMotion = useReducedMotion();

  const [baseZoom, setBaseZoom] = useState(1);
  const baseZoomRef = useRef(1);
  const goalRef = useRef<Goal | null>(null);

  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const target = controlsRef.current?.target ?? HOME_TARGET;
    const previousBaseZoom = baseZoomRef.current;
    camera.position.copy(target).add(CAMERA_OFFSET);
    camera.lookAt(target);
    const fittedZoom = fitZoom(camera, size.width, size.height);
    baseZoomRef.current = fittedZoom;
    setBaseZoom(fittedZoom);
    camera.zoom = MathUtils.clamp(
      (camera.zoom / previousBaseZoom) * fittedZoom,
      fittedZoom * MIN_ZOOM_FACTOR,
      fittedZoom * MAX_ZOOM_FACTOR,
    );
    camera.updateProjectionMatrix();
    controlsRef.current?.update();
    invalidate();
  }, [size.width, size.height, invalidate]);

  const keepInsideRoom = useCallback(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;
    const target = controls.target;
    const clampedX = MathUtils.clamp(target.x, -PAN_LIMIT, PAN_LIMIT);
    const clampedZ = MathUtils.clamp(target.z, -PAN_LIMIT, PAN_LIMIT);
    if (clampedX === target.x && clampedZ === target.z && target.y === HOME_TARGET.y) return;
    camera.position.x += clampedX - target.x;
    camera.position.y += HOME_TARGET.y - target.y;
    camera.position.z += clampedZ - target.z;
    target.set(clampedX, HOME_TARGET.y, clampedZ);
  }, []);

  const handOverToUser = useCallback(() => {
    goalRef.current = null;
  }, []);

  useImperativeHandle(ref, () => {
    const glideTo = (zoom: number, target: Vector3 | null) => {
      const base = baseZoomRef.current;
      goalRef.current = { zoom: MathUtils.clamp(zoom, base * MIN_ZOOM_FACTOR, base * MAX_ZOOM_FACTOR), target };
      invalidate();
    };
    const currentZoom = () => goalRef.current?.zoom ?? cameraRef.current?.zoom ?? baseZoomRef.current;
    return {
      zoomIn: () => glideTo(currentZoom() * ZOOM_STEP, null),
      zoomOut: () => glideTo(currentZoom() / ZOOM_STEP, null),
      reset: () => glideTo(baseZoomRef.current, HOME_TARGET.clone()),
    };
  }, [invalidate]);

  useFrame((_, delta) => {
    const goal = goalRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!goal || !camera || !controls) return;
    const speed = reducedMotion ? Infinity : GLIDE_SPEED;
    camera.zoom = MathUtils.damp(camera.zoom, goal.zoom, speed, delta);
    if (goal.target) {
      const before = controls.target.clone();
      controls.target.lerp(goal.target, reducedMotion ? 1 : 1 - Math.exp(-speed * delta));
      camera.position.add(controls.target.clone().sub(before));
    }
    const zoomReached = Math.abs(camera.zoom - goal.zoom) < goal.zoom * 0.001;
    const targetReached = !goal.target || controls.target.distanceTo(goal.target) < 0.005;
    if (zoomReached && targetReached) {
      camera.zoom = goal.zoom;
      if (goal.target) {
        camera.position.add(goal.target.clone().sub(controls.target));
        controls.target.copy(goal.target);
      }
      goalRef.current = null;
    }
    camera.updateProjectionMatrix();
    controls.update();
    invalidate();
  });

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        position={HOME_TARGET.clone().add(CAMERA_OFFSET).toArray()}
        near={0.1}
        far={200}
      />
      <MapControls
        ref={controlsRef}
        makeDefault
        target={HOME_TARGET.toArray()}
        enableRotate={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.12}
        zoomToCursor
        screenSpacePanning={false}
        minZoom={baseZoom * MIN_ZOOM_FACTOR}
        maxZoom={baseZoom * MAX_ZOOM_FACTOR}
        onChange={keepInsideRoom}
        onStart={handOverToUser}
      />
    </>
  );
};
