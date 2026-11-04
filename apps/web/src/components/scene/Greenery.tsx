"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, FrontSide, Object3D, Shape, ShapeGeometry, SphereGeometry, type BufferGeometry, type InstancedMesh } from "three";
import { Matte } from "./materials";

// A leafy garland over the wall caps, toadstools and sunflowers: the room's life details.

// Bright clay greens and little white and blush blossoms, like a garland on a cozy diorama.
const LEAF_GREENS = ["#7CC35A", "#5FA845", "#9BD26F", "#6BB650"];
const BLOSSOM_COLORS = ["#FFFDF8", "#FFFDF8", "#F7D6DC"];
const LEAF_LENGTH = 0.3;
const LEAF_WIDTH = 0.24;
const PETAL_RADIUS = 0.05;

/** Same leaves on every render, so the garland never reshuffles. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/** A round, puffy leaf with a soft point: stem end at the origin, tip up +y, domed like clay. */
const leafGeometry = () => {
  const half = LEAF_WIDTH / 2;
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(half * 1.4, LEAF_LENGTH * 0.1, half * 1.2, LEAF_LENGTH * 0.85, 0, LEAF_LENGTH);
  shape.bezierCurveTo(-half * 1.2, LEAF_LENGTH * 0.85, -half * 1.4, LEAF_LENGTH * 0.1, 0, 0);
  const geometry = new ShapeGeometry(shape, 10);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const across = positions.getX(index) / half;
    const along = positions.getY(index) / LEAF_LENGTH;
    positions.setZ(index, (1 - across * across) * Math.sin(along * Math.PI) * 0.06);
  }
  geometry.computeVertexNormals();
  return geometry;
};

/** A span of a wall cap the garland covers (in the wall's own x), and how many short sprigs hang off its front. */
export type Garland = { from: number; to: number; drapes: number };

type Piece = { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number]; color: string };

const pick = <T,>(random: () => number, options: readonly T[], fallback: T) => options[Math.floor(random() * options.length)] ?? fallback;

/** Leaves heaped along the cap and spilling over its front edge, blossoms tucked in, and a few short sprigs hanging. */
const garlandPieces = (garlands: readonly Garland[], capTop: number, capFront: number, seed: number) => {
  const random = seeded(seed);
  const leaves: Piece[] = [];
  const blossoms: Piece[] = [];
  const leaf = (position: [number, number, number], facingUp: boolean) => {
    const size = 0.85 + random() * 0.5;
    leaves.push({
      position,
      rotation: facingUp ? [-Math.PI / 2 + (random() - 0.5) * 1.2, (random() - 0.5) * 0.6, random() * Math.PI * 2] : [(random() - 0.5) * 0.8, (random() - 0.5) * 1.2, random() * Math.PI * 2],
      scale: [size, size, size],
      color: pick(random, LEAF_GREENS, "#7CC35A"),
    });
  };
  for (const garland of garlands) {
    const span = Math.abs(garland.to - garland.from);
    const at = (fraction: number) => garland.from + (garland.to - garland.from) * fraction;
    // Thickest at the corner end, thinning out along the cap.
    for (let index = 0; index < span * 34; index++) {
      const fraction = Math.pow(random(), 1.4);
      const heap = (1 - fraction) * 0.25 + 0.05;
      leaf([at(fraction), capTop + random() * heap, capFront + 0.08 - random() * 0.8], random() > 0.35);
    }
    // Over the front edge.
    for (let index = 0; index < span * 14; index++) {
      leaf([at(Math.pow(random(), 1.4)), capTop - random() * 0.35, capFront + 0.06 + random() * 0.06], false);
    }
    for (let drape = 0; drape < garland.drapes; drape++) {
      const x = at(0.15 + random() * 0.8);
      const length = 0.45 + random() * 0.5;
      for (let step = 0; step < length / 0.1; step++) leaf([x + (random() - 0.5) * 0.14, capTop - 0.25 - step * 0.1, capFront + 0.08 + random() * 0.05], false);
    }
    for (let index = 0; index < span * 4; index++) {
      const fraction = Math.pow(random(), 1.3);
      const center: [number, number, number] = [at(fraction), capTop + 0.08 + random() * 0.25 * (1 - fraction), capFront + 0.1 - random() * 0.6];
      const color = pick(random, BLOSSOM_COLORS, "#FFFDF8");
      for (let petal = 0; petal < 5; petal++) {
        const angle = (petal / 5) * Math.PI * 2;
        blossoms.push({
          position: [center[0] + Math.cos(angle) * 0.055, center[1] + 0.03, center[2] + Math.sin(angle) * 0.055],
          rotation: [0, -angle, 0],
          scale: [1, 0.45, 0.8],
          color,
        });
      }
      blossoms.push({ position: [center[0], center[1] + 0.05, center[2]], rotation: [0, 0, 0], scale: [0.6, 0.5, 0.6], color: "#F4C542" });
    }
  }
  return { leaves, blossoms };
};

/** One batch of the same shape in many spots: one draw call however many there are. */
const Batch = ({ geometry, pieces, doubleSided = false }: { geometry: BufferGeometry; pieces: readonly Piece[]; doubleSided?: boolean }) => {
  const mesh = useRef<InstancedMesh>(null);
  // Instance matrices and colours have to be written to the mesh after it exists.
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const placer = new Object3D();
    const color = new Color();
    pieces.forEach((piece, index) => {
      placer.position.set(...piece.position);
      placer.rotation.set(...piece.rotation);
      placer.scale.set(...piece.scale);
      placer.updateMatrix();
      target.setMatrixAt(index, placer.matrix);
      target.setColorAt(index, color.set(piece.color));
    });
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
  }, [pieces]);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, pieces.length]} castShadow>
      <meshStandardMaterial roughness={1} metalness={0} side={doubleSided ? DoubleSide : FrontSide} />
    </instancedMesh>
  );
};

/** A leafy garland with blossoms along one wall cap, drawn in that wall's own space (cap along x, front facing +z). */
export const LeafGarland = ({ garlands, capTop, capFront, seed }: { garlands: readonly Garland[]; capTop: number; capFront: number; seed: number }) => {
  const { leaves, blossoms } = useMemo(() => garlandPieces(garlands, capTop, capFront, seed), [garlands, capTop, capFront, seed]);
  const leafShape = useMemo(() => leafGeometry(), []);
  const petalShape = useMemo(() => new SphereGeometry(PETAL_RADIUS, 8, 6), []);
  useEffect(
    () => () => {
      leafShape.dispose();
      petalShape.dispose();
    },
    [leafShape, petalShape],
  );
  return (
    <group>
      <Batch geometry={leafShape} pieces={leaves} doubleSided />
      <Batch geometry={petalShape} pieces={blossoms} />
    </group>
  );
};

const DOTS: [number, number, number][] = [
  [0.1, 0.18, 0.12],
  [-0.12, 0.2, 0.06],
  [0.02, 0.24, -0.12],
];

const Toadstool = ({ position, size }: { position: [number, number, number]; size: number }) => (
  <group position={position} scale={size}>
    <mesh position={[0, 0.12, 0]} castShadow>
      <cylinderGeometry args={[0.07, 0.09, 0.24, 12]} />
      <Matte color="#FFF6EA" />
    </mesh>
    <mesh position={[0, 0.22, 0]} castShadow>
      <sphereGeometry args={[0.22, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <Matte color="#E0574A" />
    </mesh>
    {DOTS.map((dot) => (
      <mesh key={dot.join()} position={dot} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <Matte color="#FFFDF8" />
      </mesh>
    ))}
  </group>
);

/** Three red toadstools of different sizes, sitting on a wall cap. */
export const Toadstools = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <Toadstool position={[0, 0, 0]} size={1.4} />
    <Toadstool position={[0.32, 0, 0.12]} size={0.9} />
    <Toadstool position={[-0.28, 0, 0.16]} size={0.7} />
  </group>
);

/** A little pot of sunflowers, for sills and shelves. */
export const Sunflowers = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh position={[0, 0.1, 0]} castShadow>
      <cylinderGeometry args={[0.1, 0.08, 0.2, 14]} />
      <Matte color="#C9935F" />
    </mesh>
    {[
      [-0.06, 0.42, 0.02, 0.2],
      [0.07, 0.34, 0.04, -0.25],
    ].map(([x = 0, y = 0, z = 0, tilt = 0]) => (
      <group key={x} position={[x, y, z]} rotation={[0.2, 0, tilt]}>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.24, 6]} />
          <Matte color="#6F9168" />
        </mesh>
        {Array.from({ length: 8 }, (_, petal) => (
          <group key={petal} rotation={[0, 0, (petal / 8) * Math.PI * 2]} position={[0, 0, 0.01]}>
            <mesh position={[0, 0.06, 0]} scale={[0.5, 1, 0.3]}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <Matte color="#F4C542" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0, 0.02]} scale={[1, 1, 0.5]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <Matte color="#7E5636" />
        </mesh>
      </group>
    ))}
  </group>
);
