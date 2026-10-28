"use client";

import { Outlines } from "@react-three/drei";
import type { ItemModel } from "./item-model";
import { SHAPES } from "./shapes";
import { copyOffsets } from "./sizes";

// In the model's own units: screen-space outlines break under the orthographic cameras these scenes use.
const OUTLINE_THICKNESS = 0.03;

/**
 * An item's copies side by side, as they stand on a shelf in the room: plain meshes, so each can be picked.
 * `outlined` draws a white edge around it (the selected item).
 */
export const ItemModelMeshes = ({ model, outlined = false }: { model: ItemModel; outlined?: boolean }) =>
  copyOffsets(model.shape, model.copies).map((x, copy) => (
    <group key={copy} position={[x, 0, 0]}>
      {SHAPES[model.shape].parts.map((part, index) => (
        <mesh key={index} geometry={part.geometry()} position={part.offset} castShadow>
          <meshStandardMaterial
            color={part.color === "body" ? model.color : part.color === "accent" ? model.accent : part.color}
            roughness={1}
            metalness={0}
          />
          {outlined && <Outlines thickness={OUTLINE_THICKNESS} color="#FFFFFF" />}
        </mesh>
      ))}
    </group>
  ));
