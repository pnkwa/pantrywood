"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Color, ExtrudeGeometry, Path, Shape, ShapeGeometry, type PointLight } from "three";
import { Sunflowers } from "./Greenery";
import { KIT } from "./kit";
import { GlowPatch, shownDaylight, useGlow } from "./daylight-clock";
import { Matte } from "./materials";
import { pegboardTexture } from "./textures";
import type { SceneDecor } from "./types";

// The room's starting decor, each drawn around its own origin so Decorate can place it.

const FRAME_SIZE = 1.8;
const FRAME_RADIUS = 0.4;
const GLASS_SIZE = 1.46;
const GLASS_RADIUS = 0.28;

const roundedSquare = <T extends Path>(path: T, size: number, radius: number) => {
  const half = size / 2;
  path.moveTo(-half + radius, -half);
  path.lineTo(half - radius, -half);
  path.quadraticCurveTo(half, -half, half, -half + radius);
  path.lineTo(half, half - radius);
  path.quadraticCurveTo(half, half, half - radius, half);
  path.lineTo(-half + radius, half);
  path.quadraticCurveTo(-half, half, -half, half - radius);
  path.lineTo(-half, -half + radius);
  path.quadraticCurveTo(-half, -half, -half + radius, -half);
  return path;
};

const WARM_GLASS = new Color("#FFE3A8");
const WARM_LIGHT = new Color("#FFE1A8");
const MOON_GLASS = new Color("#A9C4F2");

/** Warm light behind the glass, brightest in the evening; cool moonlight instead when the lights are switched off. */
const GLASS_MOONLIT = { warm: WARM_GLASS, moon: MOON_GLASS, boost: 0.9 };

const WindowGlass = () => {
  const glass = useGlow(0.45, 1.8, GLASS_MOONLIT);
  const shape = useMemo(() => new ShapeGeometry(roundedSquare(new Shape(), GLASS_SIZE, GLASS_RADIUS), 10), []);
  useEffect(() => () => shape.dispose(), [shape]);
  return (
    <mesh geometry={shape} position={[0, 0, 0.06]}>
      <meshStandardMaterial ref={glass} color="#DCEFF7" emissive="#FFE3A8" emissiveIntensity={0.15} roughness={1} />
    </mesh>
  );
};

/** Warm light pouring in from the window onto the room, strongest in the evening. No shadows: the sun casts those. */
const WindowLight = () => {
  const light = useRef<PointLight>(null);
  useFrame(() => {
    if (!light.current) return;
    // Lights off at night, it pours in cool and soft instead of warm.
    light.current.intensity = 1 + shownDaylight.glow * 3 + shownDaylight.moonlight * 0.8;
    light.current.color.copy(WARM_LIGHT).lerp(MOON_GLASS, shownDaylight.moonlight);
  });
  return <pointLight ref={light} position={[0, 0, 0.9]} color="#FFE1A8" intensity={1 + shownDaylight.glow * 3} distance={6} decay={1.6} />;
};

/** A chunky, very rounded sky-blue frame, puffed like a toy. */
const WindowFrame = () => {
  const frame = useMemo(() => {
    const outline = roundedSquare(new Shape(), FRAME_SIZE, FRAME_RADIUS);
    outline.holes.push(roundedSquare(new Path(), GLASS_SIZE, GLASS_RADIUS));
    return new ExtrudeGeometry(outline, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 12 });
  }, []);
  useEffect(() => () => frame.dispose(), [frame]);
  return (
    <mesh geometry={frame} position={[0, 0, 0.04]} castShadow receiveShadow>
      <Matte color={KIT.sky} />
    </mesh>
  );
};

/** The sunny window: a rounded sky-blue frame with bare glass, a sill with a potted plant and a soft glow round it. */
export const GinghamWindow = () => (
  <group position={[0, 0, -0.03]}>
    <GlowPatch size={[4.6, 4.6]} position={[0, -0.3, 0.012]} strength={1.5} />
    <WindowLight />
    <WindowGlass />
    <WindowFrame />
    <mesh position={[-0.32, 0.3, 0.07]}>
      <circleGeometry args={[0.22, 20]} />
      <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
    </mesh>
    {[0, Math.PI / 2].map((turn) => (
      <mesh key={turn} position={[0, 0, 0.1]} rotation={[0, 0, turn]}>
        <capsuleGeometry args={[0.035, GLASS_SIZE - 0.07, 4, 10]} />
        <Matte color={KIT.sky} />
      </mesh>
    ))}
    <RoundedBox args={[2.1, 0.16, 0.36]} radius={0.07} smoothness={4} position={[0, -0.98, 0.17]} castShadow>
      <Matte color={KIT.oak} />
    </RoundedBox>
    <Sunflowers position={[-0.55, -0.9, 0.2]} />
    <mesh position={[0.5, -0.78, 0.2]} castShadow>
      <cylinderGeometry args={[0.13, 0.1, 0.26, 16]} />
      <Matte color={KIT.tomato} />
    </mesh>
    <mesh position={[0.5, -0.56, 0.2]} castShadow>
      <sphereGeometry args={[0.17, 16, 12]} />
      <Matte color={KIT.leaf} />
    </mesh>
  </group>
);

const PICTURE_FRAMES = [
  { x: -0.38, y: -0.03, width: 0.6, height: 0.55, artColor: "#8FA67A" },
  { x: 0.39, y: 0.02, width: 0.45, height: 0.45, artColor: "#C8755A" },
];

export const PictureFrames = () => (
  <group position={[0, 0, -0.03]}>
    {PICTURE_FRAMES.map((frame) => (
      <group key={frame.x} position={[frame.x, frame.y, 0]}>
        <RoundedBox
          args={[frame.width, frame.height, 0.06]}
          radius={0.02}
          smoothness={2}
          position={[0, 0, 0.03]}
        >
          <Matte color="#A47551" />
        </RoundedBox>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[frame.width - 0.12, frame.height - 0.12]} />
          <Matte color="#FFFBF3" />
        </mesh>
        <mesh position={[0, -0.02, 0.07]}>
          <circleGeometry args={[frame.width * 0.17, 20]} />
          <Matte color={frame.artColor} />
        </mesh>
      </group>
    ))}
  </group>
);

/** A plain butter-yellow oval rug, the same yellow as the wall cabinet. */
export const OvalRug = () => (
  <mesh scale={[2.7, 1, 2.5]} receiveShadow>
    <cylinderGeometry args={[1, 1, 0.03, 48]} />
    <Matte color={KIT.butter} />
  </mesh>
);

type Veggie = {
  position: [number, number, number];
  radius: number;
  color: string;
};

const VEGGIES: Veggie[] = [
  { position: [-0.15, 0.48, 0], radius: 0.15, color: "#C8755A" },
  { position: [0.14, 0.5, 0.05], radius: 0.15, color: "#E2B25C" },
  { position: [0, 0.46, -0.15], radius: 0.13, color: "#8FA67A" },
];

const BOARD_WIDTH = 3;
const BOARD_HEIGHT = 2.25;
const BOARD_DEPTH = 0.06;
const FRAME = 0.08;

/** The pegboard on the wall, with each piece on it as a small flat card. */
export const Pegboard = ({ board }: { board: NonNullable<SceneDecor["board"]> }) => {
  const holes = useMemo(
    () => pegboardTexture(board.board, board.hole, [board.columns, board.rows]),
    [board.board, board.hole, board.columns, board.rows],
  );
  useEffect(() => () => holes.dispose(), [holes]);
  return (
    <group position={[0, 0, BOARD_DEPTH / 2]}>
      <RoundedBox args={[BOARD_WIDTH + FRAME * 2, BOARD_HEIGHT + FRAME * 2, BOARD_DEPTH]} radius={0.03} smoothness={2} castShadow>
        <Matte color={board.frame} />
      </RoundedBox>
      <mesh position={[0, 0, BOARD_DEPTH / 2 + 0.002]}>
        <planeGeometry args={[BOARD_WIDTH, BOARD_HEIGHT]} />
        <meshStandardMaterial map={holes} roughness={1} />
      </mesh>
      {board.planes.map((plane, index) => (
        <mesh
          key={plane.id}
          position={[
            -BOARD_WIDTH / 2 + (plane.x + plane.w / 2) * BOARD_WIDTH,
            BOARD_HEIGHT / 2 - (plane.y + plane.h / 2) * BOARD_HEIGHT,
            // Later pieces sit a hair further out, so overlaps follow the board's own order.
            BOARD_DEPTH / 2 + 0.01 + index * 0.002,
          ]}
        >
          <planeGeometry args={[plane.w * BOARD_WIDTH, plane.h * BOARD_HEIGHT]} />
          <Matte color={plane.color} />
        </mesh>
      ))}
    </group>
  );
};

export const VeggieBasket = () => (
  <group rotation={[0, -0.4, 0]}>
    <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.45, 0.35, 0.4, 20]} />
      <Matte color="#B98B57" />
    </mesh>
    <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.45, 0.035, 8, 24]} />
      <Matte color="#9A7043" />
    </mesh>
    <mesh position={[0, 0.4, 0]}>
      <torusGeometry args={[0.42, 0.025, 8, 24, Math.PI]} />
      <Matte color="#9A7043" />
    </mesh>
    {VEGGIES.map((veggie) => (
      <mesh key={veggie.color} position={veggie.position} castShadow>
        <sphereGeometry args={[veggie.radius, 16, 12]} />
        <Matte color={veggie.color} />
      </mesh>
    ))}
  </group>
);
