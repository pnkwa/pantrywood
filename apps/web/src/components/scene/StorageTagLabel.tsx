"use client";

import type { RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Basket, Hourglass, Leaf } from "@phosphor-icons/react";
import type { StorageTag } from "./types";

/*
 * Floating paper tag above a storage piece: "Fridge · 6 items · 2 use soon".
 * Status always pairs color, icon and word (DESIGN.md section 12).
 */

function Status({ icon: Icon, text, className }: { icon: typeof Leaf; text: string; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${className}`}>
      <Icon size={14} weight="duotone" aria-hidden />
      {text}
    </span>
  );
}

/** Below this canvas width the tags shrink to name + the most urgent status. */
const COMPACT_WIDTH = 640;

export function StorageTagLabel({
  tag,
  height,
  portal,
}: {
  tag: StorageTag;
  height: number;
  /** Fixed DOM layer over the canvas for the tags. */
  portal?: RefObject<HTMLElement | null>;
}) {
  const compact = useThree((state) => state.size.width < COMPACT_WIDTH);

  // Most urgent first: past its date, use soon, running low.
  const statuses = [
    tag.expired > 0 && {
      key: "expired",
      icon: Leaf,
      text: compact ? `${tag.expired} past` : `${tag.expired} past its date`,
      className: "text-status-expired-foreground",
    },
    tag.useSoon > 0 && {
      key: "soon",
      icon: Hourglass,
      text: compact ? `${tag.useSoon} soon` : `${tag.useSoon} use soon`,
      className: "text-status-soon-foreground",
    },
    tag.low > 0 && { key: "low", icon: Basket, text: `${tag.low} low`, className: "text-status-low-foreground" },
  ].filter((status) => status !== false);

  return (
    <Html
      position={[0, height, 0]}
      portal={portal as RefObject<HTMLElement> | undefined}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        className={`flex -translate-x-1/2 -translate-y-full items-center whitespace-nowrap rounded-sm border-[1.5px] border-border bg-card text-foreground shadow-paper animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:slide-in-from-bottom-0 motion-reduce:duration-150 ${
          compact ? "gap-1 px-2 py-0.5 text-xs" : "gap-1.5 px-2.5 py-1 text-[13px]"
        }`}
      >
        <span className="font-semibold">{tag.name}</span>
        {!compact && (
          <span className="tabular text-muted-foreground">
            · {tag.itemCount} {tag.itemCount === 1 ? "item" : "items"}
          </span>
        )}
        {statuses.slice(0, compact ? 1 : 2).map((status) => (
          <span key={status.key} className="inline-flex items-center gap-1">
            <span className="text-muted-foreground">·</span>
            <Status icon={status.icon} text={status.text} className={status.className} />
          </span>
        ))}
      </div>
    </Html>
  );
}
