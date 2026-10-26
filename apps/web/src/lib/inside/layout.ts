// No "@/" imports: scripts/inside-layout.test.mjs runs this file directly with Node.
import type { InsideLayout, InsideSection, SectionType } from "@pantrywood/shared";
import type { StorageKind } from "../../components/scene/types";

export const UNSORTED = "unsorted";

/** Freezer stock lives in another Grocy location, so it can only sit in a freezer tab. */
export type Zone = "main" | "freezer";

export type InsideTab = {
  id: string;
  label: string;
  zone: Zone;
  /** Rail notches down each side; 0 for a top-down tab. */
  notches: number;
  /** Shelf types this tab offers when shelves are edited. */
  shelfTypes: readonly SectionType[];
  /** The part that new or removed things fall back to (a basket's loose pile, a freezer floor). */
  fallback?: string;
};

export type InsideSpec = {
  view: "front" | "topDown" | "riceBin";
  title: string;
  /** "shelves", "dividers", "bags" or "baskets": what "Items + …" edits. */
  editWord: string;
  tabs: readonly InsideTab[];
  sections: readonly InsideSection[];
};

const FRIDGE_SHELVES: SectionType[] = ["wire", "glass", "half", "drawer", "doorBin"];
const BOARD_SHELVES: SectionType[] = ["board", "glass", "half", "drawer", "doorBin"];

const shelves = (tab: string, type: SectionType, notches: number[]): InsideSection[] =>
  notches.map((notch, index) => ({ id: `${tab}-${index + 1}`, tab, type, notch }));

const parts = (tab: string, type: SectionType, count: number): InsideSection[] =>
  Array.from({ length: count }, (_, index) => ({ id: `${tab}-${type}-${index + 1}`, tab, type, notch: null }));

const front = (title: string, tabs: InsideTab[], sections: InsideSection[]): InsideSpec => ({
  view: "front",
  title,
  editWord: "shelves",
  tabs,
  sections,
});

const tab = (id: string, label: string, notches: number, shelfTypes = BOARD_SHELVES, zone: Zone = "main"): InsideTab => ({
  id,
  label,
  zone,
  notches,
  shelfTypes,
});

/** The two generic layouts, set up for each storage piece (DESIGN.md section 15). */
export const insideSpecFor = (kind: StorageKind, isFreezer: boolean): InsideSpec => {
  if (isFreezer) {
    return {
      view: "topDown",
      title: "Inside the chest freezer",
      editWord: "baskets",
      tabs: [{ ...tab("main", "Freezer", 0, [], "freezer"), fallback: "main-floor-1" }],
      sections: [...parts("main", "wireBasket", 2), ...parts("main", "floor", 1)],
    };
  }
  switch (kind) {
    case "fridge":
      return front(
        "Inside the fridge",
        [
          tab("main", "Main", 6, FRIDGE_SHELVES),
          tab("freezer", "Freezer", 4, FRIDGE_SHELVES, "freezer"),
          tab("door", "Door bins", 5, FRIDGE_SHELVES),
        ],
        [
          ...shelves("main", "wire", [1, 3, 5]),
          ...parts("main", "crisper", 2),
          ...shelves("freezer", "wire", [1, 3]),
          ...shelves("door", "doorBin", [0, 2, 4]),
        ],
      );
    case "pantryShelf":
      return front("Inside the pantry shelf", [tab("main", "Tiers", 8)], shelves("main", "board", [1, 3, 5, 7]));
    case "suppliesCabinet":
      return front(
        "Inside the supplies cabinet",
        [tab("main", "Shelves", 6), tab("door", "Door", 4)],
        [...shelves("main", "board", [2, 5]), ...shelves("door", "doorBin", [1, 3])],
      );
    case "makerShelf":
      return front("The maker shelf", [tab("main", "Boards", 6)], shelves("main", "board", [2, 5]));
    case "counter":
      return front("Inside the counter", [tab("main", "Cabinet", 4)], shelves("main", "board", [1, 3]));
    case "crates":
      return {
        view: "topDown",
        title: "Inside the snack crates",
        editWord: "dividers",
        tabs: [tab("top", "Top crate", 0, []), tab("bottom", "Bottom crate", 0, [])],
        sections: [...parts("top", "compartment", 3), ...parts("bottom", "compartment", 2)],
      };
    case "basket":
      return {
        view: "topDown",
        title: "Inside the basket",
        editWord: "bags",
        tabs: [{ ...tab("main", "Basket", 0, []), fallback: "main-loose-1" }],
        sections: parts("main", "loose", 1),
      };
    case "riceBin":
      return { view: "riceBin", title: "Inside the rice bin", editWord: "", tabs: [tab("main", "Rice", 0, [])], sections: [] };
  }
};

export const defaultLayout = (spec: InsideSpec): InsideLayout => ({ sections: [...spec.sections], slots: {} });

/** Top to bottom: notched shelves by notch, then fixed parts in the order they were added. */
export const sectionsInTab = (layout: InsideLayout, tabId: string): InsideSection[] =>
  layout.sections
    .filter((section) => section.tab === tabId)
    .sort((first, second) => (first.notch ?? Infinity) - (second.notch ?? Infinity));

export type ArrangedItem = { key: string; zone: Zone };

/** Item keys per section id (plus UNSORTED), in slot order. Unplaced items go to the first part of a tab in their zone. */
export const arrange = (spec: InsideSpec, layout: InsideLayout, items: readonly ArrangedItem[]): Map<string, string[]> => {
  const zoneOf = new Map(spec.tabs.map((candidate) => [candidate.id, candidate.zone]));
  const sectionById = new Map(layout.sections.map((section) => [section.id, section]));
  const arranged = new Map<string, { key: string; order: number }[]>([[UNSORTED, []]]);
  for (const section of layout.sections) arranged.set(section.id, []);
  const homeFor = (zone: Zone) => {
    const home = spec.tabs.find((candidate) => candidate.zone === zone) ?? spec.tabs[0];
    if (!home) return UNSORTED;
    return home.fallback ?? sectionsInTab(layout, home.id)[0]?.id ?? UNSORTED;
  };
  items.forEach((item, index) => {
    const slot = layout.slots[item.key];
    const section = slot ? sectionById.get(slot.section) : undefined;
    const fits = section !== undefined && zoneOf.get(section.tab) === item.zone;
    const target = slot?.section === UNSORTED ? UNSORTED : fits ? section.id : homeFor(item.zone);
    arranged.get(target)?.push({ key: item.key, order: slot && (fits || slot.section === UNSORTED) ? slot.order : 1000 + index });
  });
  return new Map(
    [...arranged].map(([sectionId, entries]) => [
      sectionId,
      entries.sort((first, second) => first.order - second.order).map((entry) => entry.key),
    ]),
  );
};

/** Puts an item at `index` in a section; every item in the sections it left and joined gets its new order saved. */
export const placeItem = (
  layout: InsideLayout,
  arranged: ReadonlyMap<string, readonly string[]>,
  key: string,
  sectionId: string,
  index: number,
): InsideLayout => {
  const next = new Map([...arranged].map(([id, keys]) => [id, keys.filter((candidate) => candidate !== key)]));
  const target = next.get(sectionId) ?? [];
  target.splice(Math.max(0, Math.min(index, target.length)), 0, key);
  next.set(sectionId, target);
  const slots = { ...layout.slots };
  for (const [id, keys] of next) {
    if (id !== sectionId && !arranged.get(id)?.includes(key)) continue;
    keys.forEach((itemKey, order) => {
      slots[itemKey] = { section: id, order };
    });
  }
  return { ...layout, slots };
};

/** The notch a shelf moves to, or null when it's off the rails or another shelf sits there. */
export const moveShelf = (layout: InsideLayout, spec: InsideSpec, sectionId: string, notch: number): InsideLayout | null => {
  const section = layout.sections.find((candidate) => candidate.id === sectionId);
  const notches = spec.tabs.find((candidate) => candidate.id === section?.tab)?.notches ?? 0;
  if (!section || section.notch === null || notch < 0 || notch >= notches) return null;
  const taken = layout.sections.some(
    (other) => other.id !== sectionId && other.tab === section.tab && other.notch === notch,
  );
  if (taken) return null;
  return { ...layout, sections: layout.sections.map((other) => (other.id === sectionId ? { ...other, notch } : other)) };
};

/** The free notch nearest the middle of the tab; null when every notch holds a shelf. */
export const freeNotch = (layout: InsideLayout, tab: InsideTab): number | null => {
  const taken = new Set(layout.sections.filter((section) => section.tab === tab.id).map((section) => section.notch));
  const middle = (tab.notches - 1) / 2;
  const free = Array.from({ length: tab.notches }, (_, notch) => notch).filter((notch) => !taken.has(notch));
  return free.sort((first, second) => Math.abs(first - middle) - Math.abs(second - middle) || first - second)[0] ?? null;
};

/** A new shelf on the nearest free notch, or a new divider, bag or basket in a top-down tab. */
export const addSection = (layout: InsideLayout, spec: InsideSpec, tabId: string, id: string): InsideLayout | null => {
  const tab = spec.tabs.find((candidate) => candidate.id === tabId);
  if (!tab) return null;
  const inTab = sectionsInTab(layout, tabId);
  if (tab.notches > 0) {
    const notch = freeNotch(layout, tab);
    if (notch === null) return null;
    const type = inTab.find((section) => section.notch !== null)?.type ?? tab.shelfTypes[0] ?? "board";
    return { ...layout, sections: [...layout.sections, { id, tab: tabId, type, notch }] };
  }
  const type: SectionType = spec.editWord === "bags" ? "bag" : spec.editWord === "baskets" ? "wireBasket" : "compartment";
  return { ...layout, sections: [...layout.sections, { id, tab: tabId, type, notch: null }] };
};

/** Shelves, dividers, bags and baskets can go; crispers, the loose pile and the freezer floor stay. */
export const isRemovable = (section: InsideSection, layout: InsideLayout) => {
  if (section.type === "crisper" || section.type === "loose" || section.type === "floor") return false;
  if (section.type === "compartment") return sectionsInTab(layout, section.tab).length > 1;
  return true;
};

/** Removes a section; its items move to the tab's fallback part, or to Unsorted first. */
export const removeSection = (
  layout: InsideLayout,
  spec: InsideSpec,
  arranged: ReadonlyMap<string, readonly string[]>,
  sectionId: string,
): InsideLayout => {
  const section = layout.sections.find((candidate) => candidate.id === sectionId);
  if (!section || !isRemovable(section, layout)) return layout;
  const fallback = spec.tabs.find((candidate) => candidate.id === section.tab)?.fallback ?? UNSORTED;
  const landing = [...(arranged.get(fallback) ?? [])];
  const slots = { ...layout.slots };
  for (const key of arranged.get(sectionId) ?? []) {
    landing.push(key);
    slots[key] = { section: fallback, order: landing.length - 1 };
  }
  return { ...layout, slots, sections: layout.sections.filter((candidate) => candidate.id !== sectionId) };
};

export const setSectionType = (layout: InsideLayout, sectionId: string, type: SectionType): InsideLayout => ({
  ...layout,
  sections: layout.sections.map((section) => (section.id === sectionId ? { ...section, type } : section)),
});

/**
 * Where each notched shelf's band runs, as fractions of the rail area: from the shelf above (or the top)
 * down to its own line. Items stand on the line and are scaled to the band's height.
 */
export const shelfBands = (sections: readonly InsideSection[], notches: number) => {
  const lineAt = (notch: number) => (notch + 1) / notches;
  let previous = 0;
  return sections
    .filter((section) => section.notch !== null)
    .map((section) => {
      const bottom = lineAt(section.notch ?? 0);
      const band = { id: section.id, top: previous, bottom };
      previous = bottom;
      return band;
    });
};
