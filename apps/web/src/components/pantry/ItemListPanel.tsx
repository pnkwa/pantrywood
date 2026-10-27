"use client";

import { MapPinIcon, TrayIcon, XIcon } from "@phosphor-icons/react";
import type { GrocyPlace, Pantry } from "@/lib/pantry/model";
import { formatAmount } from "@/lib/pantry/format";
import { itemRows } from "@/lib/pantry/put-away";
import { useUiStore } from "@/lib/store/ui-store";
import { FadeIn } from "./FadeIn";
import { ItemIconTile } from "./ItemRow";
import { PutAwayPicker } from "./PutAwayPicker";

/** Every place stock can be put, without the "To put away" place itself. */
export const putAwayDestinations = (pantry: Pantry): GrocyPlace[] =>
  pantry.places.filter((place) => place.id !== pantry.putAwayId);

const rowClass =
  "flex min-h-[60px] w-full items-center gap-3 rounded-md border-[1.5px] border-border bg-[#FFFDF8] py-2.5 pr-2.5 pl-2 text-left dark:bg-card";

/** All items with where they are; the ones waiting to be put away first, each with "Put in…". */
export const ItemListPanel = ({ pantry }: { pantry: Pantry }) => {
  const selectItem = useUiStore((state) => state.selectItem);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const rows = itemRows(pantry.waiting, pantry.locations);
  const destinations = putAwayDestinations(pantry);
  const placeIdOf = (itemKey: string) =>
    pantry.locations.find((location) => location.items.some((item) => item.key === itemKey))?.id ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <FadeIn className="flex items-start gap-3">
        <div className="flex-1">
          <h2 className="text-[22px]">All items</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {pantry.waiting.length > 0
              ? `${pantry.waiting.length} waiting to be put away · put each in a storage piece`
              : "Everything is put away. Tap an item to see it."}
          </p>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          aria-label="Close the item list"
          className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <XIcon size={18} weight="bold" aria-hidden />
        </button>
      </FadeIn>
      <FadeIn order={1} className="flex min-h-0 flex-col">
        <ul className="flex flex-col gap-2 overflow-y-auto pb-1">
          {rows.map(({ item, place }) => {
            const placeId = place === null ? null : placeIdOf(item.key);
            const details = (
              <>
                <ItemIconTile item={item} shared={false} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-[15px] font-semibold">{item.name}</span>
                  <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                    {place === null ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-soon px-2 py-0.5 text-xs font-semibold text-status-soon-foreground">
                        <TrayIcon size={12} weight="bold" aria-hidden />
                        To put away
                      </span>
                    ) : (
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-status-fresh px-2 py-0.5 text-xs font-semibold text-status-fresh-foreground">
                        <MapPinIcon size={12} weight="bold" aria-hidden className="shrink-0" />
                        <span className="truncate">{place}</span>
                      </span>
                    )}
                    <span className="truncate tabular">{formatAmount(item)}</span>
                  </span>
                </span>
              </>
            );
            return (
              <li key={item.key}>
                {place === null || placeId === null ? (
                  <div className={rowClass}>
                    {details}
                    {place === null && <PutAwayPicker item={item} destinations={destinations} />}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => selectItem(placeId, item.productId, item.key)}
                    className={`${rowClass} transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring`}
                  >
                    {details}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </FadeIn>
    </div>
  );
};
