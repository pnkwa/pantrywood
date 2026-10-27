"use client";

import { ArrowDownIcon } from "@phosphor-icons/react";
import { FieldSelect } from "@/components/scan/fields";
import { useStockAction } from "@/lib/grocy";
import type { GrocyPlace, PantryItem } from "@/lib/pantry/model";
import { useUiStore } from "@/lib/store/ui-store";

type PutAwayPickerProps = {
  item: PantryItem;
  destinations: readonly GrocyPlace[];
  /** The storage piece you're looking into: one tap puts it there, the rest are under "Elsewhere…". */
  here?: GrocyPlace;
  /** After Grocy moved it, with where it went. */
  onPut?: (destinationId: number) => void;
};

const pickerClass =
  "flex h-11 shrink-0 items-center justify-between gap-1.5 rounded-full border-[1.5px] border-border bg-card px-3.5 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Moves waiting stock out of "To put away" into a storage place, as a Grocy transfer (so it can be undone). */
export const usePutAway = () => {
  const stockAction = useStockAction();
  const showToast = useUiStore((state) => state.showToast);
  const putIn = (item: PantryItem, destination: GrocyPlace, onPut?: (destinationId: number) => void) =>
    stockAction.mutate(
      { type: "transfer", productId: item.productId, amount: item.amount, fromLocationId: item.locationId, toLocationId: destination.id },
      {
        onSuccess: () => {
          showToast(`Put ${item.name} in ${destination.name}`);
          onPut?.(destination.id);
        },
        onError: (error) => showToast(error.message, "error"),
      },
    );
  return { putIn, busy: stockAction.isPending };
};

export const PutAwayPicker = ({ item, destinations, here, onPut }: PutAwayPickerProps) => {
  const { putIn: move, busy } = usePutAway();
  const putIn = (destination: GrocyPlace) => move(item, destination, onPut);
  const others = destinations.filter((place) => place.id !== here?.id);

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {here && (
        <button
          type="button"
          disabled={busy}
          onClick={() => putIn(here)}
          aria-label={`Put ${item.name} in ${here.name}`}
          className="flex h-11 items-center gap-1.5 rounded-full bg-sage-deep px-4 text-sm font-semibold text-primary-foreground shadow-[0_2px_0_#3F5236] transition-[transform,background-color] duration-150 ease-out hover:bg-sage-deep/85 active:translate-y-px disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowDownIcon size={16} weight="bold" aria-hidden />
          {busy ? "Putting…" : "Put here"}
        </button>
      )}
      {others.length > 0 && (
        <FieldSelect
          value=""
          placeholder={busy && !here ? "Putting away…" : here ? "Elsewhere…" : "Put in…"}
          options={others.map((place) => ({ value: String(place.id), label: place.name }))}
          onChange={(value) => {
            const destination = others.find((place) => String(place.id) === value);
            if (destination && !busy) putIn(destination);
          }}
          className={`${pickerClass} ${here ? "w-auto text-muted-foreground" : "w-32"}`}
        />
      )}
    </span>
  );
};
