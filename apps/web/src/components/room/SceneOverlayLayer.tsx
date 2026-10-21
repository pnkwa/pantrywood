"use client";

import { useState } from "react";
import {
  BasketIcon,
  HourglassIcon,
  type Icon,
  LeafIcon,
} from "@phosphor-icons/react";
import { highlightFor, type Highlight } from "@/components/scene/interaction";
import { registerIn, type SceneOverlay } from "@/components/scene/overlay";
import type { SceneStorage, StorageTag } from "@/components/scene/types";

export type TagStatus = {
  key: string;
  icon: Icon;
  text: string;
  compactText: string;
  className: string;
};

export const statusesFor = (tag: StorageTag): TagStatus[] => {
  const statuses: TagStatus[] = [];
  if (tag.expired > 0) {
    statuses.push({
      key: "expired",
      icon: LeafIcon,
      text: `${tag.expired} past its date`,
      compactText: `${tag.expired} past`,
      className: "text-status-expired-foreground",
    });
  }
  if (tag.useSoon > 0) {
    statuses.push({
      key: "soon",
      icon: HourglassIcon,
      text: `${tag.useSoon} use soon`,
      compactText: `${tag.useSoon} soon`,
      className: "text-status-soon-foreground",
    });
  }
  if (tag.low > 0) {
    statuses.push({
      key: "low",
      icon: BasketIcon,
      text: `${tag.low} low`,
      compactText: `${tag.low} low`,
      className: "text-status-low-foreground",
    });
  }
  return statuses.slice(0, 2);
};

/** Narrow rooms show one short status per tag. */
const Status = ({ status, index }: { status: TagStatus; index: number }) => {
  const StatusIcon = status.icon;
  return (
    <span className={`inline-flex items-center gap-1 ${index > 0 ? "@max-[640px]:hidden" : ""}`}>
      <span className="text-muted-foreground">·</span>
      <span className={`inline-flex items-center gap-1 font-medium ${status.className}`}>
        <StatusIcon size={14} weight="duotone" aria-hidden />
        <span className="@max-[640px]:hidden">{status.text}</span>
        <span className="@min-[640px]:hidden">{status.compactText}</span>
      </span>
    </span>
  );
};

const TagCard = ({ tag, selected }: { tag: StorageTag; selected: boolean }) => (
  <div
    className={`${selected ? "border-sage-deep" : "border-border"} flex -translate-x-1/2 -translate-y-full items-center gap-1.5 whitespace-nowrap rounded-sm border-[1.5px] bg-card px-2.5 py-1 text-[13px] text-foreground shadow-paper transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:slide-in-from-bottom-0 motion-reduce:duration-150 @max-[640px]:gap-1 @max-[640px]:px-2 @max-[640px]:py-0.5 @max-[640px]:text-xs`}
  >
    <span className="font-semibold">{tag.name}</span>
    <span className="tabular text-muted-foreground @max-[640px]:hidden">
      · {tag.itemCount} {tag.itemCount === 1 ? "item" : "items"}
    </span>
    {statusesFor(tag).map((status, index) => (
      <Status key={status.key} status={status} index={index} />
    ))}
  </div>
);

const STROKES: Record<Exclude<Highlight, "none">, string> = {
  hover: "#FFFBF3",
  selected: "#5E7550",
  editing: "#C8901F",
};

type OutlineProps = {
  outlineKey: string;
  highlight: Highlight;
  overlay: SceneOverlay;
};

/** Cream on hover, sage when selected, dashed honey for the piece being decorated; the scene writes its points. */
const Outline = ({ outlineKey, highlight, overlay }: OutlineProps) => {
  // Keeps the last look while fading out, so a selected outline doesn't flash cream.
  const [shown, setShown] = useState<Exclude<Highlight, "none">>("hover");
  if (highlight !== "none" && shown !== highlight) setShown(highlight);
  return (
    <g
      ref={registerIn(overlay.outlines, outlineKey)}
      className={`transition-opacity duration-150 ease-out ${highlight === "none" ? "opacity-0" : "opacity-100"}`}
    >
      <polygon fill="none" stroke="rgba(74, 59, 46, 0.18)" strokeWidth={6} strokeLinejoin="round" />
      <polygon
        fill={shown === "editing" ? "rgba(226, 178, 92, 0.12)" : "none"}
        stroke={STROKES[shown]}
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeDasharray={shown === "editing" ? "8 6" : undefined}
      />
    </g>
  );
};

type SceneOverlayLayerProps = {
  overlay: SceneOverlay;
  storages: readonly SceneStorage[];
  decorKeys: readonly string[];
  hoveredLocationId: number | null;
  selectedLocationId: number | null;
  openDoorLocationId: number | null;
  /** Decorate mode: only the picked piece is outlined, and storage tags step aside. */
  editing: boolean;
  selectedPieceKey: string | null;
};

const outlineFor = (
  key: string,
  locationId: number | null,
  props: SceneOverlayLayerProps,
): Highlight => {
  if (props.editing) {
    if (key === props.selectedPieceKey) return "editing";
    return locationId !== null && locationId === props.hoveredLocationId ? "hover" : "none";
  }
  if (locationId === null || locationId === props.openDoorLocationId) return "none";
  return highlightFor(locationId, props.hoveredLocationId, props.selectedLocationId);
};

/** Storage outlines and tags over the 3D room, kept in the page's React tree. */
export const SceneOverlayLayer = (props: SceneOverlayLayerProps) => {
  const { overlay, storages, decorKeys, selectedLocationId, editing } = props;
  return (
    <div aria-hidden className="@container pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <svg className="absolute inset-0 size-full overflow-visible">
        {storages.map((storage) => {
          const key = `storage:${storage.locationId}`;
          return <Outline key={key} outlineKey={key} overlay={overlay} highlight={outlineFor(key, storage.locationId, props)} />;
        })}
        {decorKeys.map((key) => (
          <Outline key={key} outlineKey={key} overlay={overlay} highlight={outlineFor(key, null, props)} />
        ))}
      </svg>
      {storages.map((storage) => (
        <div
          key={storage.locationId}
          ref={registerIn(overlay.tags, storage.locationId)}
          className={`invisible absolute top-0 left-0 transition-opacity duration-200 ease-out ${editing ? "opacity-0" : "opacity-100"}`}
        >
          <TagCard tag={storage.tag} selected={storage.locationId === selectedLocationId} />
        </div>
      ))}
    </div>
  );
};
