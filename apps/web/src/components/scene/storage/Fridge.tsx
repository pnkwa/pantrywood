"use client";

import { RoundedBox } from "@react-three/drei";
import { Matte } from "../materials";

const DOOR_FRONT = 0.9;
const NOTE_LINE_HEIGHTS = [0.15, 0, -0.15];

export const Fridge = () => (
  <group>
    {[-0.8, 0.8].map((footX) => (
      <mesh key={footX} position={[footX, 0.05, 0.5]}>
        <boxGeometry args={[0.3, 0.1, 0.3]} />
        <Matte color="#7A6654" />
      </mesh>
    ))}
    <RoundedBox
      args={[2.2, 4.5, 1.8]}
      radius={0.38}
      smoothness={5}
      position={[0, 2.35, 0]}
      castShadow
      receiveShadow
    >
      <Matte color="#F3EADB" />
    </RoundedBox>
    <mesh position={[-0.92, 2.3, DOOR_FRONT + 0.001]}>
      <planeGeometry args={[0.12, 3.6]} />
      <meshBasicMaterial color="#FFFFFF" transparent opacity={0.45} />
    </mesh>
    <mesh position={[0, 3.28, DOOR_FRONT + 0.002]}>
      <planeGeometry args={[2.0, 0.05]} />
      <Matte color="#D9CCB0" />
    </mesh>
    <RoundedBox
      args={[0.14, 0.7, 0.12]}
      radius={0.06}
      smoothness={3}
      position={[0.85, 3.85, DOOR_FRONT + 0.05]}
      castShadow
    >
      <Matte color="#C9B79A" />
    </RoundedBox>
    <RoundedBox
      args={[0.14, 1.1, 0.12]}
      radius={0.06}
      smoothness={3}
      position={[0.85, 2.35, DOOR_FRONT + 0.05]}
      castShadow
    >
      <Matte color="#C9B79A" />
    </RoundedBox>
    <group position={[-0.3, 2.55, DOOR_FRONT + 0.01]} rotation={[0, 0, 0.1]}>
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
    <mesh position={[0.25, 1.4, DOOR_FRONT + 0.03]}>
      <sphereGeometry args={[0.1, 12, 8]} />
      <Matte color="#C8755A" />
    </mesh>
    <mesh position={[-0.6, 4.0, DOOR_FRONT + 0.03]}>
      <sphereGeometry args={[0.09, 12, 8]} />
      <Matte color="#A9C9DA" />
    </mesh>
    <mesh position={[0.2, 3.65, DOOR_FRONT + 0.03]}>
      <sphereGeometry args={[0.08, 12, 8]} />
      <Matte color="#E2B25C" />
    </mesh>
  </group>
);
