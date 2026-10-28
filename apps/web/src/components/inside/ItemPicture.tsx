"use client";

import { useState } from "react";
import type { PantryItem } from "@/lib/pantry/model";
import { iconFor } from "@/lib/inside/icon-for";
import { itemModelId } from "@/components/scene/items/item-model";
import { useItemThumbnail } from "@/components/scene/thumbnail-store";
import { sceneItemFor } from "@/lib/room/items";
import { ITEM_ICONS } from "./item-icons";

/** A white edge that hugs the cut-out's outline, then a soft shadow: a collage sticker. */
const STICKER =
  "[filter:drop-shadow(2px_0_0_#fff)_drop-shadow(-2px_0_0_#fff)_drop-shadow(0_2px_0_#fff)_drop-shadow(0_-2px_0_#fff)_drop-shadow(0_5px_5px_rgba(74,59,46,0.3))]";

const SOFT_SHADOW = "drop-shadow-[0_4px_4px_rgba(74,59,46,0.22)]";

type ItemPictureProps = {
  item: PantryItem;
  className?: string;
  sticker?: boolean;
  /** The sticker's white edge; on by default for stickers, shown only while selected on a shelf. */
  outlined?: boolean;
  /** Standing in a shelf spot (a size container): the 3D picture is as wide as the room draws the model there. */
  fitsSpot?: boolean;
};

/**
 * The item in storage: a picture of its 3D model as the room shows it, or its default icon while that renders.
 * (Your own photo is its profile picture, shown in its panel, not here.) Bottom-aligned and scaled to fit.
 */
export const ItemPicture = ({ item, className = "", sticker = false, outlined = sticker, fitsSpot = false }: ItemPictureProps) => {
  const edge = outlined ? STICKER : SOFT_SHADOW;
  const modelPicture = useItemThumbnail(itemModelId(sceneItemFor(item)));
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const url = modelPicture?.url ?? null;
  const spotWidth = fitsSpot && modelPicture ? { width: `${modelPicture.widthRatio * 100}cqw` } : undefined;

  if (!url) {
    return (
      // As a sticker the icon is cropped to its drawing and drops its ground shadow (the first ellipse).
      <svg
        viewBox={sticker ? "8 3 48 54" : "0 0 64 64"}
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
        className={`${sticker ? `aspect-[48/54] [&>ellipse:first-child]:hidden ${edge}` : "aspect-square"} ${className}`}
      >
        {ITEM_ICONS[iconFor(item)]}
      </svg>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a data URL drawn on the device, nothing to optimize
    <img
      src={url}
      alt=""
      draggable={false}
      onLoad={() => setLoadedUrl(url)}
      style={spotWidth}
      className={`object-contain object-bottom ${sticker ? edge : SOFT_SHADOW} transition-opacity duration-300 ease-out ${
        loadedUrl === url ? "opacity-100" : "opacity-0"
      } ${spotWidth ? "h-auto max-w-none" : className}`}
    />
  );
};
