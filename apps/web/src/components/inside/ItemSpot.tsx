"use client";

import type { StorageKind } from "@/components/scene/types";
import { Combobox } from "@/components/ui/combobox";
import type { PantryItem, PantryLocation } from "@/lib/pantry/model";
import { useInside } from "@/lib/inside/use-inside";

/** Where the item stands inside the open piece, with a "Move to…" list as the button version of dragging. */
export const ItemSpot = ({ item, location, kind }: { item: PantryItem; location: PantryLocation; kind: StorageKind }) => {
  const inside = useInside(location, kind);
  const current = inside.sectionOf(item.key);
  const destinations = inside.destinationsFor(item);
  if (inside.spec.view === "riceBin") return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-muted-foreground">Spot</span>
        <span className="truncate text-[15px] font-medium">{inside.positionOf(item.key)}</span>
      </span>
      <Combobox
        value={current}
        placeholder="Move to…"
        options={destinations.map((destination) => ({ value: destination.id, label: destination.label }))}
        onChange={(sectionId) => inside.place(item.key, sectionId, (inside.arranged.get(sectionId) ?? []).length)}
        className="h-11 w-44"
      />
    </div>
  );
};
