"use client";

import { useEffect, useEffectEvent, useMemo } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, Plane, Raycaster, Vector2, Vector3 } from "three";
import type { WallSide } from "@pantrywood/shared";
import { CLICK_DRAG_TOLERANCE } from "./interaction";

const CELLS = 10;
const HALF = CELLS / 2;
const GRID_HEIGHT = 0.035;

const FITS = "#7E9A68";
const BLOCKED = "#C8755A";
const PICKED = "#E0752D";
const PICKED_RIM = 0.22;

/** Just off both walls: the right wall stands at z = -5, the left at x = -5. */
const ON_WALL = -4.93;
const WALL_HEIGHT = 5.8;
const HALF_ROOM = 5;

/** How far a point is off a wall's face, along it and up it; 0 when the point is on the wall. */
const offWall = (along: number, height: number) =>
  Math.max(0, Math.abs(along) - HALF_ROOM) + Math.max(0, -height) + Math.max(0, height - WALL_HEIGHT);

/**
 * The cells a carried piece would land on: sage when it fits, terracotta when something is in the way.
 * `picked`: the cells a picked piece stands on, in orange under it, so it's clear which piece the toolbar edits.
 * On a wall, `x` runs along it from the back corner, `z` is the height of its middle and `depth` its rows.
 */
export type Footprint = {
  x: number;
  z: number;
  width: number;
  depth: number;
  fits: boolean;
  wall: WallSide | null;
  picked?: boolean;
};

type FloorGridProps = {
  footprint: Footprint | null;
  onFloorClick: (x: number, z: number) => void;
  /** Where the pointer's ray meets the floor, and the wall it points at (distance along it, height). */
  onFloorPointerMove: (floorX: number, floorZ: number, wall: WallSide, wallAlong: number, wallY: number) => void;
};

export const FloorGrid = ({ footprint, onFloorClick, onFloorPointerMove }: FloorGridProps) => {
  const lines = useMemo(() => {
    const points: number[] = [];
    for (let index = 0; index <= CELLS; index++) {
      const offset = -HALF + index;
      points.push(offset, GRID_HEIGHT, -HALF, offset, GRID_HEIGHT, HALF);
      points.push(-HALF, GRID_HEIGHT, offset, HALF, GRID_HEIGHT, offset);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
    return geometry;
  }, []);
  useEffect(() => () => lines.dispose(), [lines]);
  // The room only renders on demand; showing the grid is a change it must draw.
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
    return () => invalidate();
  }, [invalidate]);

  // Read straight off the camera ray, so pieces and walls under the pointer never hide the floor.
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  // A new callback each render must not re-attach the listeners mid-drag.
  const reportPointer = useEffectEvent(onFloorPointerMove);
  useEffect(() => {
    const raycaster = new Raycaster();
    const floorPlane = new Plane(new Vector3(0, 1, 0), 0);
    const rightWallPlane = new Plane(new Vector3(0, 0, 1), -ON_WALL);
    const leftWallPlane = new Plane(new Vector3(1, 0, 0), -ON_WALL);
    const floorHit = new Vector3();
    const rightHit = new Vector3();
    const leftHit = new Vector3();
    const handleMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const pointer = new Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const { ray } = raycaster;
      if (!ray.intersectPlane(floorPlane, floorHit)) return;
      const right = ray.intersectPlane(rightWallPlane, rightHit) ? offWall(rightHit.x, rightHit.y) : Infinity;
      const left = ray.intersectPlane(leftWallPlane, leftHit) ? offWall(leftHit.z, leftHit.y) : Infinity;
      // The wall the pointer is over; off both, the nearer one, so a piece slides along it to the corner.
      if (left < right) reportPointer(floorHit.x, floorHit.z, "left", leftHit.z, leftHit.y);
      else reportPointer(floorHit.x, floorHit.z, "right", rightHit.x, rightHit.y);
    };
    // pointerdown too: a touch tap has no hover before it.
    canvas.addEventListener("pointerdown", handleMove);
    canvas.addEventListener("pointermove", handleMove);
    return () => {
      canvas.removeEventListener("pointerdown", handleMove);
      canvas.removeEventListener("pointermove", handleMove);
    };
  }, [camera, canvas]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > CLICK_DRAG_TOLERANCE) return;
    event.stopPropagation();
    onFloorClick(event.point.x, event.point.z);
  };

  return (
    <group>
      {footprint && (
        <mesh
          rotation={
            footprint.wall === "left" ? [0, Math.PI / 2, 0] : footprint.wall === "right" ? [0, 0, 0] : [-Math.PI / 2, 0, 0]
          }
          position={
            footprint.wall === "left"
              ? [ON_WALL, footprint.z, footprint.x]
              : footprint.wall === "right"
                ? [footprint.x, footprint.z, ON_WALL]
                : [footprint.x, GRID_HEIGHT + 0.005, footprint.z]
          }
          renderOrder={1}
        >
          {/* A picked piece covers its own cells, so its footprint reaches a little past them as a rim. */}
          <planeGeometry
            args={[footprint.width + (footprint.picked ? PICKED_RIM * 2 : 0), footprint.depth + (footprint.picked ? PICKED_RIM * 2 : 0)]}
          />
          {/* A carried footprint shows through pieces in the way; a picked one stays under its own piece. */}
          <meshBasicMaterial
            color={footprint.picked ? PICKED : footprint.fits ? FITS : BLOCKED}
            transparent
            opacity={footprint.picked ? 0.55 : 0.4}
            depthTest={footprint.picked === true}
            depthWrite={false}
          />
        </mesh>
      )}
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#5E7550" transparent opacity={0.45} />
      </lineSegments>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, GRID_HEIGHT, 0]}
        visible={false}
        onClick={handleClick}
      >
        <planeGeometry args={[CELLS, CELLS]} />
      </mesh>
    </group>
  );
};
