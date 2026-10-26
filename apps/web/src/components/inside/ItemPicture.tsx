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
export const ItemPicture = ({ item, className = "" }: { item: PantryItem; className?: string }) => {
  const pictures = useItemPictures();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const grocyUrl = grocyPictureUrl(item.pictureFileName);
  const url = pictures.data?.get(item.productId) ?? (grocyUrl !== failedUrl ? grocyUrl : null);

  if (!url) {
    return (
      <svg viewBox="0 0 64 64" preserveAspectRatio="xMidYMax meet" aria-hidden className={`aspect-square ${className}`}>
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
      className={`object-contain object-bottom drop-shadow-[0_4px_4px_rgba(74,59,46,0.22)] transition-opacity duration-300 ease-out ${
        loadedUrl === url ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
};
