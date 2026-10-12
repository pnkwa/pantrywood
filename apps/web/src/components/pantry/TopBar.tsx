"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  HouseSimpleIcon,
  MagnifyingGlassIcon,
  PlantIcon,
  ReceiptIcon,
} from "@phosphor-icons/react";
import type { Pantry, PantryItem } from "@/lib/pantry/model";
import { formatAmount } from "@/lib/pantry/format";
import { QUICK_FADE } from "@/lib/motion";
import { NAV_FORWARD } from "@/lib/page-transitions";
import { StatusChip } from "./StatusChip";

const MAX_RESULTS = 6;

const matches = (item: PantryItem, query: string) =>
  item.name.toLowerCase().includes(query) ||
  (item.thaiName ?? "").includes(query);

type TopBarProps = {
  pantry: Pantry | null;
  onPickItem: (storageId: number, productId: number, itemKey: string) => void;
};

export const TopBar = ({ pantry, onPickItem }: TopBarProps) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!pantry || !trimmed) return [];
    return pantry.locations
      .flatMap((location) =>
        location.items.map((item) => ({
          item,
          storageId: location.id,
          locationName: location.name,
        })),
      )
      .filter(({ item }) => matches(item, trimmed))
      .slice(0, MAX_RESULTS);
  }, [pantry, trimmed]);

  useEffect(() => {
    const focusOnSlash = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusOnSlash);
    return () => window.removeEventListener("keydown", focusOnSlash);
  }, []);

  const pick = (item: PantryItem, storageId: number) => {
    onPickItem(storageId, item.productId, item.key);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <header className="flex flex-wrap items-center gap-3 lg:gap-4 lg:rounded-[22px] lg:border-[1.5px] lg:border-border lg:bg-card lg:px-4 lg:py-3 lg:shadow-paper">
      <div className="flex items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-[14px] bg-status-fresh text-sage-deep">
          <PlantIcon size={24} weight="duotone" aria-hidden />
        </span>
        <span className="text-[22px] font-semibold tracking-[-0.02em] lg:text-[26px]">
          Pantrywood
        </span>
      </div>

      <div className="relative order-last w-full lg:order-none lg:w-auto lg:flex-1">
        <label className="flex h-11 items-center gap-2.5 rounded-full border-[1.5px] border-border bg-card px-4 lg:bg-muted focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring">
          <MagnifyingGlassIcon
            size={18}
            className="shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="sr-only">Search pantry</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
              const first = results[0];
              if (event.key === "Enter" && first)
                pick(first.item, first.storageId);
            }}
            placeholder="Search your storage… milk, ข้าว, tissue"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            aria-controls="search-results"
            aria-expanded={results.length > 0}
            role="combobox"
            aria-autocomplete="list"
          />
          <kbd className="hidden rounded-[8px] border-[1.5px] border-border bg-card px-1.5 text-xs text-muted-foreground lg:inline">
            /
          </kbd>
        </label>
        <AnimatePresence>
          {trimmed && (
            <motion.ul
              id="search-results"
              role="listbox"
              aria-label="Search results"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={QUICK_FADE}
              className="absolute top-full right-0 left-0 z-40 mt-2 flex flex-col gap-1 rounded-lg border-[1.5px] border-border bg-popover p-1.5 shadow-paper"
            >
              {results.length === 0 && (
                <li className="px-3 py-2.5 text-sm text-muted-foreground">
                  Nothing called “{query.trim()}” in the storage room.
                </li>
              )}
              {results.map(({ item, storageId, locationName }) => (
                <li key={item.key} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => pick(item, storageId)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/40"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold">
                        {item.name}
                      </span>
                      <span className="truncate text-[13px] text-muted-foreground">
                        {[item.thaiName, locationName, formatAmount(item)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <StatusChip item={item} />
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <Link
        href="/receipts"
        transitionTypes={NAV_FORWARD}
        className="hidden h-11 items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-4 text-[15px] font-medium transition-colors duration-150 ease-out hover:bg-muted/40 lg:inline-flex"
      >
        <ReceiptIcon
          size={18}
          weight="duotone"
          className="text-muted-foreground"
          aria-hidden
        />
        Receipts
      </Link>
      <span className="hidden h-11 items-center gap-2.5 rounded-full border-[1.5px] border-border bg-card pr-4 pl-1.5 text-[15px] font-medium lg:inline-flex">
        <span className="flex size-8 items-center justify-center rounded-full bg-status-low text-status-low-foreground">
          <HouseSimpleIcon size={18} weight="duotone" aria-hidden />
        </span>
        Storage room
      </span>
    </header>
  );
};
