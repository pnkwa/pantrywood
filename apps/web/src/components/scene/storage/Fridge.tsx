"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";

/** Rounded retro fridge with notes and magnets. Closed: its items show in the inside view. */
export function Fridge() {
  const front = 0.9;
  return (
    <group>
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.05, 0.5]}>
          <boxGeometry args={[0.3, 0.1, 0.3]} />
          <Matte color="#7A6654" />
        </mesh>
      ))}
      <RoundedBox args={[2.2, 4.5, 1.8]} radius={0.38} smoothness={5} position={[0, 2.35, 0]} castShadow receiveShadow>
        <Matte color="#F3EADB" />
      </RoundedBox>
      {/* Sheen strip, door split and latte handles */}
      <mesh position={[-0.92, 2.3, front + 0.001]}>
        <planeGeometry args={[0.12, 3.6]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 3.28, front + 0.002]}>
        <planeGeometry args={[2.0, 0.05]} />
        <Matte color="#D9CCB0" />
      </mesh>
      <RoundedBox args={[0.14, 0.7, 0.12]} radius={0.06} smoothness={3} position={[0.85, 3.85, front + 0.05]} castShadow>
        <Matte color="#C9B79A" />
      </RoundedBox>
      <RoundedBox args={[0.14, 1.1, 0.12]} radius={0.06} smoothness={3} position={[0.85, 2.35, front + 0.05]} castShadow>
        <Matte color="#C9B79A" />
      </RoundedBox>
      {/* A note held by a magnet, a heart magnet and two dot magnets */}
      <group position={[-0.3, 2.55, front + 0.01]} rotation={[0, 0, 0.1]}>
        <mesh>
          <planeGeometry args={[0.6, 0.7]} />
          <Matte color="#FFFBF3" />
        </mesh>
        {[0.15, 0, -0.15].map((y, i) => (
          <mesh key={y} position={[-0.04 + i * 0.02, y, 0.002]}>
            <planeGeometry args={[0.38 - i * 0.06, 0.03]} />
            <Matte color="#D9C9AE" />
          </mesh>
        ))}
        <mesh position={[0, 0.33, 0.03]}>
          <sphereGeometry args={[0.07, 12, 8]} />
          <Matte color="#C8755A" />
        </mesh>
      </group>
      <mesh position={[0.25, 1.4, front + 0.03]}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <Matte color="#C8755A" />
      </mesh>
      <mesh position={[-0.6, 4.0, front + 0.03]}>
        <sphereGeometry args={[0.09, 12, 8]} />
        <Matte color="#A9C9DA" />
      </mesh>
      <mesh position={[0.2, 3.65, front + 0.03]}>
        <sphereGeometry args={[0.08, 12, 8]} />
        <Matte color="#E2B25C" />
      </mesh>
    </group>
  );
}
