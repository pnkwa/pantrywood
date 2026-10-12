"use client";

import { motion } from "motion/react";
import {
  ArrowLeftIcon,
} from "@phosphor-icons/react";
import type { ItemStatus, PantryLocation } from "@/lib/pantry/model";
import { formatAmount } from "@/lib/pantry/format";
import { PANEL_SPRING } from "@/lib/motion";
import { FreezerTag, StatusChip } from "./StatusChip";

const NOTE_PAPER: Record<ItemStatus, string> = {
  expired: "bg-[#FBEDE6]",
  soon: "bg-[#FFF6E2]",
  opened: "bg-[#EAF2F3]",
  fresh: "bg-[#F1F4EA]",
  stocked: "bg-[#F1F4EA]",
  low: "bg-[#FBEFE9]",
};

const MAGNET_COLORS = ["#C8755A", "#A9C9DA", "#E2B25C", "#8FA67A", "#E9A9A9"];
const NOTE_TILTS = [-2, 1.5, -0.8, 2.2, -1.6, 0.9];

type FridgeDoorProps = {
  location: PantryLocation;
  onPickItem: (productId: number, itemKey: string) => void;
  onClose: () => void;
};

export const FridgeDoor = ({ location, onPickItem, onClose }: FridgeDoorProps) => {
  const notes = location.items.filter((item) => item.amount > 0);

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[radial-gradient(120%_90%_at_50%_35%,var(--scene-sky-top)_0%,var(--scene-sky-edge)_100%)] p-3 sm:p-6">
      <div className="relative mx-auto flex h-full w-full max-w-3xl flex-col rounded-[36px] border-[1.5px] border-[#E0D2B7] bg-[#F3EADB] shadow-paper dark:bg-[#4A4238]">
        <span
          aria-hidden
          className="absolute top-[22%] right-3 h-24 w-3 rounded-full bg-[#C9B79A] sm:right-4"
        />
        <span
          aria-hidden
          className="absolute top-1/2 right-3 h-36 w-3 rounded-full bg-[#C9B79A] sm:right-4"
        />
        <header className="flex items-center gap-3 border-b-[1.5px] border-[#D9CCB0] px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-border bg-card px-4 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeftIcon size={16} weight="bold" aria-hidden />
            Back to room
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-xl">{location.name} door</h2>
            <p className="text-[13px] text-muted-foreground">
              {notes.length} notes · tap one to see it
            </p>
          </div>
        </header>
        <ul className="grid flex-1 auto-rows-min grid-cols-2 gap-x-4 gap-y-6 overflow-y-auto px-4 pt-7 pb-6 sm:grid-cols-3 sm:px-8 sm:pr-12">
          {notes.map((item, index) => (
            <motion.li
              key={item.key}
              layout
              initial={{ opacity: 0, y: 10, rotate: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: NOTE_TILTS[index % NOTE_TILTS.length],
              }}
              transition={{ ...PANEL_SPRING, delay: Math.min(index, 8) * 0.03 }}
              whileHover={{ y: -3, rotate: 0 }}
            >
              <button
                type="button"
                onClick={() => onPickItem(item.productId, item.key)}
                className={`relative flex min-h-28 w-full flex-col items-start gap-1 rounded-[6px_6px_16px_6px] px-3.5 pt-5 pb-3 text-left shadow-[0_6px_14px_-8px_rgba(74,59,46,.35)] transition-transform duration-150 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${NOTE_PAPER[item.status]}`}
              >
                <span
                  aria-hidden
                  className="absolute -top-2.5 left-1/2 size-5 -translate-x-1/2 rounded-full shadow-[inset_0_-2px_0_rgba(0,0,0,.15)]"
                  style={{ backgroundColor: MAGNET_COLORS[index % MAGNET_COLORS.length] }}
                />
                <span className="font-semibold text-[#4A3B2E]">{item.name}</span>
                <span className="text-[13px] text-[#7A6654]">
                  {[item.thaiName, formatAmount(item)].filter(Boolean).join(" · ")}
                </span>
                <span className="mt-auto flex flex-wrap gap-1 pt-1">
                  <StatusChip item={item} />
                  {item.inFreezer && <FreezerTag />}
                </span>
              </button>
            </motion.li>
          ))}
          {notes.length === 0 && (
            <li className="col-span-full rounded-md border-[1.5px] border-dashed border-[#D9CCB0] px-4 py-8 text-center text-sm text-muted-foreground">
              The fridge is empty. A good excuse for a market trip.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};
