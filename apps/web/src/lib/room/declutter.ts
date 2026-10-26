// No "@/" imports: scripts/declutter.test.mjs runs this file directly with Node.

/** A tag's full-size box on screen and how much it matters (higher stays full size). */
export type TagBox = { id: number; left: number; top: number; width: number; height: number; rank: number };

const GAP = 4;

const overlaps = (first: TagBox, second: TagBox) =>
  first.left < second.left + second.width + GAP &&
  second.left < first.left + first.width + GAP &&
  first.top < second.top + second.height + GAP &&
  second.top < first.top + first.height + GAP;

/** Tags that would cover a more important one; they shrink to a status dot. Ties keep the first tag. */
export const crowdedTags = (tags: readonly TagBox[]): Set<number> => {
  const kept: TagBox[] = [];
  const crowded = new Set<number>();
  for (const tag of [...tags].sort((first, second) => second.rank - first.rank)) {
    if (kept.some((other) => overlaps(tag, other))) crowded.add(tag.id);
    else kept.push(tag);
  }
  return crowded;
};

/** Past its date beats use soon beats running low; the item count breaks ties. */
export const tagRank = (counts: { expired: number; useSoon: number; low: number; itemCount: number }) =>
  (counts.expired > 0 ? 3000 : counts.useSoon > 0 ? 2000 : counts.low > 0 ? 1000 : 0) + Math.min(counts.itemCount, 999);
