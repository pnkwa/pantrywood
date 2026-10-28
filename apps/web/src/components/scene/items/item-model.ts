import type { ItemShape, SceneItem } from "../types";
import { ITEM_SIZES } from "./sizes";

export type ItemModel = Pick<SceneItem, "shape" | "color" | "accent" | "copies">;

const PREFIX = "item:";

const isItemShape = (value: string): value is ItemShape => Object.hasOwn(ITEM_SIZES, value);

/** The thumbnail id of an item's model: one picture per shape, colors and copies. */
export const itemModelId = ({ shape, color, accent, copies }: ItemModel) =>
  `${PREFIX}${shape}:${color}:${accent}:${copies}`;

/** The model a thumbnail id stands for, or null for a catalog id. */
export const itemModelFrom = (id: string): ItemModel | null => {
  if (!id.startsWith(PREFIX)) return null;
  const [shape = "", color = "", accent = "", copies = ""] = id.slice(PREFIX.length).split(":");
  return isItemShape(shape) ? { shape, color, accent, copies: Number(copies) || 1 } : null;
};
