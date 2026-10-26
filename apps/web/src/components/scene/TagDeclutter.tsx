"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { crowdedTags, type TagBox } from "@/lib/room/declutter";
import type { SceneOverlay } from "./overlay";

/**
 * Runs after the tag anchors each frame: tags that would cover a more important one get
 * `data-crowded`, which shrinks them to a status dot. Sizes are measured at full size, so a
 * shrunk tag doesn't pop back the moment it stops overlapping.
 */
export const TagDeclutter = ({ overlay, ranks }: { overlay: SceneOverlay; ranks: ReadonlyMap<number, number> }) => {
  const [fullSizes] = useState(() => new WeakMap<HTMLElement, { width: number; height: number }>());

  useFrame(() => {
    const boxes: TagBox[] = [];
    for (const [id, tag] of overlay.tags) {
      const card = tag.firstElementChild;
      if (!(card instanceof HTMLElement)) continue;
      if (tag.dataset.crowded === undefined && card.offsetWidth > 0) {
        fullSizes.set(tag, { width: card.offsetWidth, height: card.offsetHeight });
      }
      const size = fullSizes.get(tag);
      const x = Number(tag.dataset.x);
      const y = Number(tag.dataset.y);
      if (!size || Number.isNaN(x) || Number.isNaN(y)) continue;
      // The card hangs centered above its anchor point.
      boxes.push({ id, left: x - size.width / 2, top: y - size.height, ...size, rank: ranks.get(id) ?? 0 });
    }
    const crowded = crowdedTags(boxes);
    for (const [id, tag] of overlay.tags) tag.toggleAttribute("data-crowded", crowded.has(id));
  });

  return null;
};
