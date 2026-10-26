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
  insideSpecFor,
  moveShelf,
  placeItem,
  removeSection,
  sectionsInTab,
  setSectionType,
  type InsideSpec,
} from "./layout";

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
  const layout = saved ?? defaultLayout(spec);
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
    /** "Shelf 2 · slot 4" for the panel and the drag tag. */
    positionOf: (key: string) => {
      const sectionId = sectionOf(key);
      const slot = (arranged.get(sectionId) ?? []).indexOf(key) + 1;
      return sectionId === UNSORTED ? "Unsorted" : `${label(sectionId)} · slot ${slot}`;
    },
    /** Where an item may go: parts in a tab of its own zone, since freezer stock is another Grocy location. */
    destinationsFor: (item: PantryItem) =>
      spec.tabs
        .filter((tab) => tab.zone === (item.inFreezer ? "freezer" : "main"))
        .flatMap((tab) => sectionsInTab(layout, tab.id))
        .map((section) => ({ id: section.id, label: label(section.id) })),
    place: (key: string, sectionId: string, index: number) =>
      save(location.id, placeItem(layout, arranged, key, sectionId, index)),
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
