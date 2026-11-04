// No "@/" imports: scripts/retired-items.test.mjs runs this file directly with Node.
import type { RoomLayout } from "@pantrywood/shared";

const CAT = "napping-cat";

/**
 * Catalog items that left when Decorate kept one retro piece per kind, and the kept piece each one becomes in a saved
 * room. `null` has no counterpart and is dropped. Their 3D models stay, for when the catalog grows again.
 */
export const RETIRED: Readonly<Record<string, string | null>> = {
  "retro-fridge-mint": "retro-fridge-cream",
  "retro-fridge-butter": "retro-fridge-cream",
  "slim-white-fridge": "retro-fridge-cream",
  "oak-panel-fridge": "retro-fridge-cream",
  "chest-freezer-sky": "retro-fridge-cream",
  "birch-cube-shelf": "walnut-pantry-shelf",
  "pine-open-shelf": "walnut-pantry-shelf",
  "steel-unit-shelf": "walnut-pantry-shelf",
  "oak-ladder-shelf": "walnut-pantry-shelf",
  "rattan-cabinet": "butter-open-cabinet",
  "bamboo-drawers": "butter-open-cabinet",
  "mint-rolling-cart": "butter-open-cabinet",
  "enamel-bread-bin": "walnut-pantry-shelf",
  "ceramic-rice-jar": "walnut-pantry-shelf",
  "cream-plaster": "square-tile-wainscot",
  "white-shiplap": "square-tile-wainscot",
  "washi-grid": "square-tile-wainscot",
  "sage-limewash": "square-tile-wainscot",
  "daisy-dots": "square-tile-wainscot",
  "blue-gingham": "square-tile-wainscot",
  "light-oak-planks": "cream-blue-checker",
  tatami: "cream-blue-checker",
  cork: "cream-blue-checker",
  "terracotta-tile": "cream-blue-checker",
  "walnut-herringbone": "cream-blue-checker",
  "butter-blush-rug": "butter-oval-rug",
  "jute-round-rug": "butter-oval-rug",
  "striped-cotton-rug": "butter-oval-rug",
  "paper-lantern": "mushroom-lamp",
  "red-rim-wall-clock": "tomato-wall-clock",
  "oak-wall-clock": "tomato-wall-clock",
  "cocoa-mask-cat": CAT,
  "midnight-cat": CAT,
  "sleepy-cat-bed": null,
  "sage-pegboard": "oat-pegboard",
  "white-pegboard": "oat-pegboard",
  "walnut-pegboard": "oat-pegboard",
  "ceramic-canisters": "pastel-jar-set",
  "trailing-pothos": "pastel-jar-set",
  "mini-cactus-pot": "pastel-jar-set",
  // The sink counter is a storage piece now (a location named for the sink), not decor.
  "sink-counter": null,
  // So is the wall shelf (a location named for it).
  "sky-wall-shelf-decor": null,
  // The chairs come with the table now, as one set.
  "blush-chair": null,
  "butter-chair": null,
  // The hedgehog left the room.
  "little-hedgehog": null,
  // Rice and snack locations became pantry shelves.
  "wooden-crate-stack": "walnut-pantry-shelf",
  "rice-barrel": "walnut-pantry-shelf",
};

const keptFor = (itemId: string) => {
  const kept = RETIRED[itemId];
  return kept === undefined ? itemId : kept;
};

/** Every copy of a kept item stays (decor can be bought more than once); a retired one adds its kept piece only if missing. */
const ownedAfter = (owned: readonly string[]) => {
  const kept = owned.filter((itemId) => RETIRED[itemId] === undefined);
  const replacements = owned.flatMap((itemId) => RETIRED[itemId] ?? []);
  return [...kept, ...replacements.filter((itemId, index) => !kept.includes(itemId) && replacements.indexOf(itemId) === index)];
};

/** A saved room with every retired item swapped for its kept piece, the cat bed gone and only the first cat placed. */
export const retireItems = (layout: RoomLayout): RoomLayout => {
  let catPlaced = false;
  const decor = layout.decor.flatMap((placement) => {
    const itemId = keptFor(placement.itemId);
    if (itemId === null) return [];
    if (itemId === CAT) {
      if (catPlaced) return [];
      catPlaced = true;
    }
    return [{ ...placement, itemId }];
  });
  const pegboard = layout.pegboard === undefined ? undefined : (keptFor(layout.pegboard) ?? undefined);
  return {
    ...layout,
    wallpaper: keptFor(layout.wallpaper) ?? layout.wallpaper,
    floor: keptFor(layout.floor) ?? layout.floor,
    ...(pegboard === undefined ? {} : { pegboard }),
    storage: layout.storage.map((placement) => (placement.itemId === null ? placement : { ...placement, itemId: keptFor(placement.itemId) })),
    decor,
    owned: ownedAfter(layout.owned),
  };
};

type StarterPlacement = Pick<RoomLayout["decor"][number], "id" | "itemId" | "cell" | "rotation" | "wall">;

/**
 * The room redesigned as a little retro kitchen: every piece goes back to its new default spot and the starter decor
 * is placed again (owned if it wasn't). Wallpaper, floor, pegboard and owned items stay.
 */
export const resetArrangement = (layout: RoomLayout, starterDecor: readonly StarterPlacement[]): RoomLayout => ({
  ...layout,
  storage: [],
  decor: starterDecor.map((placement) => ({ ...placement, cell: [placement.cell[0], placement.cell[1]] })),
  owned: [...layout.owned, ...starterDecor.map((placement) => placement.itemId).filter((itemId, index, all) => !layout.owned.includes(itemId) && all.indexOf(itemId) === index)],
});
