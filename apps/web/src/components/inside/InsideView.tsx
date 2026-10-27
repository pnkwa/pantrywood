"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useDraggable,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeftIcon, DotsSixVerticalIcon, PlusIcon, TrayIcon } from "@phosphor-icons/react";
import type { StorageKind, StoragePalette } from "@/components/scene/types";
import type { GrocyPlace, PantryItem, PantryLocation } from "@/lib/pantry/model";
import { formatAmount } from "@/lib/pantry/format";
import { PutAwayPicker, usePutAway } from "@/components/pantry/PutAwayPicker";
import { dropDestination } from "@/lib/pantry/put-away";
import { ItemIconTile } from "@/components/pantry/ItemRow";
import { UNSORTED } from "@/lib/inside/layout";
import { useInside, type Inside } from "@/lib/inside/use-inside";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { FrontView } from "./FrontView";
import { LiftedItem } from "./InsideItem";
import { RiceBinView } from "./RiceBinView";
import { SectionItems } from "./SectionItems";
import { TopDownView } from "./TopDownView";

const ADD_LABELS: Record<string, string> = {
  shelves: "Add shelf",
  dividers: "Add divider",
  bags: "Add net bag",
  baskets: "Add wire basket",
};

const HINTS: Record<string, string> = {
  front: "Drag items between shelves, drawers and bins · drag a shelf by its handle to another rail notch · items on a moved shelf go with it",
  topDown: "Drag items between compartments · every drag also has a “Move to…” list in the item's panel",
  riceBin: "Drag the gauge to count what's left · a scanned rice sack refills the bin",
};

const pill = (active: boolean) =>
  `h-11 rounded-full px-3.5 text-sm transition-colors duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
    active ? "bg-card font-semibold text-foreground shadow-[0_2px_6px_rgba(74,59,46,0.12)]" : "font-medium text-muted-foreground hover:text-foreground"
  }`;

type DragData = { type?: string; section?: string; notch?: number };

const dataOf = (data: { current?: Record<string, unknown> } | undefined): DragData => {
  const current = data?.current;
  return {
    type: typeof current?.type === "string" ? current.type : undefined,
    section: typeof current?.section === "string" ? current.section : undefined,
    notch: typeof current?.notch === "number" ? current.notch : undefined,
  };
};

// Items land on items and sections, shelves on rail notches; the pointer decides first, then distance (keyboard).
const collisionsFor: CollisionDetection = (args) => {
  const dragged = dataOf(args.active.data).type;
  const droppableContainers = args.droppableContainers.filter((container) => {
    const type = dataOf(container.data).type;
    return dragged === "shelf" ? type === "notch" : type === "item" || type === "section";
  });
  const scoped = { ...args, droppableContainers };
  const isItem = (id: UniqueIdentifier) =>
    dataOf(droppableContainers.find((container) => container.id === id)?.data).type === "item";
  const within = pointerWithin(scoped).sort((first, second) => Number(isItem(second.id)) - Number(isItem(first.id)));
  return within.length > 0 ? within : closestCenter(scoped);
};

type InsideViewProps = {
  location: PantryLocation;
  kind: StorageKind;
  /** The piece's furniture style in the room, so its inside matches; null for its own colors. */
  palette: StoragePalette | null;
  selectedItemKey: string | null;
  onPickItem: (productId: number, itemKey: string) => void;
  onClose: () => void;
  /** Stock waiting in "To put away", and where it can go (this piece first). */
  waiting: readonly PantryItem[];
  destinations: readonly GrocyPlace[];
};

export const InsideView = ({
  location,
  kind,
  palette,
  selectedItemKey,
  onPickItem,
  onClose,
  waiting,
  destinations,
}: InsideViewProps) => {
  const inside = useInside(location, kind);
  const { spec } = inside;
  const reducedMotion = useReducedMotion();
  const [tabId, setTabId] = useState(spec.tabs[0]?.id ?? "main");
  const [editing, setEditing] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Map<string, string[]> | null>(null);
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);
  const [activeShelfId, setActiveShelfId] = useState<string | null>(null);
  const [targetNotch, setTargetNotch] = useState<number | null>(null);
  // A "To put away" card being dragged in from outside the piece, and the part it's over.
  const [waitingKey, setWaitingKey] = useState<string | null>(null);
  const [waitingTarget, setWaitingTarget] = useState<string | null>(null);
  const { putIn } = usePutAway();
  const tab = spec.tabs.find((candidate) => candidate.id === tabId) ?? spec.tabs[0];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const arranged = draft ?? inside.arranged;
  const keysFor = (sectionId: string) => arranged.get(sectionId) ?? [];
  const sectionInDraft = (key: UniqueIdentifier) =>
    [...arranged].find(([, keys]) => keys.includes(String(key)))?.[0] ?? null;
  const activeItem = activeItemKey ? inside.itemsByKey.get(activeItemKey) : undefined;
  const allowed = new Set(activeItem ? inside.destinationsFor(activeItem).map((destination) => destination.id) : []);
  allowed.add(UNSORTED);
  const waitingItem = waiting.find((item) => item.key === waitingKey);
  const targetSectionId = waitingKey ? waitingTarget : activeItemKey ? sectionInDraft(activeItemKey) : null;
  const landing = (key: string) => {
    const sectionId = sectionInDraft(key);
    if (!sectionId) return "";
    const slot = keysFor(sectionId).indexOf(key) + 1;
    return sectionId === UNSORTED ? "Unsorted" : `${inside.label(sectionId)} · slot ${slot}`;
  };

  const sectionUnder = (over: DragOverEvent["over"]) => {
    if (!over) return null;
    const data = dataOf(over.data);
    if (data.type === "section") return String(over.id);
    return data.section ?? sectionInDraft(over.id);
  };

  const reset = () => {
    setWaitingKey(null);
    setWaitingTarget(null);
    setDraft(null);
    setActiveItemKey(null);
    setActiveShelfId(null);
    setTargetNotch(null);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const data = dataOf(active.data);
    if (data.type === "waiting") {
      setWaitingKey(String(active.id).replace(/^waiting:/, ""));
      return;
    }
    if (data.type === "shelf" && data.section) {
      setActiveShelfId(data.section);
      setSelectedSectionId(data.section);
      return;
    }
    setActiveItemKey(String(active.id));
    setDraft(new Map(inside.arranged));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (waitingKey) {
      const sectionId = sectionUnder(over);
      setWaitingTarget(sectionId === UNSORTED ? null : sectionId);
      return;
    }
    if (activeShelfId) {
      setTargetNotch(over ? (dataOf(over.data).notch ?? null) : null);
      return;
    }
    const key = String(active.id);
    const from = sectionInDraft(key);
    const to = sectionUnder(over);
    if (!draft || !from || !to || from === to || !allowed.has(to) || !over) return;
    const next = new Map(draft);
    next.set(from, (next.get(from) ?? []).filter((candidate) => candidate !== key));
    const target = [...(next.get(to) ?? [])];
    const overIndex = target.indexOf(String(over.id));
    target.splice(overIndex === -1 ? target.length : overIndex, 0, key);
    next.set(to, target);
    setDraft(next);
  };

  // Saves the spot first (for the key it will have here), then moves the stock in Grocy, so it lands where it was dropped.
  const dropWaiting = (item: PantryItem, sectionId: string, overId: string | undefined) => {
    const tabId = inside.layout.sections.find((section) => section.id === sectionId)?.tab;
    const zone = spec.tabs.find((candidate) => candidate.id === tabId)?.zone ?? "main";
    const destinationId = dropDestination({
      zone,
      locationId: location.id,
      locationIsFreezer: location.isFreezer,
      freezerId: destinations.find((place) => place.isFreezer)?.id ?? null,
    });
    const destination = destinations.find((place) => place.id === destinationId);
    if (!destination) return;
    const keys = keysFor(sectionId);
    const overIndex = overId === undefined ? -1 : keys.indexOf(overId);
    const key = `${destination.id}-${item.productId}`;
    inside.place(key, sectionId, overIndex === -1 ? keys.length : overIndex);
    putIn(item, destination, () => onPickItem(item.productId, key));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (waitingKey) {
      const sectionId = sectionUnder(over);
      if (waitingItem && sectionId && sectionId !== UNSORTED) dropWaiting(waitingItem, sectionId, over ? String(over.id) : undefined);
      return reset();
    }
    if (activeShelfId) {
      if (targetNotch !== null) inside.moveShelf(activeShelfId, targetNotch);
      return reset();
    }
    const key = String(active.id);
    const sectionId = sectionInDraft(key);
    if (over && sectionId) {
      const keys = keysFor(sectionId);
      const from = keys.indexOf(key);
      const overIndex = keys.indexOf(String(over.id));
      // A move to another part already put the item at its slot (the one the tag showed); only a reorder moves it again.
      const to = overIndex === -1 || sectionId !== inside.sectionOf(key) ? from : overIndex;
      inside.place(key, sectionId, arrayMove([...keys], from, to).indexOf(key));
    }
    reset();
  };

  const nameOf = (id: UniqueIdentifier) =>
    inside.itemsByKey.get(String(id))?.name ??
    waiting.find((item) => `waiting:${item.key}` === String(id))?.name ??
    inside.label(String(id).replace(/^shelf:/, ""));
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const notch = over ? dataOf(over.data).notch : undefined;
      if (notch !== undefined) return `${nameOf(active.id)} is over notch ${notch + 1}.`;
      return over ? `${nameOf(active.id)} is over ${landing(String(active.id)) || nameOf(over.id)}.` : undefined;
    },
    onDragEnd: ({ active }) => `${nameOf(active.id)} put down.`,
    onDragCancel: ({ active }) => `${nameOf(active.id)} put back where it was.`,
  };

  const unsorted = keysFor(UNSORTED);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
      <header className="flex flex-wrap items-center gap-3 max-lg:-order-2">
        <button
          type="button"
          onClick={onClose}
          aria-label={kind === "fridge" && !location.isFreezer ? "Close the door and go back to the room" : "Back to the room"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-card transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeftIcon size={18} weight="bold" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13px] text-muted-foreground">Storage room / {location.name}</span>
          <h2 className="truncate text-xl sm:text-2xl">{spec.title}</h2>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {spec.tabs.length > 1 && (
            <div role="tablist" aria-label={`Part of the ${location.name}`} className="flex gap-1 rounded-full border-[1.5px] border-border bg-muted p-1">
              {spec.tabs.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  role="tab"
                  aria-selected={candidate.id === tab?.id}
                  onClick={() => {
                    setTabId(candidate.id);
                    setSelectedSectionId(null);
                  }}
                  className={pill(candidate.id === tab?.id)}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          )}
          {spec.view !== "riceBin" && (
            <div role="group" aria-label="Edit mode" className="flex gap-1 rounded-full border-[1.5px] border-border bg-muted p-1">
              <button type="button" aria-pressed={!editing} onClick={() => setEditing(false)} className={pill(!editing)}>
                Items
              </button>
              <button type="button" aria-pressed={editing} onClick={() => setEditing(true)} className={pill(editing)}>
                Items + {spec.editWord}
              </button>
            </div>
          )}
          {editing && tab && (
            <button
              type="button"
              onClick={() => inside.addSection(tab.id)}
              className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-dashed border-[#C8901F] bg-[#FFF6E2] px-3.5 text-sm font-semibold text-[#6B4A0E] transition-colors duration-150 ease-out hover:bg-[#FBEBC8] animate-in fade-in focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <PlusIcon size={16} weight="bold" aria-hidden />
              {ADD_LABELS[spec.editWord]}
            </button>
          )}
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionsFor}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={reset}
        accessibility={{ announcements }}
      >
        {tab && spec.view === "front" && (
          <FrontView
            inside={inside}
            tab={tab}
            editing={editing}
            keysFor={keysFor}
            targetSectionId={targetSectionId}
            targetNotch={targetNotch}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
            selectedItemKey={selectedItemKey}
            onPickItem={onPickItem}
            kind={kind}
            palette={palette}
          />
        )}
        {tab && spec.view === "topDown" && (
          <TopDownView
            inside={inside}
            tab={tab}
            editing={editing}
            keysFor={keysFor}
            targetSectionId={targetSectionId}
            selectedItemKey={selectedItemKey}
            onPickItem={onPickItem}
          />
        )}
        {spec.view === "riceBin" && <RiceBinView inside={inside} onPickItem={onPickItem} />}

        {waiting.length > 0 && (
          <ToPutAway
            waiting={waiting}
            destinations={destinations}
            here={destinations.find((place) => place.id === location.id)}
            // Put here: pick it out on the shelf, so you see where it landed.
            onPut={(productId, destinationId) => {
              if (destinationId === location.id) onPickItem(productId, `${location.id}-${productId}`);
            }}
          />
        )}

        {spec.view !== "riceBin" && (unsorted.length > 0 || targetSectionId === UNSORTED) && (
          <Unsorted inside={inside} keys={unsorted} targeted={targetSectionId === UNSORTED} selectedItemKey={selectedItemKey} onPickItem={onPickItem} />
        )}

        <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
          {activeItem && <LiftedItem item={activeItem} landing={landing(activeItem.key)} />}
          {waitingItem && <LiftedItem item={waitingItem} landing={waitingTarget ? inside.label(waitingTarget) : "a shelf"} />}
          {activeShelfId && (
            <span className="flex h-11 w-9 items-center justify-center rounded-[12px] border-2 border-[#C8901F] bg-card text-muted-foreground shadow-[0_12px_20px_-8px_rgba(74,59,46,0.5)]">
              <DotsSixVerticalIcon size={18} weight="bold" aria-hidden />
            </span>
          )}
        </DragOverlay>
      </DndContext>

      <p className="text-[13px] text-muted-foreground max-sm:hidden">{HINTS[spec.view]}</p>
    </div>
  );
};

const ToPutAway = ({
  waiting,
  destinations,
  here,
  onPut,
}: {
  waiting: readonly PantryItem[];
  destinations: readonly GrocyPlace[];
  here: GrocyPlace | undefined;
  onPut: (productId: number, destinationId: number) => void;
}) => (
  // Phones show it above the piece: below, the bottom bar would hide it.
  <section aria-label="To put away" className="flex flex-col gap-2 max-lg:-order-1 rounded-[18px] border-[1.5px] border-honey bg-status-soon/60 p-2.5 animate-in fade-in duration-200">
    <span className="flex items-center gap-1.5 px-1 text-xs font-semibold text-status-soon-foreground">
      <TrayIcon size={14} weight="bold" aria-hidden />
      To put away · {waiting.length} {waiting.length === 1 ? "item" : "items"}
      <span className="font-medium max-sm:hidden">· drag onto a shelf, or tap Put here</span>
    </span>
    <ul className="flex flex-wrap gap-2">
      {waiting.map((item) => (
        <WaitingCard key={item.key} item={item}>
          <PutAwayPicker item={item} destinations={destinations} here={here} onPut={(destinationId) => onPut(item.productId, destinationId)} />
        </WaitingCard>
      ))}
    </ul>
  </section>
);

/** The picture and name are the drag handle; the buttons beside them do the same without dragging. */
const WaitingCard = ({ item, children }: { item: PantryItem; children: ReactNode }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `waiting:${item.key}`, data: { type: "waiting" } });
  return (
    <li
      className={`flex min-w-0 flex-wrap items-center gap-2.5 rounded-[16px] border-[1.5px] border-border bg-card p-1.5 transition-opacity max-sm:w-full animate-in fade-in zoom-in-95 duration-200 motion-reduce:zoom-in-100 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-roledescription="draggable item"
        aria-label={`Drag ${item.name} onto a shelf`}
        className="flex min-w-32 flex-1 cursor-grab touch-none items-center gap-2.5 rounded-[12px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
      >
        <ItemIconTile item={item} shared={false} />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{item.name}</span>
          <span className="tabular text-xs text-muted-foreground">{formatAmount(item)}</span>
        </span>
      </span>
      {children}
    </li>
  );
};

const Unsorted = ({
  inside,
  keys,
  targeted,
  selectedItemKey,
  onPickItem,
}: {
  inside: Inside;
  keys: readonly string[];
  targeted: boolean;
  selectedItemKey: string | null;
  onPickItem: (productId: number, itemKey: string) => void;
}) => (
  <section aria-label="Unsorted" className="flex flex-col gap-1 rounded-[18px] border-[1.5px] border-dashed border-border bg-card/70 p-2 animate-in fade-in duration-200">
    <span className="px-1 text-xs font-semibold text-muted-foreground">Unsorted · drag onto a shelf</span>
    <SectionItems
      inside={inside}
      sectionId={UNSORTED}
      keys={keys}
      look="lying"
      targeted={targeted}
      selectedItemKey={selectedItemKey}
      onPickItem={onPickItem}
      className="flex min-h-16 flex-wrap gap-2 p-1"
    />
  </section>
);
