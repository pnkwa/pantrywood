"use client";

import { useState } from "react";
import {
  XIcon,
} from "@phosphor-icons/react";
import type { StorageKind } from "@/components/scene/types";
import type { PantryItem, PantryLocation } from "@/lib/pantry/model";
import { useUiStore } from "@/lib/store/ui-store";
import { STORAGE_ICONS } from "./icons";
import { FadeIn } from "./FadeIn";
import { ItemRow } from "./ItemRow";

type Filter = "all" | "soon" | "opened" | "low";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  soon: "Use soon",
  opened: "Opened",
  low: "Running low",
};

const matchesFilter = (item: PantryItem, filter: Filter) => {
  if (filter === "soon") return item.status === "soon" || item.status === "expired";
  if (filter === "opened") return item.amountOpened > 0;
  if (filter === "low") return item.isRunningLow;
  return true;
};

const MAX_STAGGERED_ROWS = 6;

const EMPTY_MESSAGES: Record<Filter, string> = {
  all: "Nothing here yet. A good excuse for a market trip.",
  soon: "Nothing needs rushing here.",
  opened: "Nothing is open here.",
  low: "All stocked up here.",
};

const summaryFor = (location: PantryLocation) => {
  const { itemCount, useSoon, expired } = location.counts;
  const parts = [`${itemCount} ${itemCount === 1 ? "item" : "items"}`];
  if (location.kind === "supply") {
    parts.push("tracked by amount, no expiry");
  } else {
    if (useSoon) parts.push(`${useSoon} use soon`);
    if (expired) parts.push(`${expired} past its date`);
  }
  return parts.join(" · ");
};

export const CloseButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-card transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <XIcon size={16} weight="bold" aria-hidden />
  </button>
);

type StoragePanelProps = {
  location: PantryLocation;
  storageKind: StorageKind;
  busy: boolean;
  onClose: () => void;
  onPickItem: (productId: number, itemKey: string) => void;
  onOpenFridgeDoor: () => void;
  onAddLowToShoppingList: () => void;
};

export const StoragePanel = ({
  location,
  storageKind,
  busy,
  onClose,
  onPickItem,
  onOpenFridgeDoor,
  onAddLowToShoppingList,
}: StoragePanelProps) => {
  const [filter, setFilter] = useState<Filter>("all");
  // Rows fade in with the panel once; after that, filter swaps are instant.
  const [rowsEntered, setRowsEntered] = useState(false);
  const clearFlyingItem = useUiStore((state) => state.clearFlyingItem);
  const StorageIcon = STORAGE_ICONS[storageKind];
  const filters: Filter[] =
    location.kind === "supply" ? ["all", "low"] : ["all", "soon", "opened"];
  const visibleItems = location.items.filter((item) =>
    matchesFilter(item, filter),
  );
  const countFor = (option: Filter) =>
    location.items.filter((item) => matchesFilter(item, option)).length;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-3.5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-status-fresh text-status-fresh-foreground">
          <StorageIcon size={30} weight="duotone" aria-hidden />
        </span>
        <FadeIn className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.08em] text-sage-deep uppercase">
            Storage · Storage room
          </p>
          <h2 className="mt-0.5 text-[28px] leading-tight">{location.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {summaryFor(location)}
          </p>
        </FadeIn>
        <CloseButton label="Close panel" onClick={onClose} />
      </div>

      <FadeIn order={1} onEntered={() => setRowsEntered(true)}>
      <div
        role="tablist"
        aria-label={`Filter ${location.name} items`}
        className="flex gap-1 rounded-full bg-muted p-1"
      >
        {filters.map((option) => {
          const selected = option === filter;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                clearFlyingItem();
                setFilter(option);
              }}
              className={`h-11 flex-1 rounded-full text-sm transition-colors duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                selected
                  ? "bg-card font-semibold text-foreground shadow-[0_2px_6px_rgba(74,59,46,.12)]"
                  : "font-medium text-muted-foreground"
              }`}
            >
              {FILTER_LABELS[option]} {countFor(option)}
            </button>
          );
        })}
      </div>
      </FadeIn>

      <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pt-1 pb-2">
        {visibleItems.map((item, index) => (
          <ItemRow
            key={item.key}
            item={item}
            onPick={() => onPickItem(item.productId, item.key)}
            enterOrder={rowsEntered ? null : Math.min(index, MAX_STAGGERED_ROWS) + 2}
          />
        ))}
        {visibleItems.length === 0 && (
          <li className="rounded-md border-[1.5px] border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {EMPTY_MESSAGES[filter]}
          </li>
        )}
      </ul>

      <FadeIn order={2} className="flex flex-wrap gap-2.5">
        {storageKind === "fridge" && (
          <button
            type="button"
            onClick={onOpenFridgeDoor}
            className="h-12 flex-1 rounded-full bg-sage-deep px-5 text-[15px] font-semibold text-primary-foreground shadow-[0_3px_0_#3F5236] transition-transform duration-150 ease-out active:translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Open fridge door
          </button>
        )}
        {location.counts.low > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={onAddLowToShoppingList}
            className="h-12 flex-1 rounded-full border-[1.5px] border-border bg-muted px-5 text-[15px] font-semibold transition-colors duration-150 ease-out hover:bg-oat disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Add low items to shopping list
          </button>
        )}
      </FadeIn>
    </div>
  );
};
