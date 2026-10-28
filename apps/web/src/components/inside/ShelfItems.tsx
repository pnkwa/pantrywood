"use client";

import { useRef, useState, type RefObject } from "react";
import { motion, type Transition } from "motion/react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { MinusIcon, PlusIcon, ProhibitIcon, SelectionBackgroundIcon, SelectionForegroundIcon } from "@phosphor-icons/react";
import type { PantryItem } from "@/lib/pantry/model";
import type { Inside } from "@/lib/inside/use-inside";
import { BACK, clampSize, MAX_SIZE, MIN_SIZE, SIZE_STEP, type ShelfSpot } from "@/lib/inside/shelf-place";
import { PANEL_SPRING } from "@/lib/motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { describeItem, StatusBadge } from "./InsideItem";
import { ItemPicture } from "./ItemPicture";

const percent = (fraction: number) => `${fraction * 100}%`;
const leftOf = (x: number, width: number) => percent(x - width / 2);

/** "left", "middle" or "right" of a shelf, for the drag tag and screen readers. */
export const sideOf = (x: number) => (x < 0.36 ? "left" : x > 0.64 ? "right" : "middle");

// A soft squash as it lands, then a springy settle (DESIGN.md section 10: transform only).
const SQUASHED = { scaleY: 0.84, scaleX: 1.12 };
const SETTLE: Transition = { type: "spring", stiffness: 520, damping: 14 };
/** At size 1 an item stands a little taller than its shelf gap, tucking behind the shelf above, like a collage. */
const STAND_HEIGHT = 1.12;
/** Back-row items peek over the front row, which always stands in front of them. */
const BACK_ROW_RAISE = "14%";
const FRONT_ROW_LAYER = 1000;

const sizeButton =
  "flex size-11 items-center justify-center rounded-full transition-colors duration-150 ease-out hover:bg-muted disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-ring";

/**
 * Make it bigger or smaller: drag the corner grip (up grows it) or use − / +. The grip previews as you drag and
 * the size is saved when you let go, so the shelf only rearranges once.
 */
const SizeControls = ({
  name,
  size,
  frame,
  onPreview,
  onResize,
  onRestack,
}: {
  name: string;
  size: number;
  /** The item's own box, to turn a drag in pixels into a size. */
  frame: RefObject<HTMLDivElement | null>;
  onPreview: (size: number | null) => void;
  onResize: (size: number) => void;
  onRestack: (direction: "front" | "back") => void;
}) => {
  const grip = useRef<{ y: number; height: number } | null>(null);
  const sizeFor = (clientY: number) => {
    const start = grip.current;
    return start ? clampSize((size * (start.height + start.y - clientY)) / start.height) : size;
  };
  return (
    <>
      <span
        role="presentation"
        onPointerDown={(event) => {
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          grip.current = { y: event.clientY, height: frame.current?.offsetHeight ?? 1 };
        }}
        onPointerMove={(event) => grip.current && onPreview(sizeFor(event.clientY))}
        onPointerUp={(event) => {
          const next = sizeFor(event.clientY);
          grip.current = null;
          onPreview(null);
          if (next !== size) onResize(next);
        }}
        onPointerCancel={() => {
          grip.current = null;
          onPreview(null);
        }}
        className="pointer-events-auto absolute -top-4 -right-4 z-20 flex size-11 cursor-ns-resize touch-none items-center justify-center"
      >
        <span className="size-4 rounded-full border-[3px] border-white bg-sage-deep shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
      </span>
      <span
        role="group"
        aria-label={`Size of ${name}`}
        className="pointer-events-auto absolute top-full left-1/2 z-20 mt-1.5 flex -translate-x-1/2 items-center rounded-full border-[1.5px] border-border bg-card p-0.5 whitespace-nowrap shadow-paper animate-in fade-in zoom-in-95 duration-150 motion-reduce:zoom-in-100"
      >
        <button type="button" aria-label="Smaller" disabled={size <= MIN_SIZE} onClick={() => onResize(size - SIZE_STEP)} className={sizeButton}>
          <MinusIcon size={14} weight="bold" aria-hidden />
        </button>
        <span className="tabular w-11 text-center text-xs font-semibold">{Math.round(size * 100)}%</span>
        <button type="button" aria-label="Bigger" disabled={size >= MAX_SIZE} onClick={() => onResize(size + SIZE_STEP)} className={sizeButton}>
          <PlusIcon size={14} weight="bold" aria-hidden />
        </button>
        <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
        <button type="button" aria-label={`Send ${name} to the back`} onClick={() => onRestack("back")} className={sizeButton}>
          <SelectionBackgroundIcon size={16} weight="bold" aria-hidden />
        </button>
        <button type="button" aria-label={`Bring ${name} to the front`} onClick={() => onRestack("front")} className={sizeButton}>
          <SelectionForegroundIcon size={16} weight="bold" aria-hidden />
        </button>
      </span>
    </>
  );
};

const ShelfItem = ({
  item,
  sectionId,
  x,
  width,
  size,
  position,
  selected,
  landed,
  onPick,
  onResize,
  onRestack,
  layer,
  back,
}: {
  item: PantryItem;
  sectionId: string;
  x: number;
  width: number;
  /** 1 = as tall as its shelf allows; you can make it smaller or bigger. */
  size: number;
  position: string;
  selected: boolean;
  /** Counts up each time it's dropped, so every landing plays again; 0 = not just dropped. */
  landed: number;
  onPick: () => void;
  onResize: (size: number) => void;
  onRestack: (direction: "front" | "back") => void;
  /** Where it stands among overlapping neighbours: higher is in front. */
  layer: number;
  /** In the shelf's back row: drawn a little higher, behind the whole front row. */
  back: boolean;
}) => {
  const reducedMotion = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? size;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.key, data: { type: "item", section: sectionId } });
  return (
    <motion.div
      ref={frame}
      layout="position"
      transition={reducedMotion ? { duration: 0 } : PANEL_SPRING}
      style={{
        left: leftOf(x, width),
        bottom: back ? BACK_ROW_RAISE : 0,
        width: percent(width),
        height: percent(STAND_HEIGHT * shown),
        zIndex: back ? layer : layer + FRONT_ROW_LAYER,
      }}
      // Only the picture itself catches a tap or a drag; the space around it belongs to the shelf.
      // Stacked by its layer, even while selected, so "send to back" shows straight away.
      className="pointer-events-none absolute flex items-end justify-center [container-type:size]"
    >
      {/* Everything hugs the picture (sized from this spot's box), so taps and drags only start on the thing itself. */}
      <span className="relative flex items-end">
        <button
          ref={setNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          onClick={onPick}
          aria-label={`${describeItem(item)}. ${position}`}
          className={`pointer-events-auto relative flex touch-none items-end justify-center rounded-[12px] outline-offset-2 transition-opacity duration-150 ease-out focus-visible:outline-3 focus-visible:outline-ring ${
            isDragging ? "opacity-30" : ""
          }`}
        >
          <motion.span
            key={landed}
            initial={landed > 0 && !reducedMotion ? SQUASHED : false}
            animate={{ scaleY: 1, scaleX: 1 }}
            transition={SETTLE}
            // Upright, like the model on the room's shelf.
            className="relative flex origin-bottom items-end justify-center"
          >
            {/* Up to a little wider than its spot (stickers tuck behind their neighbours); a wide thing gets shorter
              rather than leaving empty space above it, so the hit box is the picture (a sticker is 48 × 54). */}
          <ItemPicture item={item} sticker outlined={selected} fitsSpot className="h-[min(100cqh,152cqw)] w-auto max-w-[135cqw]" />
            <StatusBadge item={item} />
          </motion.span>
          {landed > 0 && !reducedMotion && (
            <motion.span
              key={`puff-${landed}`}
              aria-hidden
              initial={{ opacity: 0.7, scale: 0.5 }}
              animate={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="pointer-events-none absolute -bottom-1 left-1/2 h-3 w-[90%] -translate-x-1/2 rounded-full bg-[#F3EADB]"
            />
          )}
        </button>
        {selected && !isDragging && (
          <SizeControls name={item.name} size={size} frame={frame} onPreview={setPreview} onResize={onResize} onRestack={onRestack} />
        )}
      </span>
    </motion.div>
  );
};

type ShelfItemsProps = {
  inside: Inside;
  sectionId: string;
  /** Where each item stands; while dragging over this shelf, with the neighbours already slid aside. */
  spots: readonly ShelfSpot[];
  /** The key of the item being carried here: drawn as a dashed outline where it will stand, this wide. */
  ghostKey: string | null;
  ghostWidth: number;
  targeted: boolean;
  /** No room left for the carried item: says so instead of showing where it would land. */
  full: boolean;
  selectedItemKey: string | null;
  /** The item that was just dropped, and a count that goes up with every drop. */
  landed: { key: string; count: number } | null;
  onPickItem: (productId: number, itemKey: string) => void;
  className?: string;
};

/** A front-view shelf: items stand where they were put, like on a real shelf. */
export const ShelfItems = ({
  inside,
  sectionId,
  spots,
  ghostKey,
  ghostWidth,
  targeted,
  full,
  selectedItemKey,
  landed,
  onPickItem,
  className = "",
}: ShelfItemsProps) => {
  const { setNodeRef } = useDroppable({ id: sectionId, data: { type: "section" } });
  const widthOf = inside.widthsOn(sectionId);
  return (
    <div
      ref={setNodeRef}
      data-section-id={sectionId}
      aria-label={inside.label(sectionId)}
      role="group"
      className={`relative rounded-[12px] outline-2 -outline-offset-2 transition-[background-color,outline-color] duration-150 ease-out ${
        full ? "bg-honey/15 outline-dashed outline-[#C8901F]" : targeted ? "bg-sage-deep/10 outline-dashed outline-sage-deep" : "outline-transparent"
      } ${className}`}
    >
      {full && (
        <span className="absolute -top-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-status-soon px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-status-soon-foreground shadow-paper">
          <ProhibitIcon size={12} weight="bold" aria-hidden />
          Full · no room here
        </span>
      )}
      {spots.map((spot) => {
        if (spot.key === ghostKey)
          return (
            <span
              key={spot.key}
              aria-hidden
              style={{ left: leftOf(spot.x, ghostWidth), width: percent(ghostWidth) }}
              className="absolute bottom-0 h-full rounded-[12px] border-[2.5px] border-dashed border-sage-deep bg-sage-deep/10"
            />
          );
        const item = inside.itemsByKey.get(spot.key);
        return (
          item && (
            <ShelfItem
              key={spot.key}
              item={item}
              sectionId={sectionId}
              x={spot.x}
              width={widthOf(spot.key)}
              size={inside.sizeOf(spot.key)}
              position={`${inside.label(sectionId)}, ${spot.row === BACK ? "back, " : ""}${sideOf(spot.x)}`}
              selected={selectedItemKey === spot.key}
              landed={landed?.key === spot.key ? landed.count : 0}
              onPick={() => onPickItem(item.productId, spot.key)}
              onResize={(next) => inside.resize(spot.key, next)}
              onRestack={(direction) => inside.restack(spot.key, direction)}
              layer={inside.layerOf(spot.key)}
              back={spot.row === BACK}
            />
          )
        );
      })}
    </div>
  );
};
