import type { ColorRepresentation } from "three";

type MatteProps = {
  color: ColorRepresentation;
  transparent?: boolean;
  opacity?: number;
};

export const Matte = ({ color, transparent, opacity }: MatteProps) => (
  <meshStandardMaterial
    color={color}
    roughness={1}
    metalness={0}
    transparent={transparent}
    opacity={opacity}
  />
);
