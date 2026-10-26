"use client";

import { LeafIcon } from "@phosphor-icons/react";
import { useRoomStore } from "@/lib/room/room-store";
import { useUiStore } from "@/lib/store/ui-store";
import { STYLE_CHIPS } from "./BuildTray";
import { CatalogThumb } from "./CatalogThumb";
import { ConfirmDialog } from "./ConfirmDialog";

export const BuyDialog = () => {
  const purchase = useUiStore((state) => state.purchase);
  const closePurchase = useUiStore((state) => state.closePurchase);
  const leaves = useRoomStore((state) => state.layout.leaves);
  const owned = useRoomStore((state) => (purchase ? state.layout.owned.includes(purchase.item.id) : false));
  const item = purchase?.item;
  const addingAs = purchase?.addingAs;
  // A style you already own costs nothing more for another piece.
  const price = item && !(addingAs && owned) ? item.price : 0;
  const buyLabel = item ? `Buy for ${item.price} leaves` : "Buy";

  return (
    <ConfirmDialog
      open={purchase !== null}
      title={addingAs ? `Add ${addingAs}?` : item ? `Buy the ${item.name}?` : "Buy it?"}
      confirmLabel={addingAs ? (price > 0 ? `Add for ${price} leaves` : "Add to room") : buyLabel}
      cancelLabel="Not now"
      tone="positive"
      onConfirm={() => purchase?.confirm()}
      onClose={closePurchase}
    >
      {item && (
        <div className="flex flex-col gap-3">
          <div className="mx-auto w-40">
            <CatalogThumb item={item} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLE_CHIPS[item.style].className}`}>
              {STYLE_CHIPS[item.style].label}
            </span>
            <span className="tabular inline-flex items-center gap-1 font-semibold text-foreground">
              <LeafIcon size={16} weight="duotone" aria-hidden />
              {price > 0 ? price : "Owned"}
            </span>
          </div>
          {addingAs && (
            <p className="text-center">
              A new storage spot called <span className="font-semibold text-foreground">{addingAs}</span> is added in
              Grocy, so you can put stock in it.
            </p>
          )}
          {price > 0 && (
            <p className="tabular flex items-center justify-center gap-1.5 rounded-md bg-muted/50 px-3 py-2">
              <LeafIcon size={14} weight="duotone" aria-hidden className="text-status-fresh-foreground" />
              {leaves} leaves now → <span className="font-semibold text-foreground">{leaves - price} after</span>
            </p>
          )}
        </div>
      )}
    </ConfirmDialog>
  );
};
