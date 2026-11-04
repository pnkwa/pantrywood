"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide, PlaneGeometry, Vector2 } from "three";
import { Matte } from "../materials";
import { KIT } from "../kit";

const TOP_RADIUS = 0.9;
const TOP_Y = 1.25;
/** Each chair's middle, either side of the table, facing it. */
const CHAIR_X = 1.45;
const CHAIR_SEAT_Y = 0.75;
const CLOTH_SIZE = 2.7;
const CLOTH_SEGMENTS = 48;
const CLOTH = KIT.cream;
/** How thick the cloth reads: its outer face stands this far off the inner one. */
const CLOTH_THICKNESS = 0.035;

/** A plain oak bentwood chair: a round seat on four splayed legs and a curved hoop back with spindles. Faces +z. */
const BentwoodChair = () => (
  <group>
    {[
      [-0.22, -0.22],
      [0.22, -0.22],
      [-0.22, 0.22],
      [0.22, 0.22],
    ].map(([x = 0, z = 0]) => (
      <mesh key={`${x}${z}`} position={[x, CHAIR_SEAT_Y / 2, z]} rotation={[z * 0.25, 0, -x * 0.25]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, CHAIR_SEAT_Y, 8]} />
        <Matte color={KIT.oak} />
      </mesh>
    ))}
    <mesh position={[0, CHAIR_SEAT_Y + 0.02, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.34, 0.32, 0.1, 24]} />
      <Matte color={KIT.oak} />
    </mesh>
    <mesh position={[0, CHAIR_SEAT_Y + 0.42, -0.28]} castShadow>
      <torusGeometry args={[0.28, 0.035, 8, 24, Math.PI]} />
      <Matte color={KIT.oak} />
    </mesh>
    {[-0.28, 0.28].map((x) => (
      <mesh key={x} position={[x, CHAIR_SEAT_Y + 0.21, -0.28]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.42, 8]} />
        <Matte color={KIT.oak} />
      </mesh>
    ))}
    {[-0.12, 0, 0.12].map((x) => (
      <mesh key={x} position={[x, CHAIR_SEAT_Y + 0.3, -0.28]}>
        <cylinderGeometry args={[0.018, 0.018, 0.5, 6]} />
        <Matte color={KIT.oak} />
      </mesh>
    ))}
  </group>
);

/**
 * A square cream cloth thrown over the round top: flat over the table, then falling away past its edge in soft waves,
 * longest at the four corners, like a tablecloth on a little round table.
 */
const clothGeometry = () => {
  const geometry = new PlaneGeometry(CLOTH_SIZE, CLOTH_SIZE, CLOTH_SEGMENTS, CLOTH_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const reach = Math.hypot(x, z);
    if (reach <= TOP_RADIUS) {
      positions.setY(index, 0);
      continue;
    }
    const past = reach - TOP_RADIUS;
    const angle = Math.atan2(z, x);
    // Hanging, the cloth tucks back in toward the table, rippling into folds as it falls.
    const hangReach = TOP_RADIUS + 0.04 + past * 0.12 + Math.sin(angle * 9) * 0.035 * Math.min(1, past * 3);
    positions.setX(index, (x / reach) * hangReach);
    positions.setZ(index, (z / reach) * hangReach);
    positions.setY(index, -past * 0.96);
  }
  geometry.computeVertexNormals();
  return geometry;
};

/** The same cloth pushed out along its normals: drawn over the first, it gives the fabric some thickness. */
const thickened = (inner: PlaneGeometry) => {
  const outer = inner.clone();
  const positions = outer.getAttribute("position");
  const normals = inner.getAttribute("normal");
  for (let index = 0; index < positions.count; index++) {
    positions.setXYZ(
      index,
      positions.getX(index) + normals.getX(index) * CLOTH_THICKNESS,
      positions.getY(index) + normals.getY(index) * CLOTH_THICKNESS,
      positions.getZ(index) + normals.getZ(index) * CLOTH_THICKNESS,
    );
  }
  outer.computeVertexNormals();
  return outer;
};

const Cloth = () => {
  const { inner, outer } = useMemo(() => {
    const innerLayer = clothGeometry();
    return { inner: innerLayer, outer: thickened(innerLayer) };
  }, []);
  useEffect(
    () => () => {
      inner.dispose();
      outer.dispose();
    },
    [inner, outer],
  );
  // Lifted clear of the oak top, so the table's edge never flickers through the cloth.
  return (
    <group position={[0, TOP_Y + 0.1, 0]}>
      <mesh geometry={inner} receiveShadow>
        <meshStandardMaterial color={CLOTH} roughness={1} metalness={0} side={DoubleSide} />
      </mesh>
      <mesh geometry={outer} castShadow receiveShadow>
        <meshStandardMaterial color={CLOTH} roughness={1} metalness={0} side={DoubleSide} />
      </mesh>
    </group>
  );
};

const CUP_SKY = "#9FCDE6";
const MILK = "#FBF8F2";

/** The cup's wall as one rounded lathe profile: out from the foot, up the rounded belly, over a thick rim and back down inside. */
const CUP_PROFILE = [
  [0, 0],
  [0.05, 0],
  [0.075, 0.02],
  [0.095, 0.06],
  [0.105, 0.11],
  [0.108, 0.15],
  [0.104, 0.17],
  [0.094, 0.175],
  [0.088, 0.16],
  [0.088, 0.1],
  [0.07, 0.05],
  [0, 0.04],
].map(([x = 0, y = 0]) => new Vector2(x, y));

/** A wide saucer: a low foot, a dished middle and a softly raised rim. */
const SAUCER_PROFILE = [
  [0, 0],
  [0.09, 0],
  [0.1, 0.012],
  [0.2, 0.022],
  [0.215, 0.034],
  [0.205, 0.04],
  [0.1, 0.028],
  [0, 0.026],
].map(([x = 0, y = 0]) => new Vector2(x, y));

/** A chunky sky-blue cup of milk with a round handle, on its saucer, like a ceramic toy. */
const Cup = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh castShadow receiveShadow>
      <latheGeometry args={[SAUCER_PROFILE, 32]} />
      <Matte color={CUP_SKY} />
    </mesh>
    <group position={[0, 0.026, 0]}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[CUP_PROFILE, 32]} />
        <meshStandardMaterial color={CUP_SKY} roughness={0.9} metalness={0} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.089, 24]} />
        <Matte color={MILK} />
      </mesh>
      <mesh position={[0.118, 0.1, 0]} castShadow>
        <torusGeometry args={[0.04, 0.016, 10, 18]} />
        <Matte color={CUP_SKY} />
      </mesh>
    </group>
  </group>
);

/**
 * A dining set: a round oak table under a thick white tablecloth with one sky-blue cup of milk on it, and a plain oak bentwood
 * chair either side. It's a storage spot in Grocy, but like the counter its stock isn't drawn: open it to see it.
 */
export const TableSet = () => (
  <group>
    <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
      <cylinderGeometry args={[0.45, 0.52, 0.1, 28]} />
      <Matte color={KIT.oakDeep} />
    </mesh>
    <mesh position={[0, TOP_Y / 2, 0]} castShadow>
      <cylinderGeometry args={[0.1, 0.16, TOP_Y - 0.1, 16]} />
      <Matte color={KIT.oak} />
    </mesh>
    <mesh position={[0, TOP_Y + 0.02, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[TOP_RADIUS, TOP_RADIUS, 0.1, 48]} />
      <Matte color={KIT.oak} />
    </mesh>
    <Cloth />
    {/* Just one cup on the cloth: a little moment, not a full table. */}
    <group position={[0.05, TOP_Y + 0.14, 0.1]} scale={1.6}>
      <Cup position={[0, 0, 0]} />
    </group>
    <group position={[-CHAIR_X, 0, -0.2]} rotation={[0, Math.PI / 2 - 0.15, 0]}>
      <BentwoodChair />
    </group>
    <group position={[CHAIR_X, 0, 0.2]} rotation={[0, -Math.PI / 2 - 0.15, 0]}>
      <BentwoodChair />
    </group>
  </group>
);
