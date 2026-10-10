"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  BasketIcon,
  HourglassIcon,
  type Icon,
  LeafIcon,
} from "@phosphor-icons/react";
import type { StorageTag } from "./types";

const COMPACT_CANVAS_WIDTH = 640;

type TagStatus = { key: string; icon: Icon; text: string; className: string };

const Status = ({ status }: { status: TagStatus }) => {
  const StatusIcon = status.icon;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground">·</span>
      <span
        className={`inline-flex items-center gap-1 font-medium ${status.className}`}
      >
        <StatusIcon size={14} weight="duotone" aria-hidden />
        {status.text}
      </span>
    </span>
  );
};

const statusesFor = (tag: StorageTag, compact: boolean): TagStatus[] => {
  const statuses: TagStatus[] = [];
  if (tag.expired > 0) {
    statuses.push({
      key: "expired",
      icon: LeafIcon,
      text: compact ? `${tag.expired} past` : `${tag.expired} past its date`,
      className: "text-status-expired-foreground",
    });
  }
  if (tag.useSoon > 0) {
    statuses.push({
      key: "soon",
      icon: HourglassIcon,
      text: compact ? `${tag.useSoon} soon` : `${tag.useSoon} use soon`,
      className: "text-status-soon-foreground",
    });
  }
  if (tag.low > 0) {
    statuses.push({
      key: "low",
      icon: BasketIcon,
      text: `${tag.low} low`,
      className: "text-status-low-foreground",
    });
  }
  return statuses;
};

type StorageTagLabelProps = {
  tag: StorageTag;
  height: number;
  tagLayer: HTMLElement | null;
  selected: boolean;
};

export const StorageTagLabel = ({
  tag,
  height,
  tagLayer,
  selected,
}: StorageTagLabelProps) => {
  const compact = useThree((state) => state.size.width < COMPACT_CANVAS_WIDTH);
  // drei's Html loses its content if its default DOM target changes after mount, so it gets a fixed layer.
  const portal = useMemo(
    () => (tagLayer ? { current: tagLayer } : undefined),
    [tagLayer],
  );
  const statuses = statusesFor(tag, compact).slice(0, compact ? 1 : 2);

  return (
    <Html
      position={[0, height, 0]}
      portal={portal}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        className={`${selected ? "border-sage-deep" : "border-border"} flex -translate-x-1/2 -translate-y-full items-center whitespace-nowrap rounded-sm border-[1.5px] bg-card text-foreground transition-colors shadow-paper animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:slide-in-from-bottom-0 motion-reduce:duration-150 ${
          compact
            ? "gap-1 px-2 py-0.5 text-xs"
            : "gap-1.5 px-2.5 py-1 text-[13px]"
        }`}
      >
        <span className="font-semibold">{tag.name}</span>
        {!compact && (
          <span className="tabular text-muted-foreground">
            · {tag.itemCount} {tag.itemCount === 1 ? "item" : "items"}
          </span>
        )}
        {statuses.map((status) => (
          <Status key={status.key} status={status} />
        ))}
      </div>
    </Html>
  );
};
