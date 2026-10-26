"use client";

import { useEffect } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { GinghamWindow, OvalRug, Pegboard, PictureFrames, VeggieBasket } from "./Decor";
import { ToyCat } from "./ToyCat";
import { CLICK_DRAG_TOLERANCE, type Highlight } from "./interaction";
import { Matte } from "./materials";
import type { SceneOverlay } from "./overlay";
import { StorageOutline } from "./StorageOutline";
import type { DecorShape, SceneDecor } from "./types";

const BARK = "#7A6654";
const CAT = "#D9B183";
const RUG_THICKNESS = 0.03;

/** width, height, depth, center height: the outline and click box of each shape. */
const boxFor = (shape: DecorShape, [width, depth]: [number, number]): [number, number, number, number] => {
  switch (shape) {
    case "rug":
    case "roundRug":
    case "stripedRug":
      return [width * 0.95, 0.06, depth * 0.95, 0.03];
    case "lantern":
      return [0.8, 1.9, 0.8, 0.95];
    case "mushroomLamp":
      return [0.85, 1.0, 0.85, 0.5];
    case "wallClock":
      return [0.9, 0.9, 0.2, 0];
    case "catBed":
      return [0.95, 0.5, 0.95, 0.25];
    case "ginghamWindow":
      return [2.4, 2.7, 0.4, 0];
    case "pictureFrames":
      return [1.5, 0.8, 0.2, 0];
    case "ovalRug":
      return [5.4, 0.06, 5, 0.03];
    case "cat":
    case "maskCat":
    case "plainCat":
      return [0.8, 0.9, 0.8, 0.42];
    case "veggieBasket":
      return [1, 0.8, 1, 0.35];
    case "pegboard":
      return [3.2, 2.4, 0.15, 0];
  }
};

const Shape = ({ decor, still }: { decor: SceneDecor; still: boolean }) => {
  const [main, second] = decor.colors;
  const [width, depth] = decor.size;
  switch (decor.shape) {
    case "rug":
      return (
        <group>
          <RoundedBox args={[width * 0.95, RUG_THICKNESS, depth * 0.95]} radius={0.012} smoothness={2} position={[0, RUG_THICKNESS / 2, 0]} receiveShadow>
            <Matte color={second} />
          </RoundedBox>
          <mesh position={[0, RUG_THICKNESS + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[width * 0.8, depth * 0.8]} />
            <Matte color={main} />
          </mesh>
        </group>
      );
    case "roundRug": {
      const radius = (Math.min(width, depth) / 2) * 0.95;
      return (
        <group>
          <mesh position={[0, RUG_THICKNESS / 2, 0]} receiveShadow>
            <cylinderGeometry args={[radius, radius, RUG_THICKNESS, 40]} />
            <Matte color={main} />
          </mesh>
          {[0.72, 0.42].map((ring) => (
            <mesh key={ring} position={[0, RUG_THICKNESS + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius * ring - 0.04, radius * ring, 40]} />
              <Matte color={second} />
            </mesh>
          ))}
        </group>
      );
    }
    case "stripedRug":
      return (
        <group>
          <RoundedBox args={[width * 0.95, RUG_THICKNESS, depth * 0.95]} radius={0.012} smoothness={2} position={[0, RUG_THICKNESS / 2, 0]} receiveShadow>
            <Matte color={main} />
          </RoundedBox>
          {[-0.3, 0, 0.3].map((offset) => (
            <mesh key={offset} position={[0, RUG_THICKNESS + 0.002, offset * depth]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[width * 0.95, depth * 0.1]} />
              <Matte color={second} />
            </mesh>
          ))}
        </group>
      );
    case "lantern":
      return (
        <group>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 1.4, 8]} />
            <Matte color={second} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.25, 0.28, 0.06, 20]} />
            <Matte color={second} />
          </mesh>
          <mesh position={[0, 1.55, 0]} scale={[1, 0.85, 1]} castShadow>
            <sphereGeometry args={[0.36, 24, 16]} />
            <meshStandardMaterial color={main} emissive={main} emissiveIntensity={0.35} roughness={1} />
          </mesh>
        </group>
      );
    case "mushroomLamp":
      return (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.14, 0.6, 16]} />
            <Matte color={second} />
          </mesh>
          <mesh position={[0, 0.58, 0]} castShadow>
            <sphereGeometry args={[0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={main} emissive={main} emissiveIntensity={0.2} roughness={1} />
          </mesh>
          {[0, 2.1, 4.2].map((angle) => (
            <mesh key={angle} position={[Math.cos(angle) * 0.22, 0.86, Math.sin(angle) * 0.22]}>
              <sphereGeometry args={[0.06, 10, 8]} />
              <Matte color={second} />
            </mesh>
          ))}
        </group>
      );
    case "wallClock":
      return (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.08, 32]} />
            <Matte color={main} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.01, 32]} />
            <Matte color={second} />
          </mesh>
          <mesh position={[0, 0.055, -0.1]}>
            <boxGeometry args={[0.03, 0.01, 0.22]} />
            <Matte color={BARK} />
          </mesh>
          <mesh position={[0.08, 0.055, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.025, 0.01, 0.16]} />
            <Matte color={BARK} />
          </mesh>
        </group>
      );
    case "catBed":
      return (
        <group>
          <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <torusGeometry args={[0.34, 0.13, 12, 28]} />
            <Matte color={main} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.36, 0.36, 0.08, 28]} />
            <Matte color={second} />
          </mesh>
          <mesh position={[0, 0.22, 0]} scale={[1.2, 0.6, 0.9]} castShadow>
            <sphereGeometry args={[0.2, 16, 12]} />
            <Matte color={CAT} />
          </mesh>
          <mesh position={[0.2, 0.24, 0.05]} castShadow>
            <sphereGeometry args={[0.11, 14, 10]} />
            <Matte color={CAT} />
          </mesh>
        </group>
      );
    case "ginghamWindow":
      return <GinghamWindow />;
    case "pictureFrames":
      return <PictureFrames />;
    case "ovalRug":
      return <OvalRug />;
    case "cat":
      return <ToyCat pattern="patch" colors={decor.colors} still={still} />;
    case "maskCat":
      return <ToyCat pattern="mask" colors={decor.colors} still={still} />;
    case "plainCat":
      return <ToyCat pattern="plain" colors={decor.colors} still={still} />;
    case "veggieBasket":
      return <VeggieBasket />;
    case "pegboard":
      return decor.board ? <Pegboard board={decor.board} /> : null;
  }
};

type DecorPiecesProps = {
  decor: readonly SceneDecor[];
  overlay: SceneOverlay;
  /** Only clickable while decorating; otherwise decor is just scenery. */
  editing: boolean;
  /** Animated pieces hold still, e.g. while the fridge door view covers the room. */
  still: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onPointerDown: (key: string) => void;
  /** Tapping the pegboard outside Decorate mode opens the board view. */
  onOpenBoard: () => void;
};

export const DecorPieces = ({ decor, overlay, editing, still, selectedKey, onSelect, onPointerDown, onOpenBoard }: DecorPiecesProps) => {
  // On-demand rendering: placing, moving or putting away a piece must redraw the room.
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => invalidate(), [decor, invalidate]);
  return (
  <group>
    {decor.map((piece) => {
      const box = boxFor(piece.shape, piece.size);
      const highlight: Highlight = editing && piece.id === selectedKey ? "editing" : "none";
      const handleClick = (event: ThreeEvent<MouseEvent>) => {
        if (event.delta > CLICK_DRAG_TOLERANCE) return;
        if (!editing && piece.board) {
          event.stopPropagation();
          onOpenBoard();
          return;
        }
        if (!editing) return;
        event.stopPropagation();
        onSelect(piece.id);
      };
      return (
        <group key={piece.id} position={piece.position} rotation={[0, piece.rotationY, 0]}
          onClick={handleClick}
          onPointerDown={(event) => {
            event.stopPropagation();
            onPointerDown(piece.id);
          }}
        >
          <mesh position={[0, box[3], 0]} visible={false}>
            <boxGeometry args={[box[0], box[1], box[2]]} />
          </mesh>
          <Shape decor={piece} still={still} />
          <StorageOutline outlineKey={piece.id} box={box} highlight={highlight} overlay={overlay} />
        </group>
      );
    })}
  </group>
);
};
