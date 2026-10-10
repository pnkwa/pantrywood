"use client";

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { Matte } from "./materials";
import { ginghamTexture } from "./textures";

const IN_FRONT_OF_RIGHT_WALL = -5 + 0.02;

const GinghamWindow = () => {
  const curtain = useMemo(() => ginghamTexture(3, 6), []);
  const valance = useMemo(() => ginghamTexture(12, 2), []);

  return (
    <group position={[2.5, 3.6, IN_FRONT_OF_RIGHT_WALL]}>
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
      <mesh position={[0, 1.05, 0.2]}>
        <cylinderGeometry args={[0.03, 0.03, 2.4, 8]} />
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

const WallClock = () => (
  <group
    position={[4.3, 4.3, IN_FRONT_OF_RIGHT_WALL]}
    rotation={[Math.PI / 2, 0, 0]}
  >
    <mesh position={[0, 0.06, 0]} castShadow>
      <cylinderGeometry args={[0.44, 0.44, 0.12, 32]} />
      <Matte color="#D9604A" />
    </mesh>
    <mesh position={[0, 0.125, 0]}>
      <cylinderGeometry args={[0.36, 0.36, 0.01, 32]} />
      <Matte color="#FFFBF3" />
    </mesh>
    <mesh position={[0, 0.135, 0.12]}>
      <boxGeometry args={[0.04, 0.01, 0.24]} />
      <Matte color="#4A3B2E" />
    </mesh>
    <mesh position={[0.1, 0.135, 0]}>
      <boxGeometry args={[0.2, 0.01, 0.04]} />
      <Matte color="#4A3B2E" />
    </mesh>
  </group>
);

const PICTURE_FRAMES = [
  { x: -0.75, y: 5.22, width: 0.6, height: 0.55, artColor: "#8FA67A" },
  { x: 0.02, y: 5.27, width: 0.45, height: 0.45, artColor: "#C8755A" },
];

const PictureFrames = () => (
  <group position={[0, 0, IN_FRONT_OF_RIGHT_WALL]}>
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

const SleepingCat = () => (
  <group position={[-0.6, 0.03, 0.7]} rotation={[0, 0.6, 0]}>
    <mesh position={[0, 0.2, 0]} scale={[0.5, 0.26, 0.38]} castShadow>
      <sphereGeometry args={[1, 24, 16]} />
      <Matte color="#4A3B2E" />
    </mesh>
    <mesh position={[0.4, 0.24, 0.12]} castShadow>
      <sphereGeometry args={[0.2, 20, 16]} />
      <Matte color="#4A3B2E" />
    </mesh>
    {[-0.08, 0.1].map((earOffset) => (
      <mesh
        key={earOffset}
        position={[0.45, 0.43, 0.12 + earOffset]}
        rotation={[earOffset * 2, 0, -0.2]}
        castShadow
      >
        <coneGeometry args={[0.06, 0.12, 4]} />
        <Matte color="#4A3B2E" />
      </mesh>
    ))}
    <mesh position={[-0.1, 0.06, 0.36]} rotation={[Math.PI / 2, 0, 0.3]}>
      <torusGeometry args={[0.32, 0.05, 8, 24, Math.PI]} />
      <Matte color="#4A3B2E" />
    </mesh>
  </group>
);

const RugWithCat = () => (
  <group position={[-0.4, 0.01, 1.6]}>
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
    <SleepingCat />
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

const VeggieBasket = () => (
  <group position={[1.6, 0, 3.2]} rotation={[0, -0.4, 0]}>
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

export const Decor = () => (
  <group>
    <GinghamWindow />
    <WallClock />
    <PictureFrames />
    <RugWithCat />
    <VeggieBasket />
  </group>
);
