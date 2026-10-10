"use client";

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { Matte } from "./materials";
import { ginghamTexture } from "./textures";

/* Cosmetic life details, one per zone (DESIGN.md section 7). They never touch Grocy data. */

const BACK = -5 + 0.02; // just in front of the right wall

function GinghamWindow() {
  const curtain = useMemo(() => ginghamTexture(3, 6), []);
  const valance = useMemo(() => ginghamTexture(12, 2), []);

  return (
    <group position={[2.5, 3.6, BACK]}>
      <RoundedBox args={[1.8, 1.8, 0.1]} radius={0.04} smoothness={2} position={[0, 0, 0.05]}>
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
      {/* Mullions */}
      <mesh position={[0, 0, 0.13]}>
        <boxGeometry args={[0.06, 1.5, 0.03]} />
        <Matte color="#A47551" />
      </mesh>
      <mesh position={[0, 0, 0.13]}>
        <boxGeometry args={[1.5, 0.06, 0.03]} />
        <Matte color="#A47551" />
      </mesh>
      {/* Sill with a little pot */}
      <RoundedBox args={[2.1, 0.14, 0.34]} radius={0.04} smoothness={2} position={[0, -0.98, 0.17]} castShadow>
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
      {/* Rod, curtains and valance */}
      <mesh position={[0, 1.05, 0.2]}>
        <cylinderGeometry args={[0.03, 0.03, 2.4, 8]} />
        <Matte color="#6E4E33" />
      </mesh>
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.35, 0.22]} castShadow>
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
}

function WallClock() {
  return (
    <group position={[4.3, 4.3, BACK]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.44, 0.44, 0.12, 32]} />
        <Matte color="#D9604A" />
      </mesh>
      <mesh position={[0, 0.125, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.01, 32]} />
        <Matte color="#FFFBF3" />
      </mesh>
      {/* Hands: 3 o'clock-ish */}
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
}

function PictureFrames() {
  const frames = [
    { x: -0.75, y: 5.22, w: 0.6, h: 0.55, art: "#8FA67A" },
    { x: 0.02, y: 5.27, w: 0.45, h: 0.45, art: "#C8755A" },
  ];
  return (
    <group position={[0, 0, BACK]}>
      {frames.map((f) => (
        <group key={f.x} position={[f.x, f.y, 0]}>
          <RoundedBox args={[f.w, f.h, 0.06]} radius={0.02} smoothness={2} position={[0, 0, 0.03]}>
            <Matte color="#A47551" />
          </RoundedBox>
          <mesh position={[0, 0, 0.065]}>
            <planeGeometry args={[f.w - 0.12, f.h - 0.12]} />
            <Matte color="#FFFBF3" />
          </mesh>
          <mesh position={[0, -0.02, 0.07]}>
            <circleGeometry args={[f.w * 0.17, 20]} />
            <Matte color={f.art} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RugWithCat() {
  return (
    <group position={[-0.4, 0.01, 1.6]}>
      <mesh scale={[2.7, 1, 2.5]} receiveShadow>
        <cylinderGeometry args={[1, 1, 0.03, 48]} />
        <Matte color="#F2D9A0" />
      </mesh>
      <mesh scale={[2.35, 2.15, 1]} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.012, 4, 64]} />
        <meshBasicMaterial color="#FFFBF3" />
      </mesh>
      <mesh scale={[1.5, 1, 1.35]} position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[1, 1, 0.02, 48]} />
        <Matte color="#EDC9C2" />
      </mesh>
      {/* Sleeping cat, curled up */}
      <group position={[-0.6, 0.03, 0.7]} rotation={[0, 0.6, 0]}>
        <mesh position={[0, 0.2, 0]} scale={[0.5, 0.26, 0.38]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <Matte color="#4A3B2E" />
        </mesh>
        <mesh position={[0.4, 0.24, 0.12]} castShadow>
          <sphereGeometry args={[0.2, 20, 16]} />
          <Matte color="#4A3B2E" />
        </mesh>
        {[-0.08, 0.1].map((dz) => (
          <mesh key={dz} position={[0.45, 0.43, 0.12 + dz]} rotation={[dz * 2, 0, -0.2]} castShadow>
            <coneGeometry args={[0.06, 0.12, 4]} />
            <Matte color="#4A3B2E" />
          </mesh>
        ))}
        <mesh position={[-0.1, 0.06, 0.36]} rotation={[Math.PI / 2, 0, 0.3]}>
          <torusGeometry args={[0.32, 0.05, 8, 24, Math.PI]} />
          <Matte color="#4A3B2E" />
        </mesh>
      </group>
    </group>
  );
}

function VeggieBasket() {
  const veggies = [
    { p: [-0.15, 0.48, 0] as const, r: 0.15, c: "#C8755A" },
    { p: [0.14, 0.5, 0.05] as const, r: 0.15, c: "#E2B25C" },
    { p: [0, 0.46, -0.15] as const, r: 0.13, c: "#8FA67A" },
  ];
  return (
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
      {veggies.map((v) => (
        <mesh key={v.c} position={[...v.p]} castShadow>
          <sphereGeometry args={[v.r, 16, 12]} />
          <Matte color={v.c} />
        </mesh>
      ))}
    </group>
  );
}

export function Decor() {
  return (
    <group>
      <GinghamWindow />
      <WallClock />
      <PictureFrames />
      <RugWithCat />
      <VeggieBasket />
    </group>
  );
}
