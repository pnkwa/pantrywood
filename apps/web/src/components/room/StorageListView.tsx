"use client";

import { STORAGE_ICONS } from "@/components/pantry/icons";
import type { SceneStorage } from "@/components/scene/types";
import { statusesFor } from "./SceneOverlayLayer";

type StorageListViewProps = {
  storages: readonly SceneStorage[];
  selectedLocationId: number | null;
  onSelectStorage: (locationId: number) => void;
};

export const StorageListView = ({ storages, selectedLocationId, onSelectStorage }: StorageListViewProps) => (
  <ul
    aria-label="Storage pieces"
    className="absolute inset-0 grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3 overflow-y-auto px-4 pt-20 pb-24 lg:px-5"
  >
    {storages.map((storage, index) => {
      const StorageIcon = STORAGE_ICONS[storage.kind];
      const selected = storage.locationId === selectedLocationId;
      const statuses = statusesFor(storage.tag);
      return (
        <li
          key={storage.locationId}
          style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
          className="animate-in fade-in fill-mode-both slide-in-from-bottom-2 duration-300 motion-reduce:slide-in-from-bottom-0"
        >
          <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelectStorage(storage.locationId)}
            className={`flex min-h-28 w-full flex-col gap-2.5 rounded-lg border-[1.5px] bg-card p-4 text-left shadow-paper transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              selected ? "border-sage-deep" : "border-border"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-status-fresh text-status-fresh-foreground">
                <StorageIcon size={22} weight="duotone" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base font-semibold">{storage.tag.name}</span>
                <span className="tabular text-[13px] text-muted-foreground">
                  {storage.tag.itemCount} {storage.tag.itemCount === 1 ? "item" : "items"}
                </span>
              </span>
            </span>
            <span className="flex flex-wrap gap-1.5">
              {statuses.length === 0 ? (
                <span className="text-[13px] text-muted-foreground">All good</span>
              ) : (
                statuses.map((status) => {
                  const StatusIcon = status.icon;
                  return (
                    <span
                      key={status.key}
                      className={`inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold ${status.className}`}
                    >
                      <StatusIcon size={14} weight="duotone" aria-hidden />
                      {status.compactText}
                    </span>
                  );
                })
              )}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);
