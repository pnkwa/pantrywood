"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { PANEL_SPRING } from "@/lib/motion";
import { InsideTray } from "./InsideTray";
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
  type DragMoveEvent,
  type DragOverEvent,
  type KeyboardCoordinateGetter,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeftIcon, DotsSixVerticalIcon, PlusIcon } from "@phosphor-icons/react";
import type { StorageKind, StoragePalette } from "@/components/scene/types";
import type { GrocyPlace, PantryItem, PantryLocation } from "@/lib/pantry/model";
import { usePutAway } from "@/components/pantry/PutAwayPicker";
import { dropDestination, type ItemRow } from "@/lib/pantry/put-away";
import { sideOf } from "./ShelfItems";
import { UNSORTED } from "@/lib/inside/layout";
import { useInside } from "@/lib/inside/use-inside";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { pickScene, type ScenePick } from "@/lib/inside/scene-pick";
import { trayAt } from "@/lib/inside/tray-drop";
import { Inside3dView, opensIn3d } from "./Inside3dView";
import { FrontView } from "./FrontView";
import { LiftedItem } from "./InsideItem";
import { RiceBinView } from "./RiceBinView";
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
  `relative h-11 rounded-full px-3.5 text-sm transition-colors duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
    active ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
  }`;

/** A pill's label, with the indicator that slides under whichever option is on (one `layoutId` per switch). */
const PillLabel = ({ active, indicator, reducedMotion, children }: { active: boolean; indicator: string; reducedMotion: boolean; children: ReactNode }) => (
  <>
    {active && (
      <motion.span
        layoutId={indicator}
        transition={reducedMotion ? { duration: 0 } : PANEL_SPRING}
        className="absolute inset-0 rounded-full bg-card shadow-[0_2px_6px_rgba(74,59,46,0.12)]"
      />
    )}
    <span className="relative">{children}</span>
  </>
);

type DragData = { type?: string; section?: string; notch?: number; key?: string };

const dataOf = (data: { current?: Record<string, unknown> } | undefined): DragData => {
  const current = data?.current;
  return {
    type: typeof current?.type === "string" ? current.type : undefined,
    section: typeof current?.section === "string" ? current.section : undefined,
    notch: typeof current?.notch === "number" ? current.notch : undefined,
    key: typeof current?.key === "string" ? current.key : undefined,
  };
};

// Items land on items and sections, shelves on rail notches; the pointer decides first, then distance (keyboard).
// Front views place items freely along a shelf, so the keys move them by small steps rather than slot to slot.
const KEY_STEP_X = 24;
const KEY_STEP_Y = 64;
const freeKeyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
  const steps: Record<string, [number, number]> = {
    ArrowLeft: [-KEY_STEP_X, 0],
    ArrowRight: [KEY_STEP_X, 0],
    ArrowUp: [0, -KEY_STEP_Y],
    ArrowDown: [0, KEY_STEP_Y],
  };
  const step = steps[event.code];
  if (!step) return undefined;
  event.preventDefault();
  return { x: currentCoordinates.x + step[0], y: currentCoordinates.y + step[1] };
};

const collisionsFor: CollisionDetection = (args) => {
  const dragged = dataOf(args.active.data).type;
  const droppableContainers = args.droppableContainers.filter((container) => {
    const type = dataOf(container.data).type;
    return dragged === "shelf" ? type === "notch" : type === "item" || type === "section";
  });
  const pointer = args.pointerCoordinates;
  // The tray (and only the tray) when the pointer is on it: the phone drawer covers shelves still on the page under it.
  if (pointer && trayAt(pointer.x, pointer.y)) return droppableContainers.some((container) => container.id === UNSORTED) ? [{ id: UNSORTED }] : [];
  // Off the tray, a pointer drag never lands in it just because it's the closest thing.
  const candidates = pointer ? droppableContainers.filter((container) => container.id !== UNSORTED) : droppableContainers;
  const scoped = { ...args, droppableContainers: candidates };
  const isItem = (id: UniqueIdentifier) =>
    dataOf(candidates.find((container) => container.id === id)?.data).type === "item";
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
  /** Everything kept in other storage pieces, with where it is now: it can be brought in here too. */
  elsewhere: readonly ItemRow<PantryItem>[];
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
  elsewhere,
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
  // Front views: the shelf and spot along it under the carried item, and the last item dropped (for its landing).
  const [preview, setPreview] = useState<ScenePick | null>(null);
  const [landed, setLanded] = useState<{ key: string; count: number } | null>(null);
  const { putIn } = usePutAway();
  const front = spec.view === "front";
  // The fridge is a live 3D scene; the other front views are drawn flat for now.
  const FrontOrIso = opensIn3d(kind) ? Inside3dView : FrontView;
  const tab = spec.tabs.find((candidate) => candidate.id === tabId) ?? spec.tabs[0];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: front ? freeKeyboardCoordinates : sortableKeyboardCoordinates }),
  );
  const land = (key: string) => setLanded((previous) => ({ key, count: (previous?.count ?? 0) + 1 }));

  const arranged = draft ?? inside.arranged;
  const keysFor = (sectionId: string) => arranged.get(sectionId) ?? [];
  const sectionInDraft = (key: UniqueIdentifier) =>
    [...arranged].find(([, keys]) => keys.includes(String(key)))?.[0] ?? null;
  const activeItem = activeItemKey ? inside.itemsByKey.get(activeItemKey) : undefined;
  const allowed = new Set(activeItem ? inside.destinationsFor(activeItem).map((destination) => destination.id) : []);
  allowed.add(UNSORTED);
  // Things brought in from outside the piece: waiting stock, or stock kept somewhere else.
  const incoming = [...waiting, ...elsewhere.map((row) => row.item)];
  const waitingItem = incoming.find((item) => item.key === waitingKey);
  const targetSectionId = front
    ? (preview?.sectionId ?? null)
    : waitingKey
      ? waitingTarget
      : activeItemKey
        ? sectionInDraft(activeItemKey)
        : null;
  const landing = (key: string) => {
    if (front) {
      if (!preview) return "";
      return preview.sectionId === fullSectionId
        ? `${inside.label(preview.sectionId)} is full`
        : `${inside.label(preview.sectionId)}${preview.row ? " · back" : ""} · ${sideOf(preview.x)}`;
    }
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
    setPreview(null);
    setWaitingKey(null);
    setWaitingTarget(null);
    setDraft(null);
    setActiveItemKey(null);
    setActiveShelfId(null);
    setTargetNotch(null);
  };

  // A tile in the tray is dragged as `tray:<key>`; everything about the drop is about the item it stands for.
  const itemKeyOf = (active: DragStartEvent["active"]) => {
    const data = dataOf(active.data);
    return data.type === "tray" && data.key ? data.key : String(active.id);
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
    setActiveItemKey(itemKeyOf(active));
    if (!front) setDraft(new Map(inside.arranged));
  };

  // Where the carried thing is along the shelf under it: the pointer, or the item's centre when moved by keys.
  // The shelf is read from the page under that point, so it's always the one you see under it.
  const handleDragMove = ({ active, delta, activatorEvent }: DragMoveEvent) => {
    if (!front || activeShelfId) return;
    const initial = active.rect.current.initial;
    const start =
      activatorEvent instanceof MouseEvent
        ? { x: activatorEvent.clientX, y: activatorEvent.clientY }
        : initial
          ? { x: initial.left + initial.width / 2, y: initial.top + initial.height / 2 }
          : null;
    if (!start) return;
    const point = { x: start.x + delta.x, y: start.y + delta.y };
    if (trayAt(point.x, point.y)) {
      setPreview(null);
      return;
    }
    const shelf = document
      .elementsFromPoint(point.x, point.y)
      .map((element) => element.closest<HTMLElement>("[data-section-id]"))
      .find((element) => element !== null);
    const rect = shelf?.getBoundingClientRect();
    // A drawn shelf under the pointer, else the 3D view's (the fridge), if it's open.
    const pick =
      shelf?.dataset.sectionId && rect
        ? { sectionId: shelf.dataset.sectionId, x: Math.min(1, Math.max(0, (point.x - rect.left) / rect.width)) }
        : pickScene(point.x, point.y);
    setPreview(pick && (waitingKey !== null || allowed.has(pick.sectionId)) ? pick : null);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (front && !activeShelfId) return;
    if (waitingKey) {
      const sectionId = sectionUnder(over);
      setWaitingTarget(sectionId === UNSORTED ? null : sectionId);
      return;
    }
    if (activeShelfId) {
      setTargetNotch(over ? (dataOf(over.data).notch ?? null) : null);
      return;
    }
    const key = itemKeyOf(active);
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

  // Waiting stock dropped on a shelf goes to this piece's Grocy location, or its freezer for a freezer shelf.
  const destinationFor = (sectionId: string) => {
    const sectionTab = inside.layout.sections.find((section) => section.id === sectionId)?.tab;
    const zone = spec.tabs.find((candidate) => candidate.id === sectionTab)?.zone ?? "main";
    const destinationId = dropDestination({
      zone,
      locationId: location.id,
      locationIsFreezer: location.isFreezer,
      freezerId: destinations.find((place) => place.isFreezer)?.id ?? null,
    });
    return destinations.find((place) => place.id === destinationId);
  };

  // Saves the spot first (for the key it will have here), then moves the stock in Grocy, so it lands where it was dropped.
  const dropWaiting = (item: PantryItem, sectionId: string, overId: string | undefined, x: number | null, row?: number) => {
    const destination = destinationFor(sectionId);
    if (!destination) return;
    const key = `${destination.id}-${item.productId}`;
    if (x !== null) {
      if (!inside.placeAt(key, sectionId, x, item, row)) return;
    } else {
      const keys = keysFor(sectionId);
      const overIndex = overId === undefined ? -1 : keys.indexOf(overId);
      inside.place(key, sectionId, overIndex === -1 ? keys.length : overIndex);
    }
    putIn(item, destination, () => {
      land(key);
      onPickItem(item.productId, key);
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (waitingKey) {
      const sectionId = front ? (preview?.sectionId ?? null) : sectionUnder(over);
      if (waitingItem && sectionId && sectionId !== UNSORTED)
        dropWaiting(waitingItem, sectionId, over ? String(over.id) : undefined, front ? (preview?.x ?? null) : null, preview?.row);
      return reset();
    }
    if (activeShelfId) {
      if (targetNotch !== null) inside.moveShelf(activeShelfId, targetNotch);
      return reset();
    }
    if (front) {
      const key = itemKeyOf(active);
      if (preview && inside.placeAt(key, preview.sectionId, preview.x, undefined, preview.row)) land(key);
      else if (sectionUnder(over) === UNSORTED) inside.unplace(key);
      return reset();
    }
    const key = itemKeyOf(active);
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
    incoming.find((item) => `waiting:${item.key}` === String(id))?.name ??
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
  const here = destinations.find((place) => place.id === location.id);
  // The carried item's key on the shelf it's over (waiting stock gets the key it will have there).
  const ghostKey = preview
    ? waitingItem
      ? `${destinationFor(preview.sectionId)?.id ?? ""}-${waitingItem.productId}`
      : activeItemKey
    : null;
  const fullSectionId =
    preview && ghostKey && !inside.previewAt(ghostKey, preview.sectionId, preview.x, waitingItem, preview.row) ? preview.sectionId : null;
  const loose = unsorted.flatMap((key) => inside.itemsByKey.get(key) ?? []);
  // Over the 3D fridge, the scene draws what's carried as its model, so the flat sticker steps aside.
  // Over a full shelf there is no landing spot to draw it at, so the sticker (with its "is full" tag) stays.
  const shownIn3d = opensIn3d(kind) && !editing && preview !== null && fullSectionId === null;
  const spotsFor = (sectionId: string) =>
    (preview?.sectionId === sectionId && ghostKey ? inside.previewAt(ghostKey, sectionId, preview.x, waitingItem, preview.row) : null) ??
    inside.spotsOn(sectionId);

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
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
        {/* On their own row at the left, under the title, so the item inspector (floating at the right) never covers them. */}
        <div className="flex basis-full flex-wrap items-center gap-2 sm:pl-14">
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
                  <PillLabel active={candidate.id === tab?.id} indicator="inside-tab" reducedMotion={reducedMotion}>
                    {candidate.label}
                  </PillLabel>
                </button>
              ))}
            </div>
          )}
          {spec.view !== "riceBin" && (
            <div role="group" aria-label="Edit mode" className="flex gap-1 rounded-full border-[1.5px] border-border bg-muted p-1">
              <button type="button" aria-pressed={!editing} onClick={() => setEditing(false)} className={pill(!editing)}>
                <PillLabel active={!editing} indicator="inside-mode" reducedMotion={reducedMotion}>
                  Items
                </PillLabel>
              </button>
              <button type="button" aria-pressed={editing} onClick={() => setEditing(true)} className={pill(editing)}>
                <PillLabel active={editing} indicator="inside-mode" reducedMotion={reducedMotion}>
                  Items + {spec.editWord}
                </PillLabel>
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
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={reset}
        accessibility={{ announcements }}
      >
        {tab && spec.view === "front" && (
          <FrontOrIso
            inside={inside}
            tab={tab}
            editing={editing}
            spotsFor={spotsFor}
            ghostKey={ghostKey}
            ghostItem={waitingItem ?? activeItem}
            landed={landed}
            fullSectionId={fullSectionId}
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

        {/* The inventory hotbar: everything that can go on these shelves, dragged straight from its slots. */}
        {spec.view !== "riceBin" && (
          <InsideTray
            pieceName={location.name}
            waiting={waiting}
            elsewhere={elsewhere}
            here={here}
            loose={loose}
            onPut={(item) => onPickItem(item.productId, `${location.id}-${item.productId}`)}
            onPickItem={(item) => onPickItem(item.productId, item.key)}
          />
        )}

        <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
          {(activeItem || waitingItem) && (
            // Cross-fades with the 3D model instead of popping on and off at the fridge's edge.
            <div className={`transition-opacity duration-150 ease-out ${shownIn3d ? "opacity-0" : "opacity-100"}`}>
              {activeItem && <LiftedItem item={activeItem} landing={landing(activeItem.key)} />}
              {waitingItem && (
                <LiftedItem
                  item={waitingItem}
                  landing={(front ? landing(waitingItem.key) : waitingTarget ? inside.label(waitingTarget) : "") || "a shelf"}
                />
              )}
            </div>
          )}
          {activeShelfId && (
            <span className="flex h-11 w-9 items-center justify-center rounded-[12px] border-2 border-[#C8901F] bg-card text-muted-foreground shadow-[0_12px_20px_-8px_rgba(74,59,46,0.5)]">
              <DotsSixVerticalIcon size={18} weight="bold" aria-hidden />
            </span>
          )}
        </DragOverlay>
      </DndContext>

      {(editing || !front) && <p className="text-[13px] text-muted-foreground max-sm:hidden">{HINTS[spec.view]}</p>}
    </div>
  );
};
