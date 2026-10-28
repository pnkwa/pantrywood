"use client";

import type { ReactNode } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ArrowDownIcon, CheckCircleIcon, MapPinIcon, TrayIcon, XIcon } from "@phosphor-icons/react";
import { UNSORTED } from "@/lib/inside/layout";
import type { ItemRow } from "@/lib/pantry/put-away";
import { usePutAway } from "@/components/pantry/PutAwayPicker";
import { formatAmount } from "@/lib/pantry/format";
import type { GrocyPlace, PantryItem } from "@/lib/pantry/model";
import { StatusBadge } from "./InsideItem";
import { ItemPicture } from "./ItemPicture";

type TileProps = {
  item: PantryItem;
  /** dnd-kit id: `waiting:<key>` for stock to put away, `tray:<key>` for something already in this piece. */
  dragId: string;
  waiting: boolean;
  /** The button alternative to dragging. */
  action?: ReactNode;
};

/** One thing in the tray, like an inventory slot: drag its picture onto a shelf. */
const Tile = ({ item, dragId, waiting, action }: TileProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    // Brought in from outside the piece (waiting, or kept elsewhere) is moved in Grocy when it lands.
    data: { type: dragId.startsWith("waiting:") ? "waiting" : "tray", key: item.key },
  });
  return (
    <li
      className={`group flex min-w-0 flex-col items-center gap-1.5 rounded-[18px] border-[1.5px] p-2 pb-2.5 transition-[opacity,transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-paper motion-reduce:hover:translate-y-0 ${
        waiting ? "border-honey bg-status-soon/50" : "border-border bg-[#FFFDF8] dark:bg-card"
      } ${isDragging ? "opacity-35" : ""}`}
    >
      <span
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-roledescription="draggable item"
        aria-label={`Drag ${item.name} onto a shelf`}
        className="relative flex h-20 w-full cursor-grab touch-none items-end justify-center rounded-[14px] bg-[radial-gradient(ellipse_at_50%_88%,rgba(74,59,46,0.12)_0_28%,transparent_30%)] focus-visible:outline-3 focus-visible:outline-ring active:cursor-grabbing"
      >
        <span className="relative flex h-[88%] items-end transition-transform duration-150 ease-out group-hover:-rotate-3 motion-reduce:group-hover:rotate-0">
          <ItemPicture item={item} sticker className="h-full w-auto max-w-full" />
          <StatusBadge item={item} />
        </span>
      </span>
      <span className="w-full truncate text-center text-[13px] leading-tight font-semibold">{item.name}</span>
      <span className="tabular -mt-1 text-xs text-muted-foreground">{formatAmount(item)}</span>
      {action}
    </li>
  );
};

const smallButton =
  "flex h-11 w-full items-center justify-center gap-1 rounded-full text-xs font-semibold transition-colors duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

const Group = ({ title, icon, count, children }: { title: string; icon?: ReactNode; count: number; children: ReactNode }) => (
  <section aria-label={title} className="flex flex-col gap-2">
    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      {icon}
      {title} · {count}
    </h3>
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">{children}</ul>
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
  onClose: () => void;
  /** What ✕ does: leaves the piece from the side panel, only shuts the drawer on phones. */
  closeLabel: string;
};

/** The side panel while a piece is open: an inventory of things to drag onto its shelves. */
export const InsideTray = ({ pieceName, waiting, here, loose, elsewhere, onPut, onPickItem, onClose, closeLabel }: InsideTrayProps) => {
  const { putIn, busy } = usePutAway();
  // The whole tray takes things back off their shelves: "Not on a shelf", still kept in this piece.
  const { setNodeRef, isOver } = useDroppable({ id: UNSORTED, data: { type: "section" } });
  const toPlace = waiting.length + loose.length;
  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-0 flex-col gap-3 rounded-[18px] outline-2 outline-offset-4 transition-[outline-color] duration-150 ease-out ${
        isOver ? "outline-dashed outline-sage-deep" : "outline-transparent"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 className="text-[22px]">Item tray</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {toPlace > 0 ? `Drag things onto the ${pieceName}'s shelves, or back here` : "Nothing left to place"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <XIcon size={18} weight="bold" aria-hidden />
        </button>
      </div>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-1">
        {waiting.length > 0 && (
          <Group title="To put away" count={waiting.length} icon={<TrayIcon size={14} weight="bold" aria-hidden className="text-status-soon-foreground" />}>
            {waiting.map((item) => (
              <Tile
                key={item.key}
                item={item}
                dragId={`waiting:${item.key}`}
                waiting
                action={
                  here && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => putIn(item, here, () => onPut(item))}
                      aria-label={`Put ${item.name} in the ${pieceName}`}
                      className={`${smallButton} bg-sage-deep text-primary-foreground hover:bg-sage-deep/85`}
                    >
                      <ArrowDownIcon size={13} weight="bold" aria-hidden />
                      Put here
                    </button>
                  )
                }
              />
            ))}
          </Group>
        )}
        {loose.length > 0 && (
          <Group title="Not on a shelf" count={loose.length}>
            {loose.map((item) => (
              <Tile
                key={item.key}
                item={item}
                dragId={`tray:${item.key}`}
                waiting={false}
                action={
                  <button type="button" onClick={() => onPickItem(item)} className={`${smallButton} border-[1.5px] border-border bg-card hover:bg-muted/40`}>
                    Choose a spot
                  </button>
                }
              />
            ))}
          </Group>
        )}
        {toPlace === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-border px-4 py-8 text-center">
            <CheckCircleIcon size={32} weight="duotone" aria-hidden className="text-status-fresh-foreground" />
            <p className="font-semibold">All put away</p>
            <p className="text-sm text-muted-foreground">
              New things you scan or read from a receipt show up here. Drag things on the shelves to move them.
            </p>
          </div>
        )}
        {elsewhere.length > 0 && (
          <Group title="In other storage · drag to move here" count={elsewhere.length}>
            {elsewhere.map(({ item, place }) => (
              <Tile
                key={item.key}
                item={item}
                dragId={`waiting:${item.key}`}
                waiting={false}
                action={
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-status-fresh px-2 py-0.5 text-[11px] font-semibold text-status-fresh-foreground">
                    <MapPinIcon size={11} weight="bold" aria-hidden className="shrink-0" />
                    <span className="truncate">{place}</span>
                  </span>
                }
              />
            ))}
          </Group>
        )}
      </div>
    </div>
  );
};
