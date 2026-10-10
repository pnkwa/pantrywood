import type { ColorRepresentation } from "three";

/** Matte only: no shine, no metal (DESIGN.md section 7). */
export function Matte({ color, transparent, opacity }: { color: ColorRepresentation; transparent?: boolean; opacity?: number }) {
  return <meshStandardMaterial color={color} roughness={1} metalness={0} transparent={transparent} opacity={opacity} />;
}
