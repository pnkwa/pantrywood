"use client";

import type { ReactNode } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ArrowDownIcon, CheckCircleIcon, MapPinIcon } from "@phosphor-icons/react";
import { UNSORTED } from "@/lib/inside/layout";
import type { ItemRow } from "@/lib/pantry/put-away";
import { usePutAway } from "@/components/pantry/PutAwayPicker";
import { formatAmount } from "@/lib/pantry/format";
import type { GrocyPlace, PantryItem } from "@/lib/pantry/model";
import { StatusBadge } from "./InsideItem";
import { ItemPicture } from "./ItemPicture";

// The room's chunky wood caps (DESIGN.md section 7): the bar reads as part of the diorama, not a web panel.
const WOOD = "#B88A5F";
const WOOD_SIDE = "#8C6440";

/** How much is in a slot, short enough for its corner badge (the full amount is in its label). */
const countOf = (item: PantryItem) => (Number.isInteger(item.amount) ? String(item.amount) : item.amount.toFixed(1));

type SlotProps = {
  item: PantryItem;
  /** dnd-kit id: `waiting:<key>` for stock brought in from outside the piece, `tray:<key>` for this piece's own. */
  dragId: string;
  /** Waiting to be put away: a honey slot, like a new item in a game inventory. */
  fresh: boolean;
  /** Where it is now, for things kept in other storage. */
  place?: string;
  /** The button alternative to dragging: an icon, what it does, and the handler. */
  action: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean } | null;
};

/** One inventory slot: drag its picture onto a shelf, or use its corner button. */
const Slot = ({ item, dragId, fresh, place, action }: SlotProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    // Brought in from outside the piece (waiting, or kept elsewhere) is moved in Grocy when it lands.
    data: { type: dragId.startsWith("waiting:") ? "waiting" : "tray", key: item.key },
  });
  const label = `${item.name}, ${formatAmount(item)}${place ? `, in the ${place}` : ""}`;
  return (
    <li className={`relative shrink-0 transition-opacity duration-150 ${isDragging ? "opacity-35" : ""}`}>
      <span
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-roledescription="draggable item"
        aria-label={`Drag ${label} onto a shelf`}
        title={label}
        className={`group relative flex size-[84px] cursor-grab touch-none items-end justify-center rounded-[18px] p-2 pb-2.5 shadow-[inset_0_3px_0_rgba(74,59,46,0.14)] transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing motion-reduce:hover:translate-y-0 ${
          fresh ? "bg-status-soon ring-2 ring-honey" : "bg-[#FFF8EC] dark:bg-card"
        }`}
      >
        <span className="relative flex h-full items-end transition-transform duration-150 ease-out group-hover:-rotate-3 motion-reduce:group-hover:rotate-0">
          <ItemPicture item={item} sticker className="h-full w-auto max-w-full" />
          <StatusBadge item={item} />
        </span>
        <span aria-hidden className="tabular absolute top-1 left-1.5 rounded-full bg-[#4A3B2E]/80 px-1.5 text-[11px] leading-[18px] font-semibold text-[#FFF8EC]">
          {countOf(item)}
        </span>
      </span>
      {action && (
        // A 44 px target around a smaller round button, overlapping the slot's corner like a game action key.
        <button
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          aria-label={`${action.label}: ${item.name}`}
          title={action.label}
          className="absolute -right-2.5 -bottom-2.5 flex size-11 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-ring disabled:opacity-60"
        >
          <span className="flex size-8 items-center justify-center rounded-full border-2 border-[#FFF8EC] bg-sage-deep text-primary-foreground shadow-paper transition-transform duration-150 ease-out hover:scale-110 motion-reduce:hover:scale-100">
            {action.icon}
          </span>
        </button>
      )}
    </li>
  );
};

const Group = ({ title, count, children }: { title: string; count: number; children: ReactNode }) => (
  <section aria-label={`${title}, ${count}`} className="flex shrink-0 flex-col gap-1.5">
    <h3 className="w-fit rounded-full bg-[#FFF8EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#4A3B2E]">
      {title} · {count}
    </h3>
    <ul className="flex gap-3 pr-2.5 pb-2.5">{children}</ul>
  </section>
);

type InsideTrayProps = {
  pieceName: string;
  /** Stock waiting in "To put away", and this piece as a Grocy place to put it in. */
  waiting: readonly PantryItem[];
  here: GrocyPlace | undefined;
  /** In this piece but on no shelf yet. */
  loose: readonly PantryItem[];
  /** Kept in other storage pieces, with where: dragging one in moves it here. */
  elsewhere: readonly ItemRow<PantryItem>[];
  onPut: (item: PantryItem) => void;
  onPickItem: (item: PantryItem) => void;
};

/**
 * The open piece's inventory hotbar, like a cozy decorating game: everything that can go on its shelves, in slots
 * you drag from. Dropping an item from a shelf back on it takes it off its shelf.
 */
export const InsideTray = ({ pieceName, waiting, here, loose, elsewhere, onPut, onPickItem }: InsideTrayProps) => {
  const { putIn, busy } = usePutAway();
  const { setNodeRef, isOver } = useDroppable({ id: UNSORTED, data: { type: "section" } });
  const moveHere = (item: PantryItem, label: string) =>
    here ? { icon: <ArrowDownIcon size={15} weight="bold" aria-hidden />, label, disabled: busy, onClick: () => putIn(item, here, () => onPut(item)) } : null;
  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label="Item tray"
      // Items dragged out of the 3D view drop here too (see `trayAt`).
      data-tray-drop
      style={{ background: WOOD, boxShadow: `0 5px 0 ${WOOD_SIDE}, 0 14px 24px -12px rgba(74,59,46,0.45)` }}
      className={`relative shrink-0 rounded-[22px] px-3 pt-2.5 outline-3 outline-offset-3 transition-[outline-color] duration-150 ease-out data-[drop-over]:outline-dashed data-[drop-over]:outline-sage-deep ${
        isOver ? "outline-dashed outline-sage-deep" : "outline-transparent"
      }`}
    >
      <div className="flex gap-5 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        {waiting.length > 0 && (
          <Group title="To put away" count={waiting.length}>
            {waiting.map((item) => (
              <Slot key={item.key} item={item} dragId={`waiting:${item.key}`} fresh action={moveHere(item, `Put in the ${pieceName}`)} />
            ))}
          </Group>
        )}
        {loose.length > 0 && (
          <Group title="Not on a shelf" count={loose.length}>
            {loose.map((item) => (
              <Slot
                key={item.key}
                item={item}
                dragId={`tray:${item.key}`}
                fresh={false}
                action={{ icon: <MapPinIcon size={15} weight="bold" aria-hidden />, label: "Choose a spot", onClick: () => onPickItem(item) }}
              />
            ))}
          </Group>
        )}
        {waiting.length + loose.length === 0 && (
          <p className="flex shrink-0 items-center gap-2 self-center rounded-full bg-[#FFF8EC] px-3.5 py-2 text-sm font-semibold text-[#4A3B2E]">
            <CheckCircleIcon size={18} weight="duotone" aria-hidden className="text-status-fresh-foreground" />
            All put away
          </p>
        )}
        {elsewhere.length > 0 && (
          <Group title="In other storage" count={elsewhere.length}>
            {elsewhere.map(({ item, place }) => (
              <Slot key={item.key} item={item} dragId={`waiting:${item.key}`} fresh={false} place={place ?? undefined} action={moveHere(item, `Move to the ${pieceName}`)} />
            ))}
          </Group>
        )}
      </div>
    </div>
  );
};
