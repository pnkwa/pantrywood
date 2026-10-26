"use client";

import {
  BasketIcon,
  HourglassIcon,
  type Icon,
  LeafIcon,
} from "@phosphor-icons/react";
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

/** The full tag, or, when it would cover a more urgent one (`data-crowded`), just its top status as a dot. */
const TagCard = ({ tag, selected }: { tag: StorageTag; selected: boolean }) => {
  const [top] = statusesFor(tag);
  const TopIcon = top?.icon;
  return (
    <div
      className={`${selected ? "border-sage-deep" : "border-border"} flex -translate-x-1/2 -translate-y-full items-center gap-1.5 whitespace-nowrap rounded-sm border-[1.5px] bg-card px-2.5 py-1 text-[13px] text-foreground shadow-paper transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300 group-data-crowded:rounded-full group-data-crowded:p-1 motion-reduce:slide-in-from-bottom-0 motion-reduce:duration-150 @max-[640px]:gap-1 @max-[640px]:px-2 @max-[640px]:py-0.5 @max-[640px]:text-xs`}
    >
      <span className="contents group-data-crowded:hidden">
        <span className="font-semibold">{tag.name}</span>
        <span className="tabular text-muted-foreground @max-[640px]:hidden">
          · {tag.itemCount} {tag.itemCount === 1 ? "item" : "items"}
        </span>
        {statusesFor(tag).map((status, index) => (
          <Status key={status.key} status={status} index={index} />
        ))}
      </span>
      <span className={`hidden size-4 items-center justify-center group-data-crowded:flex animate-in fade-in zoom-in-75 duration-200 motion-reduce:zoom-in-100 ${top?.className ?? "text-muted-foreground"}`}>
        {TopIcon ? <TopIcon size={14} weight="duotone" aria-hidden /> : <span className="size-2 rounded-full bg-current" />}
      </span>
    </div>
  );
};

type SceneOverlayLayerProps = {
  overlay: SceneOverlay;
  storages: readonly SceneStorage[];
  selectedLocationId: number | null;
  /** Decorate mode: storage tags step aside. */
  editing: boolean;
};

export const SceneOverlayLayer = ({ overlay, storages, selectedLocationId, editing }: SceneOverlayLayerProps) => {
  return (
    <div aria-hidden className="@container pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {storages.map((storage) => (
        <div
          key={storage.locationId}
          ref={registerIn(overlay.tags, storage.locationId)}
          className={`group invisible absolute top-0 left-0 transition-opacity duration-200 ease-out ${editing ? "opacity-0" : "opacity-100"}`}
        >
          <TagCard tag={storage.tag} selected={storage.locationId === selectedLocationId} />
        </div>
      ))}
    </div>
  );
};
