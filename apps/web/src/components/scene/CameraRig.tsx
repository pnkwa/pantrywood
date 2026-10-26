"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type Ref,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MapControls, OrthographicCamera } from "@react-three/drei";
import {
  MathUtils,
  Vector3,
  type OrthographicCamera as OrthographicCameraImpl,
} from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type MapControlsImpl = ComponentRef<typeof MapControls>;

export type PanDirection = "up" | "down" | "left" | "right";

export type CameraApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  panBy: (direction: PanDirection) => void;
};

export type CameraFocus = {
  target: [x: number, y: number, z: number];
  /** Relative to the zoom that fits the whole room. */
  zoomFactor: number;
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
const PAN_STEP = 1.5;
const MAX_ZOOM_FACTOR = 3.5;
const MIN_ZOOM_FACTOR = 0.85;
const ZOOM_STEP = 1.4;
const GLIDE_SPEED = 9;
const FOCUS_SECONDS = 0.6;
const MAX_FRAME_SECONDS = 1 / 30;
const FIT_MARGIN_X = 1.06;
const FIT_MARGIN_Y = 1.08;

// Screen directions on the floor for this isometric angle.
const SCREEN_UP_ON_FLOOR = new Vector3(-1, 0, -1).normalize();
const SCREEN_DOWN_ON_FLOOR = SCREEN_UP_ON_FLOOR.clone().negate();
const SCREEN_RIGHT_ON_FLOOR = new Vector3(1, 0, -1).normalize();
const PAN_DIRECTIONS: Record<PanDirection, Vector3> = {
  up: SCREEN_UP_ON_FLOOR,
  down: SCREEN_UP_ON_FLOOR.clone().negate(),
  right: SCREEN_RIGHT_ON_FLOOR,
  left: SCREEN_RIGHT_ON_FLOOR.clone().negate(),
};

const ROOM_CORNERS = [-5.8, 5.8].flatMap((cornerX) =>
  [-0.9, 6.7].flatMap((cornerY) =>
    [-5.8, 5.8].map((cornerZ) => new Vector3(cornerX, cornerY, cornerZ)),
  ),
);

// The room's extent on screen around HOME_TARGET, in world units (the camera never rotates).
const VIEW_DIRECTION = CAMERA_OFFSET.clone().normalize().negate();
const SCREEN_UP = new Vector3(0, 1, 0).addScaledVector(VIEW_DIRECTION, -VIEW_DIRECTION.y).normalize();
const SCREEN_RIGHT = new Vector3().crossVectors(VIEW_DIRECTION, SCREEN_UP).normalize();
const cornerUps = ROOM_CORNERS.map((corner) => corner.clone().sub(HOME_TARGET).dot(SCREEN_UP));
const ROOM_HALF_WIDTH = Math.max(...ROOM_CORNERS.map((corner) => Math.abs(corner.clone().sub(HOME_TARGET).dot(SCREEN_RIGHT))));
const ROOM_HALF_HEIGHT = Math.max(...cornerUps.map(Math.abs));
const ROOM_TOP = Math.max(...cornerUps);
const ROOM_BOTTOM = Math.min(...cornerUps);

/** Pixels per world unit that fit the whole room; with a bottom panel, it fits the space above it. */
const fitZoom = (width: number, height: number, inset: number) =>
  Math.min(
    width / (ROOM_HALF_WIDTH * 2 * FIT_MARGIN_X),
    inset > 0 ? (height - inset) / ((ROOM_TOP - ROOM_BOTTOM) * FIT_MARGIN_Y) : height / (ROOM_HALF_HEIGHT * 2 * FIT_MARGIN_Y),
  );

const clampToRoom = (target: Vector3) =>
  new Vector3(
    MathUtils.clamp(target.x, -PAN_LIMIT, PAN_LIMIT),
    HOME_TARGET.y,
    MathUtils.clamp(target.z, -PAN_LIMIT, PAN_LIMIT),
  );

const easeInOutCubic = (progress: number) =>
  progress < 0.5
    ? 4 * progress ** 3
    : 1 - (-2 * progress + 2) ** 3 / 2;

type DampedGoal = { zoom: number; target: Vector3 | null };

type TimedGlide = {
  fromZoom: number;
  toZoom: number;
  fromTarget: Vector3;
  toTarget: Vector3;
  elapsed: number;
  onDone?: () => void;
};

type CameraRigProps = {
  ref?: Ref<CameraApi>;
  focus?: CameraFocus | null;
  onFocusSettled?: () => void;
  /** While a piece is dragged, the drag moves the piece instead of the camera. */
  panLocked?: boolean;
  /** Pixels a panel covers at the bottom; the room fits and centers in the space above it. */
  bottomInset?: number;
};

/** Where the camera looks so the room's middle sits in the middle of the space above a bottom panel. */
const homeFor = (inset: number, zoom: number) => {
  if (inset === 0) return HOME_TARGET.clone();
  const raisePixels = inset / 2 - ((ROOM_TOP + ROOM_BOTTOM) / 2) * zoom;
  // A step toward the camera on the floor shows up on screen as that step times sin(elevation).
  return HOME_TARGET.clone().addScaledVector(SCREEN_DOWN_ON_FLOOR, raisePixels / (zoom * Math.sin(ELEVATION)));
};

export const CameraRig = ({ ref, focus, onFocusSettled, panLocked = false, bottomInset = 0 }: CameraRigProps) => {
  const cameraRef = useRef<OrthographicCameraImpl>(null);
  // drei rebuilds the controls when the default camera changes, so they're only reached through props or this ref.
  const controlsRef = useRef<MapControlsImpl>(null);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const reducedMotion = useReducedMotion();

  const [baseZoom, setBaseZoom] = useState(1);
  const baseZoomRef = useRef(1);
  const goalRef = useRef<DampedGoal | null>(null);
  const glideRef = useRef<TimedGlide | null>(null);
  // A panel taller than this leaves too little room to fit into, so the room stays put under it.
  const inset = bottomInset <= size.height * 0.55 ? bottomInset : 0;
  const insetRef = useRef(inset);
  const homeRef = useRef(HOME_TARGET.clone());

  const startGlide = useCallback(
    (toTarget: Vector3, toZoom: number, onDone?: () => void) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      goalRef.current = null;
      glideRef.current = {
        fromZoom: camera.zoom,
        toZoom,
        fromTarget: controls.target.clone(),
        toTarget,
        elapsed: 0,
        onDone,
      };
      invalidate();
    },
    [invalidate],
  );

  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const target = controlsRef.current?.target ?? HOME_TARGET;
    const previousBaseZoom = baseZoomRef.current;
    camera.position.copy(target).add(CAMERA_OFFSET);
    camera.lookAt(target);
    const fittedZoom = fitZoom(size.width, size.height, inset);
    baseZoomRef.current = fittedZoom;
    setBaseZoom(fittedZoom);
    const previousHome = homeRef.current;
    homeRef.current = homeFor(inset, fittedZoom);
    const glide = glideRef.current;
    const keptZoom = MathUtils.clamp(
      ((glide?.toZoom ?? camera.zoom) / previousBaseZoom) * fittedZoom,
      fittedZoom * MIN_ZOOM_FACTOR,
      fittedZoom * MAX_ZOOM_FACTOR,
    );
    // A view resting on or gliding to home follows home when the canvas resizes, even mid-glide.
    const headingHome = (glide?.toTarget ?? target).distanceTo(previousHome) < 0.01;
    if (inset !== insetRef.current || (headingHome && (glide !== null || !previousHome.equals(homeRef.current)))) {
      // The panel opened or closed: glide the room into the space that's left.
      const panelChanged = inset !== insetRef.current;
      insetRef.current = inset;
      startGlide(homeRef.current.clone(), panelChanged ? fittedZoom : keptZoom);
      return;
    }
    camera.zoom = keptZoom;
    camera.updateProjectionMatrix();
    controlsRef.current?.update();
    invalidate();
  }, [size.width, size.height, inset, invalidate, startGlide]);

  const [focusX, focusY, focusZ] = focus?.target ?? [];
  const focusZoomFactor = focus?.zoomFactor;
  const wasFocused = useRef(false);
  useEffect(() => {
    if (
      focusX !== undefined &&
      focusY !== undefined &&
      focusZ !== undefined &&
      focusZoomFactor !== undefined
    ) {
      wasFocused.current = true;
      startGlide(
        new Vector3(focusX, focusY, focusZ),
        baseZoomRef.current * focusZoomFactor,
        onFocusSettled,
      );
    } else if (wasFocused.current) {
      wasFocused.current = false;
      startGlide(homeRef.current.clone(), baseZoomRef.current);
    }
  }, [focusX, focusY, focusZ, focusZoomFactor, startGlide, onFocusSettled]);

  const keepInsideRoom = useCallback(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera || glideRef.current) return;
    const target = controls.target;
    const clamped = clampToRoom(target);
    if (clamped.equals(target)) return;
    camera.position.add(clamped.clone().sub(target));
    target.copy(clamped);
  }, []);

  const handOverToUser = useCallback(() => {
    goalRef.current = null;
  }, []);

  useImperativeHandle(ref, () => {
    const glideTo = (zoom: number, target: Vector3 | null) => {
      const base = baseZoomRef.current;
      glideRef.current = null;
      goalRef.current = {
        zoom: MathUtils.clamp(
          zoom,
          base * MIN_ZOOM_FACTOR,
          base * MAX_ZOOM_FACTOR,
        ),
        target,
      };
      invalidate();
    };
    const currentZoom = () =>
      goalRef.current?.zoom ?? cameraRef.current?.zoom ?? baseZoomRef.current;
    const currentTarget = () =>
      goalRef.current?.target ??
      controlsRef.current?.target.clone() ??
      HOME_TARGET.clone();
    return {
      zoomIn: () => glideTo(currentZoom() * ZOOM_STEP, null),
      zoomOut: () => glideTo(currentZoom() / ZOOM_STEP, null),
      reset: () => glideTo(baseZoomRef.current, homeRef.current.clone()),
      panBy: (direction) => {
        const zoomScale = currentZoom() / baseZoomRef.current;
        const step = PAN_DIRECTIONS[direction]
          .clone()
          .multiplyScalar(PAN_STEP / zoomScale);
        glideTo(currentZoom(), clampToRoom(currentTarget().add(step)));
      },
    };
  }, [invalidate]);

  const moveTarget = (controls: MapControlsImpl, camera: OrthographicCameraImpl, next: Vector3) => {
    camera.position.add(next.clone().sub(controls.target));
    controls.target.copy(next);
  };

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const glide = glideRef.current;
    if (glide) {
      // On-demand rendering means the first frame after a pause can report a huge delta.
      glide.elapsed += Math.min(delta, MAX_FRAME_SECONDS);
      const progress = reducedMotion
        ? 1
        : Math.min(1, glide.elapsed / FOCUS_SECONDS);
      const eased = easeInOutCubic(progress);
      camera.zoom = MathUtils.lerp(glide.fromZoom, glide.toZoom, eased);
      moveTarget(
        controls,
        camera,
        glide.fromTarget.clone().lerp(glide.toTarget, eased),
      );
      camera.updateProjectionMatrix();
      controls.update();
      if (progress >= 1) {
        glideRef.current = null;
        glide.onDone?.();
      }
      invalidate();
      return;
    }

    const goal = goalRef.current;
    if (!goal) return;
    const speed = reducedMotion ? Infinity : GLIDE_SPEED;
    camera.zoom = MathUtils.damp(camera.zoom, goal.zoom, speed, delta);
    if (goal.target) {
      moveTarget(
        controls,
        camera,
        controls.target
          .clone()
          .lerp(goal.target, reducedMotion ? 1 : 1 - Math.exp(-speed * delta)),
      );
    }
    const zoomReached = Math.abs(camera.zoom - goal.zoom) < goal.zoom * 0.001;
    const targetReached =
      !goal.target || controls.target.distanceTo(goal.target) < 0.005;
    if (zoomReached && targetReached) {
      camera.zoom = goal.zoom;
      if (goal.target) moveTarget(controls, camera, goal.target);
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
        enabled={!panLocked}
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
