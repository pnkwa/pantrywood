"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";

const WIDTH = 0.72;
const DEPTH = 0.5;
const HEIGHT = 0.34;
const WALL = 0.05;
const RIM = "#C98E55";
const HANDLE_HEIGHT = 0.36;

/** A square picnic basket for the top of the fridge, with a bottle and an apple: decoration only. */
export const FridgeBasket = ({ position, turn = 0 }: { position: [number, number, number]; turn?: number }) => {
  const walls: { size: [number, number, number]; at: [number, number, number] }[] = [
    { size: [WIDTH, HEIGHT, WALL], at: [0, HEIGHT / 2, DEPTH / 2 - WALL / 2] },
    { size: [WIDTH, HEIGHT, WALL], at: [0, HEIGHT / 2, -DEPTH / 2 + WALL / 2] },
    { size: [WALL, HEIGHT, DEPTH], at: [WIDTH / 2 - WALL / 2, HEIGHT / 2, 0] },
    { size: [WALL, HEIGHT, DEPTH], at: [-WIDTH / 2 + WALL / 2, HEIGHT / 2, 0] },
  ];
  return (
    <group position={position} rotation={[0, turn, 0]}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[WIDTH - 0.04, 0.04, DEPTH - 0.04]} />
        <Matte color="#9A6A3E" />
      </mesh>
      {walls.map(({ size, at }) => (
        <RoundedBox key={at.join()} args={size} position={at} radius={0.02} smoothness={3} castShadow receiveShadow>
          <Matte color="#B97F48" />
        </RoundedBox>
      ))}
      {/* The thick rounded rim. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <RoundedBox args={[WIDTH + 0.04, 0.06, 0.08]} position={[0, HEIGHT, (side * (DEPTH - 0.04)) / 2]} radius={0.028} smoothness={3} castShadow>
            <Matte color={RIM} />
          </RoundedBox>
          <RoundedBox args={[0.08, 0.06, DEPTH + 0.04]} position={[(side * (WIDTH - 0.04)) / 2, HEIGHT, 0]} radius={0.028} smoothness={3} castShadow>
            <Matte color={RIM} />
          </RoundedBox>
        </group>
      ))}
      {/* The handle: two posts and a bar, across the middle. */}
      {[-1, 1].map((side) => (
        <RoundedBox key={side} args={[0.06, HANDLE_HEIGHT, 0.05]} position={[(side * (WIDTH * 0.42)) / 2, HEIGHT + HANDLE_HEIGHT / 2, 0]} radius={0.022} smoothness={3} castShadow>
          <Matte color={RIM} />
        </RoundedBox>
      ))}
      <RoundedBox args={[WIDTH * 0.42 + 0.06, 0.06, 0.05]} position={[0, HEIGHT + HANDLE_HEIGHT, 0]} radius={0.022} smoothness={3} castShadow>
        <Matte color={RIM} />
      </RoundedBox>
      {/* A green bottle with a cork, and an apple at its foot, on the left. */}
      <group position={[-0.2, 0.04, -0.08]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.4, 16]} />
          <Matte color="#5E9A4E" />
        </mesh>
        <mesh position={[0, 0.46, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.06, 0.12, 12]} />
          <Matte color="#5E9A4E" />
        </mesh>
        <mesh position={[0, 0.54, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.05, 10]} />
          <Matte color="#9A6A3E" />
        </mesh>
      </group>
      <group position={[-0.17, HEIGHT - 0.02, 0.1]}>
        <mesh castShadow>
          <sphereGeometry args={[0.085, 16, 12]} />
          <Matte color="#9CC65A" />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.008, 0.01, 0.05, 6]} />
          <Matte color="#7A5232" />
        </mesh>
        <mesh position={[0.04, 0.1, 0]} rotation={[0, 0, -0.6]} scale={[1, 0.45, 0.3]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <Matte color="#6FA548" />
        </mesh>
      </group>
    </group>
  );
};
