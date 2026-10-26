"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { Group } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Matte } from "../materials";
import { BarHandle, Brass, KIT } from "../kit";
import type { StoragePalette } from "../types";

const WIDTH = 2.2;
const HEIGHT = 4.5;
const CENTER_Y = 2.35;
const CORNER_RADIUS = 0.3;
const SMOOTHNESS = 5;
const BACK_Z = -0.9;
const FRONT_Z = 0.9;
const SEAM_Z = 0.6;
const DOOR_DEPTH = FRONT_Z - SEAM_Z;
const DEFAULT_PALETTE: StoragePalette = { body: "#F3EADB", trim: "#C9B79A", accent: "#D9CCB0" };
const SEAM_LINE_PIXELS = 1.5;
const SEAM_CORNER_STEPS = 8;
const HINGE_X = -WIDTH / 2;
const NOTE_LINE_HEIGHTS = [0.15, 0, -0.15];
const SHELF_HEIGHTS = [1.25, 2.25];
const DOOR_BIN_HEIGHTS = [1.4, 2.5, 3.9];

// Swings out towards the room on its left hinge, with a tiny settle (DESIGN.md section 10).
const OPEN_ANGLE = -1.9;
const SPRING_STIFFNESS = 170;
const SPRING_DAMPING = 19;
const MAX_FRAME_SECONDS = 1 / 30;
const SPRING_SUBSTEPS = 4;

/**
 * One rounded fridge shell cut flat at the seam: the body keeps the back, the door keeps the
 * front. Only the outside edges are rounded, so the two meet flush at the same height.
 */
const cutShell = (keep: "back" | "front") => {
  const geometry = new RoundedBoxGeometry(
    WIDTH,
    HEIGHT,
    FRONT_Z - BACK_Z,
    SMOOTHNESS,
    CORNER_RADIUS,
  );
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const capNormalZ = keep === "back" ? 1 : -1;
  for (let index = 0; index < positions.count; index++) {
    const z = positions.getZ(index);
    const beyondSeam = keep === "back" ? z > SEAM_Z : z < SEAM_Z;
    if (!beyondSeam) continue;
    positions.setZ(index, SEAM_Z);
    // Flattened curve vertices become part of the cut face, so they face straight out of it.
    if (Math.abs(normals.getZ(index)) > 0.001) {
      normals.setXYZ(index, 0, 0, capNormalZ);
    }
  }
  positions.needsUpdate = true;
  normals.needsUpdate = true;
  if (keep === "front") geometry.translate(0, 0, -SEAM_Z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

/** The shell's outline at the seam: a rounded rectangle, nudged out so it sits on the surface. */
const seamOutline = (): [number, number, number][] => {
  const halfWidth = WIDTH / 2 + 0.003;
  const halfHeight = HEIGHT / 2 + 0.003;
  const radius = CORNER_RADIUS + 0.003;
  const corners: [centerX: number, centerY: number, startAngle: number][] = [
    [halfWidth - radius, halfHeight - radius, 0],
    [-halfWidth + radius, halfHeight - radius, Math.PI / 2],
    [-halfWidth + radius, -halfHeight + radius, Math.PI],
    [halfWidth - radius, -halfHeight + radius, (Math.PI * 3) / 2],
  ];
  const points = corners.flatMap(([centerX, centerY, startAngle]) =>
    Array.from({ length: SEAM_CORNER_STEPS + 1 }, (_, step) => {
      const angle = startAngle + (step / SEAM_CORNER_STEPS) * (Math.PI / 2);
      const point: [number, number, number] = [
        centerX + Math.cos(angle) * radius,
        CENTER_Y + centerY + Math.sin(angle) * radius,
        0,
      ];
      return point;
    }),
  );
  const first = points[0];
  return first ? [...points, first] : points;
};

const useDoorSwing = (open: boolean) => {
  const hingeRef = useRef<Group>(null);
  const velocity = useRef(0);
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => invalidate(), [open, invalidate]);

  useFrame((_, delta) => {
    const hinge = hingeRef.current;
    if (!hinge) return;
    const target = open ? OPEN_ANGLE : 0;
    const settled =
      Math.abs(hinge.rotation.y - target) < 0.001 &&
      Math.abs(velocity.current) < 0.001;
    if (settled) return;
    if (reducedMotion) {
      hinge.rotation.y = target;
      velocity.current = 0;
      invalidate();
      return;
    }
    const step = Math.min(delta, MAX_FRAME_SECONDS) / SPRING_SUBSTEPS;
    for (let substep = 0; substep < SPRING_SUBSTEPS; substep++) {
      const acceleration =
        SPRING_STIFFNESS * (target - hinge.rotation.y) -
        SPRING_DAMPING * velocity.current;
      velocity.current += acceleration * step;
      hinge.rotation.y += velocity.current * step;
    }
    invalidate();
  });

  return hingeRef;
};

const Interior = ({ seam }: { seam: string }) => (
  <group position={[0, 0, SEAM_Z + 0.002]}>
    <mesh position={[0, CENTER_Y, 0]}>
      <planeGeometry args={[1.5, 3.8]} />
      <Matte color="#DCE8EA" />
    </mesh>
    <mesh position={[0, 4.05, 0.003]}>
      <planeGeometry args={[0.6, 0.1]} />
      <meshBasicMaterial color="#FFF3D6" />
    </mesh>
    <mesh position={[0, 3.28, 0.06]}>
      <boxGeometry args={[1.5, 0.08, 0.12]} />
      <Matte color={seam} />
    </mesh>
    {SHELF_HEIGHTS.map((shelfY) => (
      <mesh key={shelfY} position={[0, shelfY, 0.04]}>
        <boxGeometry args={[1.45, 0.04, 0.08]} />
        <Matte color="#A9C4C9" transparent opacity={0.8} />
      </mesh>
    ))}
  </group>
);

const DoorFront = ({ seam, handle }: { seam: string; handle: string }) => (
  <group position={[0, 0, DOOR_DEPTH]}>
    <mesh position={[0, 3.28, 0.002]}>
      <planeGeometry args={[1.4, 0.05]} />
      <Matte color={seam} />
    </mesh>
    {/* Brass bar pulls, one for the freezer and one for the main door. */}
    <BarHandle position={[0.72, 3.85, 0]} length={0.6} />
    <BarHandle position={[0.72, 2.35, 0]} length={1.0} />
    <mesh position={[0, 4.35, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.1, 0.1, 0.03, 20]} />
      <Brass />
    </mesh>
    <mesh position={[0, 0.5, 0.005]}>
      <planeGeometry args={[1.2, 0.22]} />
      <Matte color={handle} />
    </mesh>
    <group position={[-0.3, 2.55, 0.01]} rotation={[0, 0, 0.1]}>
      <mesh>
        <planeGeometry args={[0.6, 0.7]} />
        <Matte color="#FFFBF3" />
      </mesh>
      {NOTE_LINE_HEIGHTS.map((lineY, lineIndex) => (
        <mesh key={lineY} position={[-0.04 + lineIndex * 0.02, lineY, 0.002]}>
          <planeGeometry args={[0.38 - lineIndex * 0.06, 0.03]} />
          <Matte color="#D9C9AE" />
        </mesh>
      ))}
      <mesh position={[0, 0.33, 0.03]}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <Matte color="#C8755A" />
      </mesh>
    </group>
    <mesh position={[0.25, 1.4, 0.03]}>
      <sphereGeometry args={[0.1, 12, 8]} />
      <Matte color="#C8755A" />
    </mesh>
    <mesh position={[-0.6, 4.0, 0.03]}>
      <sphereGeometry args={[0.09, 12, 8]} />
      <Matte color="#A9C9DA" />
    </mesh>
    <mesh position={[0.2, 3.65, 0.03]}>
      <sphereGeometry args={[0.08, 12, 8]} />
      <Matte color="#E2B25C" />
    </mesh>
  </group>
);

const DoorInside = () => (
  <group position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]}>
    <mesh position={[0, CENTER_Y, 0]}>
      <planeGeometry args={[1.5, 3.8]} />
      <Matte color="#EADFCB" />
    </mesh>
    {DOOR_BIN_HEIGHTS.map((binY) => (
      <mesh key={binY} position={[0, binY, 0.1]}>
        <boxGeometry args={[1.4, 0.22, 0.18]} />
        <Matte color="#F7F0E3" />
      </mesh>
    ))}
  </group>
);

export const Fridge = ({
  doorOpen,
  palette = DEFAULT_PALETTE,
}: {
  doorOpen: boolean;
  palette?: StoragePalette;
}) => {
  const hingeRef = useDoorSwing(doorOpen);
  const bodyGeometry = useMemo(() => cutShell("back"), []);
  const doorGeometry = useMemo(() => cutShell("front"), []);
  const seamPoints = useMemo(() => seamOutline(), []);
  useEffect(
    () => () => {
      bodyGeometry.dispose();
      doorGeometry.dispose();
    },
    [bodyGeometry, doorGeometry],
  );

  return (
    <group>
      {[-0.75, 0.75].flatMap((footX) =>
        [-0.5, 0.5].map((footZ) => (
          <mesh key={`${footX}${footZ}`} position={[footX, 0.06, footZ]}>
            <cylinderGeometry args={[0.09, 0.07, 0.12, 12]} />
            <Matte color={KIT.shadowWood} />
          </mesh>
        )),
      )}
      <mesh
        geometry={bodyGeometry}
        position={[0, CENTER_Y, 0]}
        castShadow
        receiveShadow
      >
        <Matte color={palette.body} />
      </mesh>
      <Interior seam={palette.accent} />
      <group ref={hingeRef} position={[HINGE_X, 0, SEAM_Z]}>
        <group position={[-HINGE_X, 0, 0]}>
          <mesh
            geometry={doorGeometry}
            position={[0, CENTER_Y, 0]}
            castShadow
            receiveShadow
          >
            <Matte color={palette.body} />
          </mesh>
          <Line
            points={seamPoints}
            color={palette.accent}
            lineWidth={SEAM_LINE_PIXELS}
          />
          <DoorFront seam={palette.accent} handle={palette.trim} />
          <DoorInside />
        </group>
      </group>
    </group>
  );
};
