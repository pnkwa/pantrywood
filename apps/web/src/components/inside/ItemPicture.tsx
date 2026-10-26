"use client";

import { useState } from "react";
import type { PantryItem } from "@/lib/pantry/model";
import { iconFor } from "@/lib/inside/icon-for";
import { grocyPictureUrl, useItemPictures } from "@/lib/inside/pictures";
import { ITEM_ICONS } from "./item-icons";

/**
 * The item's own picture (yours, then Grocy's) or its default icon, bottom-aligned and scaled to fit
 * (contain). Pictures keep their transparency; the drop shadow follows their shape.
 */
/** A white edge that hugs the cut-out's outline, then a soft shadow: a collage sticker. */
const STICKER =
  "[filter:drop-shadow(2px_0_0_#fff)_drop-shadow(-2px_0_0_#fff)_drop-shadow(0_2px_0_#fff)_drop-shadow(0_-2px_0_#fff)_drop-shadow(0_5px_5px_rgba(74,59,46,0.3))]";

export const ItemPicture = ({ item, className = "", sticker = false }: { item: PantryItem; className?: string; sticker?: boolean }) => {
  const pictures = useItemPictures();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const grocyUrl = grocyPictureUrl(item.pictureFileName);
  const url = pictures.data?.get(item.productId) ?? (grocyUrl !== failedUrl ? grocyUrl : null);

  if (!url) {
    return (
      // As a sticker the icon is cropped to its drawing and drops its ground shadow (the first ellipse).
      <svg
        viewBox={sticker ? "8 3 48 54" : "0 0 64 64"}
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
        className={`${sticker ? `aspect-[48/54] [&>ellipse:first-child]:hidden ${STICKER}` : "aspect-square"} ${className}`}
      >
        {ITEM_ICONS[iconFor(item)]}
      </svg>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a local data URL or Grocy through the proxy, nothing to optimize
    <img
      src={url}
      alt=""
      draggable={false}
      onLoad={() => setLoadedUrl(url)}
      onError={() => setFailedUrl(url)}
      className={`object-contain object-bottom ${sticker ? STICKER : "drop-shadow-[0_4px_4px_rgba(74,59,46,0.22)]"} transition-opacity duration-300 ease-out ${
        loadedUrl === url ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
};
