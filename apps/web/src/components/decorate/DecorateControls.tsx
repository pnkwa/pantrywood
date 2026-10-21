"use client";

import { useState } from "react";
import { Popover } from "radix-ui";
import {
  ArchiveIcon,
  ArrowArcLeftIcon,
  ArrowClockwiseIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsOutCardinalIcon,
  ArrowUpIcon,
  ArrowsLeftRightIcon,
  BroomIcon,
  CheckIcon,
  type Icon,
  PaletteIcon,
} from "@phosphor-icons/react";
import type { CatalogItem } from "@/data/catalog";
import type { GridCell } from "@/lib/room/grid";
import { CatalogThumb } from "./CatalogThumb";

const PILL_BUTTON =
  "flex h-11 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150 ease-out disabled:opacity-40";

type DecorateBarProps = {
  canUndo: boolean;
  onUndo: () => void;
  canClear: boolean;
  onClear: () => void;
  onDone: () => void;
};

export const DecorateBar = ({ canUndo, onUndo, canClear, onClear, onDone }: DecorateBarProps) => (
  <div className="absolute inset-x-4 top-4 z-30 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:slide-in-from-top-0">
    <span className="flex min-h-11 flex-col justify-center rounded-full border-[1.5px] border-border bg-card px-4 leading-tight shadow-paper">
      <span className="text-[11px] font-semibold text-status-soon-foreground">Decorate mode</span>
      <span className="text-sm font-semibold">Storage room</span>
    </span>
    <span className="ml-auto flex gap-1 rounded-full border-[1.5px] border-border bg-card p-1 shadow-paper">
      <button type="button" disabled={!canUndo} onClick={onUndo} className={`${PILL_BUTTON} hover:bg-muted/40`}>
        <ArrowArcLeftIcon size={18} weight="bold" aria-hidden />
        <span className="max-sm:sr-only">Undo</span>
      </button>
      <button type="button" disabled={!canClear} onClick={onClear} className={`${PILL_BUTTON} enabled:hover:bg-muted/40`}>
        <BroomIcon size={18} weight="duotone" aria-hidden />
        <span className="max-sm:sr-only">Clear room</span>
      </button>
      <button type="button" onClick={onDone} className={`${PILL_BUTTON} bg-sage-deep text-primary-foreground hover:bg-sage-deep/85`}>
        <CheckIcon size={18} weight="bold" aria-hidden />
        Done
      </button>
    </span>
  </div>
);

const ToolButton = ({
  label,
  icon: ToolIcon,
  onClick,
  disabled,
  title,
}: {
  label: string;
  icon: Icon;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    aria-label={label}
    title={title ?? label}
    disabled={disabled}
    onClick={onClick}
    className="flex size-11 items-center justify-center rounded-full transition-colors duration-150 ease-out enabled:hover:bg-muted/40 disabled:opacity-40"
  >
    <ToolIcon size={20} weight="duotone" aria-hidden />
  </button>
);

const NUDGES: { label: string; icon: Icon; delta: GridCell }[] = [
  { label: "Move back", icon: ArrowUpIcon, delta: [0, -1] },
  { label: "Move left", icon: ArrowLeftIcon, delta: [-1, 0] },
  { label: "Move right", icon: ArrowRightIcon, delta: [1, 0] },
  { label: "Move forward", icon: ArrowDownIcon, delta: [0, 1] },
];

const WALL_NUDGE_LABELS: Record<string, string> = { "Move back": "Move up", "Move forward": "Move down" };

type PieceToolbarProps = {
  name: string;
  /** Storage holds a Grocy location: it can be repainted, and putting it away asks first. */
  isStorage: boolean;
  swapOptions: CatalogItem[];
  currentItemId: string | null;
  owned: readonly string[];
  canMove: boolean;
  /** Wall pieces move up and down instead of back and forward. */
  onWall: boolean;
  moving: boolean;
  onSwap: (itemId: string) => void;
  onRotate: () => void;
  onSwitchWall: () => void;
  onToggleMove: () => void;
  onNudge: (delta: GridCell) => void;
  onPutAway: () => void;
};

export const PieceToolbar = ({
  name,
  isStorage,
  swapOptions,
  currentItemId,
  owned,
  canMove,
  onWall,
  moving,
  onSwap,
  onRotate,
  onSwitchWall,
  onToggleMove,
  onNudge,
  onPutAway,
}: PieceToolbarProps) => {
  const [swapOpen, setSwapOpen] = useState(false);
  return (
    <div
      role="toolbar"
      aria-label={`Selected: ${name}`}
      className="absolute top-20 left-1/2 z-30 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200 motion-reduce:zoom-in-100"
    >
      <div className="flex items-center gap-0.5 rounded-full border-[1.5px] border-[#C8901F] bg-card p-1 shadow-paper">
        <span className="flex max-w-24 flex-col px-3 leading-tight sm:max-w-40">
          {moving && <span className="text-[11px] font-semibold text-status-soon-foreground">Moving · tap the floor</span>}
          <span className="truncate text-[13px] font-semibold">{name}</span>
        </span>
        {moving ? (
          <>
            {NUDGES.map((nudge) => (
              <ToolButton
                key={nudge.label}
                label={onWall ? (WALL_NUDGE_LABELS[nudge.label] ?? nudge.label) : nudge.label}
                icon={nudge.icon}
                onClick={() => onNudge(nudge.delta)}
              />
            ))}
            <button
              type="button"
              onClick={onToggleMove}
              className={`${PILL_BUTTON} bg-sage-deep text-primary-foreground hover:bg-sage-deep/85 max-sm:w-11 max-sm:px-0`}
            >
              <CheckIcon size={18} weight="bold" aria-hidden />
              <span className="max-sm:sr-only">Place</span>
            </button>
          </>
        ) : (
          <>
            {isStorage && (
              <Popover.Root open={swapOpen} onOpenChange={setSwapOpen}>
                <Popover.Trigger
                  disabled={swapOptions.length < 2}
                  title={swapOptions.length < 2 ? "No other styles for this piece yet" : undefined}
                  className={`${PILL_BUTTON} bg-status-soon text-status-soon-foreground enabled:hover:bg-status-soon/70 max-sm:w-11 max-sm:px-0`}
                >
                  <PaletteIcon size={18} weight="duotone" aria-hidden />
                  <span className="max-sm:sr-only">Swap style</span>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    sideOffset={8}
                    collisionPadding={12}
                    className="z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-[18px] border-[1.5px] border-border bg-popover p-2 shadow-paper outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95"
                  >
                    <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">Same Grocy location and stock, new look.</p>
                    <ul className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto">
                      {swapOptions.map((option) => {
                        const current = option.id === currentItemId;
                        return (
                          <li key={option.id}>
                            <button
                              type="button"
                              aria-pressed={current}
                              onClick={() => {
                                onSwap(option.id);
                                setSwapOpen(false);
                              }}
                              className={`flex w-full flex-col gap-1 rounded-[14px] border-[1.5px] p-1.5 text-left transition-colors duration-150 ease-out hover:bg-muted/40 ${
                                current ? "border-[#C8901F] bg-status-soon/60" : "border-border"
                              }`}
                            >
                              <CatalogThumb item={option} />
                              <span className="line-clamp-2 px-1 text-xs leading-tight font-semibold">{option.name}</span>
                              <span className="px-1 text-[11px] font-semibold text-muted-foreground">
                                {current ? "In room" : owned.includes(option.id) ? "Owned" : `${option.price} leaves`}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
            {onWall ? (
              <ToolButton label="Move to the other wall" icon={ArrowsLeftRightIcon} onClick={onSwitchWall} />
            ) : (
              <ToolButton label="Rotate" icon={ArrowClockwiseIcon} onClick={onRotate} disabled={!canMove} />
            )}
            <ToolButton label="Move" icon={ArrowsOutCardinalIcon} onClick={onToggleMove} disabled={!canMove} />
            <ToolButton label="Put away" icon={ArchiveIcon} onClick={onPutAway} />
          </>
        )}
      </div>
    </div>
  );
};
