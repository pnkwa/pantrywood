"use client";

import { useRef, useState } from "react";
import { Command } from "cmdk";
import { Popover } from "radix-ui";
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { cn } from "cn";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Extra words that should find this option, e.g. a Thai name. */
  keywords?: string[];
};

// Short lists read at a glance; longer ones get a search field on top.
const SEARCH_FROM = 7;

type ComboboxProps = {
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export const Combobox = ({ value, options, onChange, placeholder = "Choose…", className }: ComboboxProps) => {
  const [open, setOpen] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const searchable = options.length >= SEARCH_FROM;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        role="combobox"
        aria-expanded={open}
        className={cn("group flex w-full min-w-0 items-center justify-between gap-2 text-left outline-none select-none", className)}
      >
        <span className={cn("min-w-0 truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <CaretDownIcon
          size={14}
          weight="bold"
          aria-hidden
          className="shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          // Without a search field, the list itself takes focus so the arrow keys work at once.
          onOpenAutoFocus={(event) => {
            if (searchable) return;
            event.preventDefault();
            commandRef.current?.focus();
          }}
          className={cn(
            "z-50 w-(--radix-popover-trigger-width) min-w-52 origin-(--radix-popover-content-transform-origin) overflow-hidden rounded-[18px] border-[1.5px] border-border bg-popover text-popover-foreground shadow-paper outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150",
            "motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[side=bottom]:slide-in-from-top-2 motion-safe:data-[side=top]:slide-in-from-bottom-2",
          )}
        >
          <Command ref={commandRef} tabIndex={-1} loop defaultValue={value} className="outline-none">
            {searchable && (
              <label className="flex items-center gap-2 border-b-[1.5px] border-border px-3.5">
                <MagnifyingGlassIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                <span className="sr-only">Search</span>
                <Command.Input
                  placeholder="Search…"
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </label>
            )}
            <Command.List className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-3rem))] overflow-y-auto overscroll-contain p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing by that name.
              </Command.Empty>
              {options.map((option) => (
                <Command.Item
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords ?? [])]}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex min-h-11 cursor-pointer items-center rounded-sm py-2 pr-9 pl-3 text-sm font-medium select-none transition-colors duration-150 ease-out data-[selected=true]:bg-muted",
                    option.value === value && "font-semibold text-status-fresh-foreground",
                  )}
                >
                  {option.label}
                  {option.value === value && (
                    <CheckIcon size={16} weight="bold" className="absolute right-3" aria-hidden />
                  )}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
