"use client";

import { RoundedBox } from "@react-three/drei";
import type { ColorRepresentation } from "three";
import { Matte } from "./materials";

// The miniature-dollhouse art kit (docs/concept.png and the reference sets): every part has soft
// rounded edges, wood is light oak, paint is pastel, and knobs and handles are small brass pieces.

export const KIT = {
  oak: "#D9B98C",
  oakDeep: "#B88E62",
  cream: "#F6EEDF",
  ceramic: "#FBF7EF",
  butter: "#F1D88E",
  mint: "#BFD9C4",
  blush: "#EFC2B8",
  brass: "#C9A15A",
  shadowWood: "#8A6A4C",
} as const;

type Vec3 = [x: number, y: number, z: number];

type SoftProps = {
  size: Vec3;
  position?: Vec3;
  rotation?: Vec3;
  color: ColorRepresentation;
  /** Defaults to a fifth of the thinnest side, capped, so thin boards and big bodies both look soft. */
  radius?: number;
  shadows?: boolean;
};

/** A soft-edged block, the base of every piece. */
export const Soft = ({ size, position, rotation, color, radius, shadows = true }: SoftProps) => (
  <RoundedBox
    args={size}
    radius={radius ?? Math.min(0.09, Math.min(...size) / 5)}
    smoothness={4}
    position={position}
    rotation={rotation}
    castShadow={shadows}
    receiveShadow={shadows}
  >
    <Matte color={color} />
  </RoundedBox>
);

/** The only part with a little sheen. Mostly non-metal: the room has no environment map, so real metal would render dark. */
export const Brass = () => <meshStandardMaterial color={KIT.brass} roughness={0.4} metalness={0.15} emissive={KIT.brass} emissiveIntensity={0.12} />;

/** A round brass knob on a short neck, pointing out of the surface along +z. */
export const Knob = ({ position, size = 0.07 }: { position: Vec3; size?: number }) => (
  <group position={position}>
    <mesh position={[0, 0, size * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[size * 0.35, size * 0.45, size, 10]} />
      <Brass />
    </mesh>
    <mesh position={[0, 0, size * 1.2]} castShadow>
      <sphereGeometry args={[size, 16, 12]} />
      <Brass />
    </mesh>
  </group>
);

/** A brass bar handle on two posts; vertical unless `horizontal`. */
export const BarHandle = ({ position, length, horizontal = false }: { position: Vec3; length: number; horizontal?: boolean }) => {
  const rodRotation: Vec3 = horizontal ? [0, 0, Math.PI / 2] : [0, 0, 0];
  const postOffset = length / 2 - 0.04;
  const posts: Vec3[] = horizontal
    ? [
        [-postOffset, 0, 0.04],
        [postOffset, 0, 0.04],
      ]
    : [
        [0, -postOffset, 0.04],
        [0, postOffset, 0.04],
      ];
  return (
    <group position={position}>
      <mesh position={[0, 0, 0.09]} rotation={rodRotation} castShadow>
        <capsuleGeometry args={[0.035, length - 0.07, 4, 10]} />
        <Brass />
      </mesh>
      {posts.map((post) => (
        <mesh key={post.join()} position={post} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.09, 8]} />
          <Brass />
        </mesh>
      ))}
    </group>
  );
};

/** A paneled cabinet door: painted slab, a raised inset panel and a brass knob. */
export const PanelDoor = ({
  position,
  width,
  height,
  color,
  inset,
  knobAt,
}: {
  position: Vec3;
  width: number;
  height: number;
  color: ColorRepresentation;
  inset: ColorRepresentation;
  /** Knob position on the door face, from its center. */
  knobAt: [x: number, y: number];
}) => (
  <group position={position}>
    <Soft size={[width, height, 0.08]} color={color} radius={0.035} />
    <Soft size={[width - 0.2, height - 0.2, 0.05]} position={[0, 0, 0.03]} color={inset} radius={0.03} shadows={false} />
    <Knob position={[knobAt[0], knobAt[1], 0.05]} size={0.055} />
  </group>
);

/** Small turned wooden feet under the four corners of a piece. */
export const Feet = ({ halfWidth, halfDepth, height = 0.12, color = KIT.oakDeep }: { halfWidth: number; halfDepth: number; height?: number; color?: ColorRepresentation }) => (
  <>
    {[-1, 1].flatMap((signX) =>
      [-1, 1].map((signZ) => (
        <mesh key={`${signX}${signZ}`} position={[signX * halfWidth, height / 2, signZ * halfDepth]} castShadow>
          <cylinderGeometry args={[0.07, 0.05, height, 12]} />
          <Matte color={color} />
        </mesh>
      )),
    )}
  </>
);

/** A thin front lip along a shelf board, like the rail on an open dresser shelf. */
export const ShelfLip = ({ y, width, frontZ, color }: { y: number; width: number; frontZ: number; color: ColorRepresentation }) => (
  <Soft size={[width, 0.14, 0.05]} position={[0, y + 0.05, frontZ - 0.025]} color={color} radius={0.02} />
);
