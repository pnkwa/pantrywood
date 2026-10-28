"use client";

import { useId, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImageIcon } from "@phosphor-icons/react";
import type { PantryItem } from "@/lib/pantry/model";
import { PANEL_SPRING } from "@/lib/motion";
import { useItemPictures, useRemoveItemPicture, useSaveItemPicture } from "@/lib/inside/pictures";
import { useUiStore } from "@/lib/store/ui-store";
import { ItemIconTile } from "@/components/pantry/ItemRow";

const ACCEPTED = "image/png,image/jpeg,image/webp";

const Check = ({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: string }) => (
  <label className="flex min-h-11 items-center gap-2.5 text-sm">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="size-5 accent-sage-deep"
    />
    {children}
  </label>
);

/**
 * The item's profile picture: a photo (up to 2 MB) shown on its tile in lists and its panel, optionally saved to
 * Grocy too. On shelves an item is always its 3D model.
 */
export const ItemPictureField = ({ item }: { item: PantryItem }) => {
  const inputId = useId();
  const pictures = useItemPictures();
  const savePicture = useSaveItemPicture();
  const removePicture = useRemoveItemPicture();
  const showToast = useUiStore((state) => state.showToast);
  const [open, setOpen] = useState(false);
  const [saveToGrocy, setSaveToGrocy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const hasOwn = pictures.data?.has(item.productId) ?? false;
  const source = hasOwn ? "Your photo" : item.pictureFileName ? "From Grocy" : "Group icon";

  const savePictureFile = async (file: File | undefined) => {
    if (!file) return;
    setSaving(true);
    try {
      await savePicture(item.productId, file, { removeBackground: false, saveToGrocy });
      showToast(saveToGrocy ? `New profile picture for ${item.name}, also saved in Grocy` : `New profile picture for ${item.name}`);
      setOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn't save that picture", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    void savePictureFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <ItemIconTile item={item} shared={false} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">Profile picture</span>
          <span className="text-xs text-muted-foreground">{source}</span>
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((shown) => !shown)}
          className="h-11 rounded-full border-[1.5px] border-border bg-card px-4 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {open ? "Done" : "Change"}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={PANEL_SPRING}
            className="flex flex-col gap-1"
          >
            <label
              htmlFor={inputId}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-[18px] border-2 border-dashed px-3.5 py-4 text-center transition-colors duration-150 ease-out focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring ${
                dragOver ? "border-sage-deep bg-sage-deep/10" : "border-[#C9B79A] bg-[#FFFDF8] dark:bg-card"
              }`}
            >
              <ImageIcon size={28} weight="duotone" aria-hidden className="text-muted-foreground" />
              <span className="text-sm font-semibold">{saving ? "Saving…" : "Drop a photo or tap to upload"}</span>
              <span className="text-xs text-muted-foreground">PNG, JPG or WebP · up to 2 MB · on shelves it stays its 3D model</span>
              <input
                id={inputId}
                type="file"
                accept={ACCEPTED}
                disabled={saving}
                onChange={(event) => void savePictureFile(event.target.files?.[0])}
                className="absolute size-px opacity-0"
              />
            </label>
            <Check checked={saveToGrocy} onChange={setSaveToGrocy}>
              Also save as the product picture in Grocy
            </Check>
            {hasOwn && (
              <button
                type="button"
                onClick={() => void removePicture(item.productId)}
                className="h-11 self-start rounded-full px-3 text-sm font-semibold text-destructive transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Go back to the {item.pictureFileName ? "Grocy picture" : "group icon"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
