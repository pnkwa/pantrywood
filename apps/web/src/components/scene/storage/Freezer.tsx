"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";

export const Freezer = () => (
  <group>
    <RoundedBox
      args={[2.4, 1.75, 1.4]}
      radius={0.2}
      smoothness={4}
      position={[0, 0.875, 0]}
      castShadow
      receiveShadow
    >
      <Matte color="#C9DCE0" />
    </RoundedBox>
    <RoundedBox
      args={[2.46, 0.16, 1.46]}
      radius={0.07}
      smoothness={3}
      position={[0, 1.82, 0]}
      castShadow
      receiveShadow
    >
      <Matte color="#E1ECEE" />
    </RoundedBox>
    <RoundedBox
      args={[0.6, 0.12, 0.1]}
      radius={0.05}
      smoothness={3}
      position={[0, 1.55, 0.72]}
      castShadow
    >
      <Matte color="#5E7F86" />
    </RoundedBox>
    <mesh position={[-0.98, 0.85, 0.701]}>
      <planeGeometry args={[0.1, 1.1]} />
      <meshBasicMaterial color="#FFFFFF" transparent opacity={0.35} />
    </mesh>
  </group>
);
