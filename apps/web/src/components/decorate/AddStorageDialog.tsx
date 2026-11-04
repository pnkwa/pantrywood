"use client";

import { useUiStore } from "@/lib/store/ui-store";
import { CatalogThumb } from "./CatalogThumb";
import { ConfirmDialog } from "./ConfirmDialog";

/** Asks before Decorate adds a storage piece, because that also adds a location in Grocy. */
export const AddStorageDialog = () => {
  const adding = useUiStore((state) => state.addingStorage);
  const closeAdding = useUiStore((state) => state.closeAddingStorage);
  return (
    <ConfirmDialog
      open={adding !== null}
      title={adding ? `Add ${adding.name}?` : "Add it?"}
      confirmLabel="Add to room"
      cancelLabel="Not now"
      tone="positive"
      onConfirm={() => adding?.confirm()}
      onClose={closeAdding}
    >
      {adding && (
        <div className="flex flex-col gap-3">
          <div className="mx-auto w-40">
            <CatalogThumb item={adding.item} />
          </div>
          <p className="text-center">
            A new storage spot called <span className="font-semibold text-foreground">{adding.name}</span> is added in
            Grocy, so you can put stock in it.
          </p>
        </div>
      )}
    </ConfirmDialog>
  );
};
