// Plain data, no three.js: the inside layout sizes shelf spots from these too.
import type { ItemShape } from "../types";

/** Each model's footprint along the shelf and its height, in scene units. */
export const ITEM_SIZES: Record<ItemShape, { width: number; height: number }> = {
  jar: { width: 0.3, height: 0.32 },
  can: { width: 0.26, height: 0.25 },
  carton: { width: 0.24, height: 0.42 },
  bag: { width: 0.32, height: 0.33 },
  box: { width: 0.32, height: 0.24 },
  roll: { width: 0.28, height: 0.24 },
  bottle: { width: 0.22, height: 0.42 },
  spool: { width: 0.38, height: 0.36 },
  egg: { width: 0.18, height: 0.24 },
  apple: { width: 0.28, height: 0.33 },
  orange: { width: 0.27, height: 0.25 },
  lime: { width: 0.2, height: 0.2 },
  tomato: { width: 0.27, height: 0.25 },
  potato: { width: 0.3, height: 0.2 },
  carrot: { width: 0.18, height: 0.36 },
  cucumber: { width: 0.16, height: 0.34 },
  banana: { width: 0.3, height: 0.32 },
  mushroom: { width: 0.27, height: 0.25 },
  greens: { width: 0.26, height: 0.36 },
  pepper: { width: 0.26, height: 0.3 },
  corn: { width: 0.2, height: 0.33 },
  meat: { width: 0.33, height: 0.09 },
  tofu: { width: 0.3, height: 0.13 },
  bread: { width: 0.3, height: 0.2 },
  sauceBottle: { width: 0.18, height: 0.44 },
  cup: { width: 0.26, height: 0.2 },
  noodles: { width: 0.26, height: 0.22 },
  eggTofu: { width: 0.3, height: 0.11 },
  butter: { width: 0.3, height: 0.11 },
  shrimp: { width: 0.28, height: 0.14 },
  dumplings: { width: 0.3, height: 0.11 },
  edamame: { width: 0.26, height: 0.08 },
  riceSack: { width: 0.3, height: 0.36 },
  toothpaste: { width: 0.3, height: 0.1 },
};

/** The space between copies of one item standing side by side. */
export const COPY_GAP = 0.03;

/** How wide `copies` of an item stand together, in scene units. */
export const groupWidth = (shape: ItemShape, copies: number) =>
  copies * ITEM_SIZES[shape].width + (copies - 1) * COPY_GAP;

/** Each copy's centre along x, the group centred on 0. */
export const copyOffsets = (shape: ItemShape, copies: number) => {
  const { width } = ITEM_SIZES[shape];
  const start = -groupWidth(shape, copies) / 2 + width / 2;
  return Array.from({ length: copies }, (_, copy) => start + copy * (width + COPY_GAP));
};
