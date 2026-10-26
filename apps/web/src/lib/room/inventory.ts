// No "@/" imports: scripts/inventory.test.mjs runs this file directly with Node.

/**
 * Decor can be owned several times, like a game inventory: `owned` lists one id per copy bought,
 * and each placement in the room uses one copy. Other things (storage styles, wallpaper, floors,
 * pegboard pieces) are owned once.
 */
type Inventory = { owned: readonly string[]; decor: readonly { itemId: string }[] };

export const ownedCount = (inventory: Inventory, itemId: string) =>
  inventory.owned.filter((id) => id === itemId).length;

export const placedCount = (inventory: Inventory, itemId: string) =>
  inventory.decor.filter((placement) => placement.itemId === itemId).length;

/** Copies in the box, ready to place. */
export const freeCount = (inventory: Inventory, itemId: string) =>
  Math.max(0, ownedCount(inventory, itemId) - placedCount(inventory, itemId));

/** Adds the ids not owned yet (once each), keeping every copy already owned. */
export const ownAll = (owned: readonly string[], itemIds: readonly string[]) => [
  ...owned,
  ...itemIds.filter((id, index) => !owned.includes(id) && itemIds.indexOf(id) === index),
];
