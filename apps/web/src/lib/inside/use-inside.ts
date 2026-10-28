import type { InsideLayout, InsideSection, SectionType } from "@pantrywood/shared";
import type { StorageKind } from "@/components/scene/types";
import type { PantryItem, PantryLocation } from "@/lib/pantry/model";
import { useUiStore } from "@/lib/store/ui-store";
import { useInsideStore } from "./inside-store";
import {
  UNSORTED,
  addSection,
  arrange,
  defaultLayout,
  fitToSpec,
  insideSpecFor,
  moveShelf,
  placeItem,
  removeSection,
  sectionsInTab,
  setSectionType,
  type InsideSpec,
} from "./layout";
import { sizeIn, spotsOnShelf, widthsFor } from "./plan";
import { BACK, clampSize, FRONT, layerFor, nextTurn, placeInRow, type ShelfSpot, type WidthOf } from "./shelf-place";

const SHELF_WORDS: Partial<Record<StorageKind, string>> = { pantryShelf: "Tier", makerShelf: "Board" };

const TYPE_WORDS: Partial<Record<SectionType, string>> = {
  drawer: "Drawer",
  doorBin: "Door bin",
  crisper: "Crisper",
  compartment: "Compartment",
  loose: "Loose",
  bag: "Net bag",
  wireBasket: "Wire basket",
  floor: "Floor",
};

export const SHELF_TYPE_NAMES: Record<SectionType, string> = {
  wire: "Wire",
  glass: "Glass",
  half: "Half-width",
  drawer: "Drawer",
  doorBin: "Door bin",
  board: "Wood",
  crisper: "Crisper",
  compartment: "Compartment",
  loose: "Loose",
  bag: "Net bag",
  wireBasket: "Wire basket",
  floor: "Floor",
};

/** "Shelf 2", "Crisper 1" or "Freezer · Shelf 1": numbered from the top within its tab. */
const labelFor = (spec: InsideSpec, layout: InsideLayout, kind: StorageKind, section: InsideSection) => {
  const word = TYPE_WORDS[section.type] ?? SHELF_WORDS[kind] ?? "Shelf";
  const sameWord = sectionsInTab(layout, section.tab).filter(
    (other) => (TYPE_WORDS[other.type] ?? SHELF_WORDS[kind] ?? "Shelf") === word,
  );
  const number = sameWord.length > 1 ? ` ${sameWord.findIndex((other) => other.id === section.id) + 1}` : "";
  const tab = spec.tabs.find((candidate) => candidate.id === section.tab);
  const prefix = tab && spec.tabs.length > 1 && tab !== spec.tabs[0] ? `${tab.label} · ` : "";
  return `${prefix}${word}${number}`;
};

export const useInside = (location: PantryLocation, kind: StorageKind) => {
  const spec = insideSpecFor(kind, location.isFreezer);
  const saved = useInsideStore((state) => state.layouts[location.id]);
  const save = useInsideStore((state) => state.save);
  const showToast = useUiStore((state) => state.showToast);
  const layout = saved ? fitToSpec(saved, spec) : defaultLayout(spec);
  const items = location.items.filter((item) => item.amount > 0);
  const itemsByKey = new Map(items.map((item) => [item.key, item]));
  const arranged = arrange(
    spec,
    layout,
    items.map((item) => ({ key: item.key, zone: item.inFreezer ? "freezer" : "main" })),
  );
  const sectionById = new Map(layout.sections.map((section) => [section.id, section]));
  const label = (sectionId: string) => {
    const section = sectionById.get(sectionId);
    return section ? labelFor(spec, layout, kind, section) : "Unsorted";
  };
  const sectionOf = (key: string) =>
    [...arranged].find(([, keys]) => keys.includes(key))?.[0] ?? UNSORTED;
  const sizeOf = sizeIn(layout);
  const widthsOn = (sectionId: string, incoming?: { key: string; item: PantryItem }): WidthOf =>
    widthsFor(itemsByKey, kind, sectionById.get(sectionId), sizeOf, incoming);
  const spotsOn = (sectionId: string): ShelfSpot[] => spotsOnShelf(layout, arranged, sectionId, widthsOn(sectionId));
  /** Saves a shelf's new spots (and rows) in order, keeping everything else about each slot. */
  const withSpots = (slots: InsideLayout["slots"], sectionId: string, spots: readonly ShelfSpot[]) => {
    const next = { ...slots };
    spots.forEach((spot, order) => (next[spot.key] = { ...next[spot.key], section: sectionId, order, x: spot.x, row: spot.row }));
    return next;
  };
  /**
   * Pins every other item at the spot it stands at now (skipping `key`, and the shelf being re-laid out), even on
   * shelves saved before positions existed, so moving one thing never respreads the rest.
   */
  const pinnedExcept = (slots: InsideLayout["slots"], key: string, skipSection?: string) => {
    const next = { ...slots };
    for (const sectionId of arranged.keys()) {
      if (sectionId === UNSORTED || sectionId === skipSection) continue;
      for (const spot of spotsOn(sectionId)) {
        const slot = next[spot.key];
        if (spot.key !== key && slot) next[spot.key] = { ...slot, x: spot.x };
      }
    }
    return next;
  };
  const commit = (next: InsideLayout | null, blocked: string) => {
    if (next) save(location.id, next);
    else showToast(blocked, "error");
  };

  return {
    spec,
    layout,
    arranged,
    itemsByKey,
    label,
    sectionOf,
    /** "Shelf 2 · slot 4" (or "Shelf 2 · back · slot 1") for the panel and the drag tag. */
    positionOf: (key: string) => {
      const sectionId = sectionOf(key);
      const slot = (arranged.get(sectionId) ?? []).indexOf(key) + 1;
      const back = layout.slots[key]?.section === sectionId && layout.slots[key]?.row === BACK ? " · back" : "";
      return sectionId === UNSORTED ? "Unsorted" : `${label(sectionId)}${back} · slot ${slot}`;
    },
    /** Where an item may go: parts in a tab of its own zone, since freezer stock is another Grocy location. */
    destinationsFor: (item: PantryItem) =>
      spec.tabs
        .filter((tab) => tab.zone === (item.inFreezer ? "freezer" : "main"))
        .flatMap((tab) => sectionsInTab(layout, tab.id))
        .map((section) => ({ id: section.id, label: label(section.id) })),
    place: (key: string, sectionId: string, index: number) =>
      save(location.id, placeItem(layout, arranged, key, sectionId, index)),
    spotsOn,
    widthsOn,
    sizeOf,
    /** Makes an item bigger or smaller on its shelf; its neighbours slide aside, or it says there's no room. */
    resize: (key: string, size: number) => {
      const sectionId = sectionOf(key);
      const spots = spotsOn(sectionId);
      const current = spots.find((spot) => spot.key === key);
      if (sectionId === UNSORTED || !current) return;
      const next = clampSize(size);
      const base = widthsOn(sectionId);
      const widthOf: WidthOf = (other) => (other === key ? (base(other) / sizeOf(other)) * next : base(other));
      const placed = placeInRow(spots, key, current.x, current.row ?? FRONT, widthOf);
      if (!placed) {
        showToast(`No room on ${label(sectionId)} to make it bigger`, "error");
        return;
      }
      const slots = withSpots(layout.slots, sectionId, placed);
      const slot = slots[key];
      if (slot) slots[key] = { ...slot, size: next };
      save(location.id, { ...layout, slots });
    },
    turnOf: (key: string) => layout.slots[key]?.turn ?? 0,
    /** Turns it a step on its shelf (3D views). */
    turn: (key: string, direction: "left" | "right") => {
      const sectionId = sectionOf(key);
      if (sectionId === UNSORTED) return;
      const slot = layout.slots[key] ?? { section: sectionId, order: (arranged.get(sectionId) ?? []).indexOf(key) };
      save(location.id, { ...layout, slots: { ...layout.slots, [key]: { ...slot, turn: nextTurn(slot.turn ?? 0, direction) } } });
    },
    layerOf: (key: string) => layout.slots[key]?.layer ?? 0,
    /** Moves it to the other row of its shelf (front ↔ back), at the same spot along it; a toast when that row is full. */
    switchRow: (key: string) => {
      const sectionId = sectionOf(key);
      const spots = spotsOn(sectionId);
      const current = spots.find((spot) => spot.key === key);
      if (sectionId === UNSORTED || !current) return;
      const row = (current.row ?? FRONT) === FRONT ? BACK : FRONT;
      const placed = placeInRow(spots, key, current.x, row, widthsOn(sectionId));
      if (!placed) {
        showToast(`The ${row === BACK ? "back" : "front"} of ${label(sectionId)} is full`, "error");
        return;
      }
      save(location.id, { ...layout, slots: withSpots(layout.slots, sectionId, placed) });
    },
    /** Puts it in front of, or behind, everything else on its shelf where they overlap. */
    restack: (key: string, direction: "front" | "back") => {
      const sectionId = sectionOf(key);
      if (sectionId === UNSORTED) return;
      const keys = arranged.get(sectionId) ?? [];
      const slot = layout.slots[key] ?? { section: sectionId, order: keys.indexOf(key) };
      const others = keys.filter((other) => other !== key);
      const layer = layerFor(others.map((other) => layout.slots[other]?.layer ?? 0), direction);
      save(location.id, { ...layout, slots: { ...layout.slots, [key]: { ...slot, layer } } });
    },
    /** Where it would stand if dropped at `x` in `row`, with its neighbours slid aside; null when that row is full. */
    previewAt: (key: string, sectionId: string, x: number, incoming?: PantryItem, row = FRONT) =>
      placeInRow(spotsOn(sectionId), key, x, row, widthsOn(sectionId, incoming && { key, item: incoming })),
    /** Puts it on a shelf at `x` (in `row`) like on a real one; false (and a toast) when that row is full. */
    placeAt: (key: string, sectionId: string, x: number, incoming?: PantryItem, row = FRONT) => {
      const spots = placeInRow(spotsOn(sectionId), key, x, row, widthsOn(sectionId, incoming && { key, item: incoming }));
      if (!spots) {
        showToast(`${row === BACK ? `The back of ${label(sectionId)}` : label(sectionId)} is full`, "error");
        return false;
      }
      const placed = placeItem(layout, arranged, key, sectionId, 0);
      save(location.id, { ...placed, slots: withSpots(pinnedExcept(placed.slots, key, sectionId), sectionId, spots) });
      return true;
    },
    /** Takes it off its shelf, back to the Item tray ("Not on a shelf"); everything else stays where it stands. */
    unplace: (key: string) => {
      const placed = placeItem(layout, arranged, key, UNSORTED, (arranged.get(UNSORTED) ?? []).length);
      save(location.id, { ...placed, slots: pinnedExcept(placed.slots, key) });
    },
    moveShelf: (sectionId: string, notch: number) =>
      commit(moveShelf(layout, spec, sectionId, notch), "Another shelf already sits on that notch"),
    addSection: (tabId: string) =>
      commit(addSection(layout, spec, tabId, crypto.randomUUID()), "Every notch already holds a shelf"),
    removeSection: (sectionId: string) => save(location.id, removeSection(layout, spec, arranged, sectionId)),
    setType: (sectionId: string, type: SectionType) => save(location.id, setSectionType(layout, sectionId, type)),
    setCapacity: (capacity: number) => save(location.id, { ...layout, capacity }),
  };
};

export type Inside = ReturnType<typeof useInside>;
