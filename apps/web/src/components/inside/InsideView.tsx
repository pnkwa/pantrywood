"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeftIcon, DotsSixVerticalIcon, PlusIcon } from "@phosphor-icons/react";
import type { StorageKind } from "@/components/scene/types";
import type { PantryLocation } from "@/lib/pantry/model";
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
  selectedItemKey: string | null;
  onPickItem: (productId: number, itemKey: string) => void;
  onClose: () => void;
};

export const InsideView = ({ location, kind, selectedItemKey, onPickItem, onClose }: InsideViewProps) => {
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
  const targetSectionId = activeItemKey ? sectionInDraft(activeItemKey) : null;
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
    setDraft(null);
    setActiveItemKey(null);
    setActiveShelfId(null);
    setTargetNotch(null);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const data = dataOf(active.data);
    if (data.type === "shelf" && data.section) {
      setActiveShelfId(data.section);
      setSelectedSectionId(data.section);
      return;
    }
    setActiveItemKey(String(active.id));
    setDraft(new Map(inside.arranged));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
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
    inside.itemsByKey.get(String(id))?.name ?? inside.label(String(id).replace(/^shelf:/, ""));
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
      <header className="flex flex-wrap items-center gap-3">
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
            withVent={kind === "fridge"}
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

        {spec.view !== "riceBin" && (unsorted.length > 0 || targetSectionId === UNSORTED) && (
          <Unsorted inside={inside} keys={unsorted} targeted={targetSectionId === UNSORTED} selectedItemKey={selectedItemKey} onPickItem={onPickItem} />
        )}

        <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
          {activeItem && <LiftedItem item={activeItem} landing={landing(activeItem.key)} />}
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
