"use client";

import { useState } from "react";
import type { PantryItem } from "@/lib/pantry/model";
import { formatAmount, formatNumber, unitFor } from "@/lib/pantry/format";
import { useStockAction } from "@/lib/grocy/actions";
import type { Inside } from "@/lib/inside/use-inside";
import { useUiStore } from "@/lib/store/ui-store";
import { ItemPicture } from "./ItemPicture";

const DEFAULT_CAPACITY = 5;

/** A single item with a fill level: dragging the gauge counts what's left in Grocy; a scanned sack refills it. */
export const RiceBinView = ({ inside, onPickItem }: { inside: Inside; onPickItem: (productId: number, itemKey: string) => void }) => {
  const [item] = inside.itemsByKey.values();
  if (!item) {
    return (
      <p className="m-auto max-w-xs rounded-md border-[1.5px] border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        The bin is empty. Scan a rice sack to fill it up.
      </p>
    );
  }
  return <RiceGauge key={item.key} inside={inside} item={item} onPickItem={onPickItem} />;
};

const RiceGauge = ({ inside, item, onPickItem }: { inside: Inside; item: PantryItem; onPickItem: (productId: number, itemKey: string) => void }) => {
  const stockAction = useStockAction();
  const showToast = useUiStore((state) => state.showToast);
  const capacity = inside.layout.capacity ?? Math.max(DEFAULT_CAPACITY, Math.ceil(item.amount));
  const [draft, setDraft] = useState<number | null>(null);
  const amount = draft ?? item.amount;
  const level = Math.min(1, amount / capacity);

  const commit = () => {
    if (stockAction.isPending) return;
    if (draft === null || draft === item.amount) return setDraft(null);
    stockAction.mutate(
      { type: "inventory", productId: item.productId, newAmount: draft, locationId: item.locationId },
      {
        onSuccess: () => showToast(`${item.name}: ${formatAmount(item, draft)} left`),
        onError: (error) => showToast(error.message, "error"),
        onSettled: () => setDraft(null),
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:gap-10">
      <button
        type="button"
        onClick={() => onPickItem(item.productId, item.key)}
        aria-label={`${item.name}, ${formatAmount(item, amount)}`}
        className="relative flex aspect-square w-[min(70vw,320px)] items-center justify-center overflow-hidden rounded-full border-[10px] border-[#C49770] bg-[#8A6A4A] shadow-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden
          style={{ transform: `scale(${0.25 + level * 0.75})` }}
          className="absolute inset-[4%] rounded-full bg-[radial-gradient(circle,#FBF6EC_0%,#F1E7D4_70%,#E5D6BA_100%)] transition-transform duration-300 ease-out motion-reduce:transition-none"
        />
        <ItemPicture item={item} className="relative h-[42%] w-auto" />
      </button>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span className="flex justify-between text-sm font-semibold">
            Fill level
            <span className="tabular text-muted-foreground">
              {Math.round(level * 100)}% · {formatAmount(item, amount)}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={capacity}
            step={0.1}
            value={amount}
            disabled={stockAction.isPending}
            onChange={(event) => setDraft(Number(event.target.value))}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            className="h-11 w-full accent-sage-deep"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          A full bin holds
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={capacity}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (next > 0) inside.setCapacity(next);
              }}
              className="tabular h-11 w-20 rounded-[12px] border-[1.5px] border-border bg-card px-3 text-right"
            />
            {unitFor(item, capacity)}
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          Running low below {formatNumber(item.minStock)}. Scanning a new sack adds it here.
        </p>
      </div>
    </div>
  );
};
