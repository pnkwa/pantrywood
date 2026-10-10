"use client";

import { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState, type ComponentRef, type Ref } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MapControls, OrthographicCamera } from "@react-three/drei";
import { MathUtils, Vector3, type OrthographicCamera as OrthoCamera } from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type MapControlsImpl = ComponentRef<typeof MapControls>;

/*
 * Orthographic isometric camera (~35° down, 45° around) with drag to pan and
 * wheel / pinch to zoom, kept inside the room. Zoom buttons glide smoothly.
 */

export type CameraApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

const ELEVATION = MathUtils.degToRad(35);
const AZIMUTH = MathUtils.degToRad(45);
const DISTANCE = 40;
const HOME_TARGET = new Vector3(0, 2.2, 0);
const OFFSET = new Vector3(
  Math.cos(ELEVATION) * Math.sin(AZIMUTH),
  Math.sin(ELEVATION),
  Math.cos(ELEVATION) * Math.cos(AZIMUTH),
).multiplyScalar(DISTANCE);

/** How far the view can pan from the middle of the room, in room units. */
const PAN_LIMIT = 4.5;
const MAX_ZOOM_FACTOR = 3.5;
const MIN_ZOOM_FACTOR = 0.85;
const STEP = 1.4;

/** Corners of the diorama, used to fit it to the viewport. */
const BOUNDS = [-5.8, 5.8].flatMap((x) =>
  [-0.9, 6.7].flatMap((y) => [-5.8, 5.8].map((z) => new Vector3(x, y, z))),
);

function fitZoom(camera: OrthoCamera, width: number, height: number) {
  camera.updateMatrixWorld();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const corner of BOUNDS) {
    const p = corner.clone().applyMatrix4(camera.matrixWorldInverse);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  // The fit is around the home target, so use the larger half on each axis.
  const halfW = Math.max(Math.abs(minX), Math.abs(maxX));
  const halfH = Math.max(Math.abs(minY), Math.abs(maxY));
  return Math.min(width / (halfW * 2 * 1.06), height / (halfH * 2 * 1.08));
}

export function CameraRig({ ref }: { ref?: Ref<CameraApi> }) {
  const camera = useRef<OrthoCamera>(null);
  // drei rebuilds the controls when the default camera changes, so everything that talks to
  // them goes through props (bound to the current instance) or this ref at call time.
  const controls = useRef<MapControlsImpl>(null);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const reducedMotion = useReducedMotion();

  const [baseZoom, setBaseZoom] = useState(1);
  const baseZoomRef = useRef(1);
  // Where a button asked the camera to glide to (null = the user is in control).
  const goal = useRef<{ zoom: number; target: Vector3 | null } | null>(null);

  // Fit the room on first render and whenever the viewport changes size,
  // keeping the user's relative zoom.
  useLayoutEffect(() => {
    const cam = camera.current;
    if (!cam) return;
    const target = controls.current?.target ?? HOME_TARGET;
    const previousBase = baseZoomRef.current;
    cam.position.copy(target).add(OFFSET);
    cam.lookAt(target);
    const fitted = fitZoom(cam, size.width, size.height);
    baseZoomRef.current = fitted;
    setBaseZoom(fitted);
    cam.zoom = MathUtils.clamp((cam.zoom / previousBase) * fitted, fitted * MIN_ZOOM_FACTOR, fitted * MAX_ZOOM_FACTOR);
    cam.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [size.width, size.height, invalidate]);

  // Keep the view inside the room: clamp the target and move the camera with it.
  const keepInside = useCallback(() => {
    const ctl = controls.current;
    const cam = camera.current;
    if (!ctl || !cam) return;
    const t = ctl.target;
    const x = MathUtils.clamp(t.x, -PAN_LIMIT, PAN_LIMIT);
    const z = MathUtils.clamp(t.z, -PAN_LIMIT, PAN_LIMIT);
    if (x === t.x && z === t.z && t.y === HOME_TARGET.y) return;
    cam.position.x += x - t.x;
    cam.position.y += HOME_TARGET.y - t.y;
    cam.position.z += z - t.z;
    t.set(x, HOME_TARGET.y, z);
  }, []);

  const takeOver = useCallback(() => {
    goal.current = null;
  }, []);

  useImperativeHandle(ref, () => {
    const glide = (zoom: number, target: Vector3 | null) => {
      const base = baseZoomRef.current;
      goal.current = { zoom: MathUtils.clamp(zoom, base * MIN_ZOOM_FACTOR, base * MAX_ZOOM_FACTOR), target };
      invalidate();
    };
    const current = () => goal.current?.zoom ?? camera.current?.zoom ?? baseZoomRef.current;
    return {
      zoomIn: () => glide(current() * STEP, null),
      zoomOut: () => glide(current() / STEP, null),
      reset: () => glide(baseZoomRef.current, HOME_TARGET.clone()),
    };
  }, [invalidate]);

  // Glide towards the goal: critically damped, no overshoot, interruptible by any drag.
  useFrame((_, delta) => {
    const g = goal.current;
    const cam = camera.current;
    const ctl = controls.current;
    if (!g || !cam || !ctl) return;
    const lambda = reducedMotion ? Infinity : 9;
    cam.zoom = MathUtils.damp(cam.zoom, g.zoom, lambda, delta);
    if (g.target) {
      const before = ctl.target.clone();
      ctl.target.lerp(g.target, reducedMotion ? 1 : 1 - Math.exp(-lambda * delta));
      cam.position.add(ctl.target.clone().sub(before));
    }
    const zoomDone = Math.abs(cam.zoom - g.zoom) < g.zoom * 0.001;
    const targetDone = !g.target || ctl.target.distanceTo(g.target) < 0.005;
    if (zoomDone && targetDone) {
      cam.zoom = g.zoom;
      if (g.target) {
        cam.position.add(g.target.clone().sub(ctl.target));
        ctl.target.copy(g.target);
      }
      goal.current = null;
    }
    cam.updateProjectionMatrix();
    ctl.update();
    invalidate();
  });

  return (
    <>
      <OrthographicCamera
        ref={camera}
        makeDefault
        position={HOME_TARGET.clone().add(OFFSET).toArray()}
        near={0.1}
        far={200}
      />
      <MapControls
        ref={controls}
        makeDefault
        target={HOME_TARGET.toArray()}
        enableRotate={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.12}
        zoomToCursor
        screenSpacePanning={false}
        minZoom={baseZoom * MIN_ZOOM_FACTOR}
        maxZoom={baseZoom * MAX_ZOOM_FACTOR}
        onChange={keepInside}
        onStart={takeOver}
      />
    </>
  );
}
