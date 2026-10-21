"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CatmullRomCurve3, LatheGeometry, Vector2, Vector3, type Group } from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Matte } from "./materials";

/** patch: honey cat with brown patches · mask: pale cat with a dark face, ears and tail tip · plain: one colour, bright eyes. */
export type CatPattern = "patch" | "mask" | "plain";

/** A body's outline: how tall, how wide at the floor, and how full its shoulders are. */
type BodyShape = { height: number; radius: number; power: number; fullness: number; tuck: number };

const GUMDROP: BodyShape = { height: 0.72, radius: 0.34, power: 2.6, fullness: 0.5, tuck: 6 };
/** A big face: wide-set eyes low on the body, like a toy. */
const EYE_SPREAD = 0.12;

const EAR_RADIUS = 0.16;
const EAR_LENGTH = 0.36;
const LINE_EYES = "#4A3B2E";
const NOSE = "#E98C8C";
const MASK_EYES = "#4E9BFF";
/** The cat only needs a gentle frame rate; the room otherwise renders on demand. */
const FRAME_MILLISECONDS = 1000 / 24;

const radiusAt = (shape: BodyShape, height: number) => {
  const along = height / shape.height;
  const outline = shape.radius * Math.max(0, 1 - along ** shape.power) ** shape.fullness;
  const footing = Math.min(1, 0.8 + along * shape.tuck);
  return outline * footing;
};

/** Where the body's surface is, facing +x, at a height and a sideways offset. */
const onSurface = (shape: BodyShape, height: number, sideways: number, lift = 0.004): [number, number, number] => [
  Math.sqrt(Math.max(0, radiusAt(shape, height) ** 2 - sideways ** 2)) + lift,
  height,
  sideways,
];

const bodyGeometry = (shape: BodyShape) =>
  new LatheGeometry(
    Array.from({ length: 25 }, (_, index) => {
      const height = (index / 24) * shape.height;
      return new Vector2(index === 24 ? 0 : radiusAt(shape, height), height);
    }),
    40,
  );

const BODY = bodyGeometry(GUMDROP);

/** Up from the back, curling over at the top like a question mark. */
const TAIL = new CatmullRomCurve3([
  new Vector3(0, 0, 0),
  new Vector3(-0.16, 0.04, 0),
  new Vector3(-0.27, 0.22, 0),
  new Vector3(-0.27, 0.46, 0),
  new Vector3(-0.17, 0.58, 0),
  new Vector3(-0.07, 0.54, 0),
]);
const TAIL_TIP: [number, number, number] = [-0.07, 0.54, 0];

type ToyCatProps = { pattern: CatPattern; colors: [body: string, accent: string] };

export const ToyCat = ({ pattern, colors: [body, accent] }: ToyCatProps) => {
  const bodyRef = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const eyesRef = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const reducedMotion = useReducedMotion();
  const shape = GUMDROP;
  const eyeHeight = shape.height * 0.5;
  const earHeight = shape.height * 0.94;
  const ears = pattern === "mask" ? accent : body;
  const tailTip = pattern === "plain" ? body : accent;
  const eyeColor = pattern === "patch" ? LINE_EYES : pattern === "mask" ? MASK_EYES : accent;
  // The mask cat's eyes sit in front of its mask, not under it.
  const eyeLift = pattern === "mask" ? 0.034 : 0.004;
  const eyePositions = useMemo(
    () => [-EYE_SPREAD, EYE_SPREAD].map((side) => onSurface(shape, eyeHeight, side, eyeLift)),
    [shape, eyeHeight, eyeLift],
  );

  // On-demand rendering: the cat asks for its own frames, and stays still with reduced motion.
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => invalidate(), FRAME_MILLISECONDS);
    return () => clearInterval(timer);
  }, [invalidate, reducedMotion]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.elapsedTime;
    const breath = Math.sin(time * 2.2);
    const tilt = Math.max(0, Math.sin((time / 7) * Math.PI * 2) - 0.8) * 5;
    if (bodyRef.current) {
      bodyRef.current.scale.set(1 + breath * 0.015, 1 - breath * 0.02, 1 + breath * 0.015);
      bodyRef.current.rotation.x = tilt * Math.sin(time * 1.6) * 0.09;
    }
    if (tailRef.current) {
      tailRef.current.rotation.x = Math.sin(time * 1.3) * 0.28;
      tailRef.current.rotation.z = Math.sin(time * 0.9) * 0.08;
    }
    const blinking = time % 4 < 0.14;
    eyesRef.current?.scale.set(1, blinking ? 0.15 : 1, 1);
  });

  /** `tip`: colours the top half of the ear, which is the same cone at half size. */
  const ear = (side: 1 | -1, tip?: string) => (
    <group position={[0.01, earHeight, side * radiusAt(shape, earHeight) * 0.9]} rotation={[side * 0.28, 0, -0.06]}>
      <mesh castShadow>
        <coneGeometry args={[EAR_RADIUS, EAR_LENGTH, 20]} />
        <Matte color={ears} />
      </mesh>
      {tip && (
        <mesh position={[0, EAR_LENGTH / 4, 0]} scale={1.02}>
          <coneGeometry args={[EAR_RADIUS / 2, EAR_LENGTH / 2, 20]} />
          <Matte color={tip} />
        </mesh>
      )}
    </group>
  );

  return (
    // Turned so its face looks out at the room's camera.
    <group rotation={[0, -0.75, 0]}>
      <group ref={bodyRef}>
        <mesh geometry={BODY} castShadow receiveShadow>
          <Matte color={body} />
        </mesh>
        {ear(1, pattern === "patch" ? accent : undefined)}
        {ear(-1)}
        {pattern === "patch" && (
          <mesh position={[0.04, shape.height * 0.83, -0.12]} scale={[0.17, 0.09, 0.14]}>
            <sphereGeometry args={[1, 20, 12]} />
            <Matte color={accent} />
          </mesh>
        )}
        {pattern === "mask" && (
          <mesh position={onSurface(shape, eyeHeight + 0.01, 0, -0.04)} scale={[0.055, 0.11, 0.22]}>
            <sphereGeometry args={[1, 20, 14]} />
            <Matte color={accent} />
          </mesh>
        )}
        <group ref={eyesRef} position={[0, eyeHeight, 0]}>
          {eyePositions.map(([eyeX, , eyeZ]) => (
            <group key={eyeZ} position={[eyeX, 0, eyeZ]} rotation={[0, Math.atan2(-eyeZ, eyeX), 0]}>
              {pattern === "plain" ? (
                <>
                  <mesh rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.045, 0.017, 8, 24]} />
                    <meshBasicMaterial color={eyeColor} />
                  </mesh>
                  <mesh scale={[0.3, 1, 1]}>
                    <sphereGeometry args={[0.025, 12, 10]} />
                    <meshBasicMaterial color={body} />
                  </mesh>
                </>
              ) : (
                <mesh scale={[0.35, 1, 1]}>
                  <sphereGeometry args={[pattern === "patch" ? 0.04 : 0.05, 14, 12]} />
                  <meshBasicMaterial color={eyeColor} />
                </mesh>
              )}
            </group>
          ))}
        </group>
        <mesh position={onSurface(shape, eyeHeight - 0.07, 0, eyeLift + 0.004)} scale={[0.4, 0.75, 1]}>
          <sphereGeometry args={[0.032, 14, 10]} />
          <Matte color={NOSE} />
        </mesh>
      </group>
      <group ref={tailRef} position={[-shape.radius * 0.7, 0.12, 0]}>
        <mesh castShadow>
          <tubeGeometry args={[TAIL, 40, 0.055, 12, false]} />
          <Matte color={body} />
        </mesh>
        <mesh position={TAIL_TIP} castShadow>
          <sphereGeometry args={[0.058, 14, 10]} />
          <Matte color={tailTip} />
        </mesh>
      </group>
    </group>
  );
};
