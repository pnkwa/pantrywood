"use client";

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { Matte } from "./materials";
import { ginghamTexture } from "./textures";

// The room's starting decor, each drawn around its own origin so Decorate can place it.

export const GinghamWindow = () => {
  const curtain = useMemo(() => ginghamTexture(3, 6), []);
  const valance = useMemo(() => ginghamTexture(12, 2), []);

  return (
    <group position={[0, 0, -0.03]}>
      <RoundedBox
        args={[1.8, 1.8, 0.1]}
        radius={0.04}
        smoothness={2}
        position={[0, 0, 0.05]}
      >
        <Matte color="#A47551" />
      </RoundedBox>
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial color="#DCEBEE" />
      </mesh>
      <mesh position={[-0.35, -0.3, 0.12]}>
        <planeGeometry args={[0.5, 0.55]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.13]}>
        <boxGeometry args={[0.06, 1.5, 0.03]} />
        <Matte color="#A47551" />
      </mesh>
      <mesh position={[0, 0, 0.13]}>
        <boxGeometry args={[1.5, 0.06, 0.03]} />
        <Matte color="#A47551" />
      </mesh>
      <RoundedBox
        args={[2.1, 0.14, 0.34]}
        radius={0.04}
        smoothness={2}
        position={[0, -0.98, 0.17]}
        castShadow
      >
        <Matte color="#8C6440" />
      </RoundedBox>
      <mesh position={[0.5, -0.78, 0.2]} castShadow>
        <cylinderGeometry args={[0.13, 0.1, 0.26, 16]} />
        <Matte color="#C8755A" />
      </mesh>
      <mesh position={[0.5, -0.56, 0.2]} castShadow>
        <sphereGeometry args={[0.17, 16, 12]} />
        <Matte color="#8FA67A" />
      </mesh>
      {/* The curtain rod lies across the top; a cylinder stands upright unless turned. */}
      <mesh position={[0, 1.05, 0.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.4, 12]} />
        <Matte color="#6E4E33" />
      </mesh>
      {[-0.85, 0.85].map((curtainX) => (
        <mesh key={curtainX} position={[curtainX, 0.35, 0.22]} castShadow>
          <boxGeometry args={[0.55, 1.35, 0.05]} />
          <meshStandardMaterial map={curtain} roughness={1} metalness={0} />
        </mesh>
      ))}
      <mesh position={[0, 0.9, 0.24]} castShadow>
        <boxGeometry args={[2.3, 0.3, 0.05]} />
        <meshStandardMaterial map={valance} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
};

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

export const OvalRug = () => (
  <group>
    <mesh scale={[2.7, 1, 2.5]} receiveShadow>
      <cylinderGeometry args={[1, 1, 0.03, 48]} />
      <Matte color="#F2D9A0" />
    </mesh>
    <mesh
      scale={[2.35, 2.15, 1]}
      position={[0, 0.03, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[1, 0.012, 4, 64]} />
      <meshBasicMaterial color="#FFFBF3" />
    </mesh>
    <mesh scale={[1.5, 1, 1.35]} position={[0, 0.02, 0]} receiveShadow>
      <cylinderGeometry args={[1, 1, 0.02, 48]} />
      <Matte color="#EDC9C2" />
    </mesh>
  </group>
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
