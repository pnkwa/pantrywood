"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { PantryItem } from "@/lib/pantry/model";
import { formatAmount } from "@/lib/pantry/format";
import { PANEL_SPRING } from "@/lib/motion";
import { useProfilePicture } from "@/lib/inside/pictures";
import { PRODUCT_ICONS, productIconKeyFor } from "./icons";
import { useUiStore } from "@/lib/store/ui-store";
import { fadeInDelay } from "./FadeIn";
import { FreezerTag, StatusChip } from "./StatusChip";

// One radius for both sizes, so the tile keeps its shape while it flies between them.
const TILE_RADIUS = 12;

/**
 * The item's profile: your photo (or Grocy's) when it has one, else its group's icon. Shared between the item row
 * and the item panel, so it flies from one to the other.
 * The radius is an inline style and the children have `layout`, so Motion keeps them
 * undistorted while the tile changes size.
 */
export const ItemIconTile = ({
  item,
  size = "small",
  shared = true,
}: {
  item: PantryItem;
  size?: "small" | "large";
  shared?: boolean;
}) => {
  const ProductIcon = PRODUCT_ICONS[productIconKeyFor(item.groupName)];
  const large = size === "large";
  const profileUrl = useProfilePicture(item.productId, item.pictureFileName);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = profileUrl && profileUrl !== failedUrl ? profileUrl : null;
  return (
    <motion.span
      layoutId={shared ? `item-icon-${item.key}` : undefined}
      transition={PANEL_SPRING}
      style={{ borderRadius: TILE_RADIUS, zIndex: 1 }}
      className={`relative flex shrink-0 items-center justify-center border-[1.5px] border-border bg-muted text-muted-foreground ${
        large ? "h-16 w-14" : "h-[46px] w-10"
      }`}
    >
      <motion.span
        layout={shared}
        transition={PANEL_SPRING}
        aria-hidden
        style={{ borderRadius: 3 }}
        className={`absolute bg-[#B98B57] ${
          large
            ? "-top-1.5 right-2.5 left-2.5 h-2"
            : "-top-1 right-[7px] left-[7px] h-1.5"
        }`}
      />
      {photo ? (
        <span style={{ borderRadius: TILE_RADIUS - 2 }} className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL or Grocy through the proxy */}
          <img src={photo} alt="" draggable={false} onError={() => setFailedUrl(photo)} className="size-full object-cover" />
        </span>
      ) : (
        <motion.span layout={shared} transition={PANEL_SPRING} className="flex">
          <ProductIcon size={large ? 28 : 20} weight="duotone" aria-hidden />
        </motion.span>
      )}
    </motion.span>
  );
};

type ItemRowProps = {
  item: PantryItem;
  onPick: () => void;
  /** Fades in with the panel at this place in the stagger; null = appear as is (filter swaps). */
  enterOrder: number | null;
};

export const ItemRow = ({ item, onPick, enterOrder }: ItemRowProps) => {
  const flyingItemKey = useUiStore((state) => state.flyingItemKey);
  const flying = item.key === flyingItemKey;
  // The row holding the flying icon doesn't fade, so the icon never dims mid-flight.
  const fadesIn = enterOrder !== null && !flying;
  return (
  <motion.li
    initial={fadesIn ? { opacity: 0 } : false}
    animate={{
      opacity: 1,
      transition: { ...PANEL_SPRING, delay: fadeInDelay(enterOrder ?? 0) },
    }}
  >
    <button
      type="button"
      onClick={onPick}
      className="flex min-h-[60px] w-full items-center gap-3 rounded-md border-[1.5px] border-border bg-[#FFFDF8] py-2.5 pr-2.5 pl-2 text-left transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-card"
    >
      <ItemIconTile item={item} shared={flying} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-[15px] font-semibold">{item.name}</span>
        <span className="truncate text-[13px] text-muted-foreground">
          {item.inFreezer && (
            <>
              <FreezerTag compact /> ·{" "}
            </>
          )}
          {[
            item.thaiName,
            item.kind === "supply" && item.minStock > 0
              ? `${formatAmount(item, item.totalAmount)} of min ${item.minStock}`
              : formatAmount(item),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <StatusChip item={item} />
    </button>
  </motion.li>
  );
};
