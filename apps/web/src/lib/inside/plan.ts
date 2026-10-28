import type { InsideLayout, InsideSection } from "@pantrywood/shared";
import type { SceneShelves, StorageKind } from "@/components/scene/types";
import type { PantryItem, PantryLocation } from "@/lib/pantry/model";
import { groupWidth } from "@/components/scene/items/sizes";
import { sceneItemFor } from "@/lib/room/items";
import { fridgeSurfaces } from "./fridge-surfaces";
import { arrange, defaultLayout, fitToSpec, insideSpecFor } from "./layout";
import { footprintFor, ITEM_WIDTH, spotsInRows, type ShelfSpot, type WidthOf } from "./shelf-place";
import { arrangesIn3d, shelfSurfaces, shelfWidthFor } from "./surfaces";

/** How wide a section is in scene units: the fridge's own shelves, crispers and door bins, else the piece's shelf. */
const sectionWidth = (kind: StorageKind, section: InsideSection | undefined) =>
  (kind === "fridge" && section ? fridgeSurfaces([section])[0]?.width : undefined) ?? shelfWidthFor(kind);

/**
 * How much of a section each item takes, from its 3D model and copies, so a narrow crisper fits fewer.
 * `incoming` sizes something not here yet, like stock waiting to be put away.
 */
export const widthsFor =
  (
    itemsByKey: ReadonlyMap<string, PantryItem>,
    kind: StorageKind,
    section: InsideSection | undefined,
    sizeOf: (key: string) => number,
    incoming?: { key: string; item: PantryItem },
  ): WidthOf =>
  (key) => {
    const item = itemsByKey.get(key) ?? (incoming?.key === key ? incoming.item : undefined);
    if (!item) return ITEM_WIDTH * sizeOf(key);
    const { shape, copies } = sceneItemFor(item);
    return footprintFor(groupWidth(shape, copies), sectionWidth(kind, section)) * sizeOf(key);
  };

/** The size you gave an item (1 when you haven't). */
export const sizeIn = (layout: InsideLayout) => (key: string) => layout.slots[key]?.size ?? 1;

/** Where each item stands along a shelf, and in which row, from the saved layout. */
export const spotsOnShelf = (
  layout: InsideLayout,
  arranged: ReadonlyMap<string, readonly string[]>,
  sectionId: string,
  widthOf: WidthOf,
): ShelfSpot[] => {
  const keys = arranged.get(sectionId) ?? [];
  const here = keys.map((key) => (layout.slots[key]?.section === sectionId ? layout.slots[key] : undefined));
  return spotsInRows(keys, here.map((slot) => slot?.x), here.map((slot) => slot?.row), widthOf);
};

/** A piece's layout as it fits today, with its items sorted onto shelves: what both the room and the inside view show. */
export const planFor = (kind: StorageKind, isFreezer: boolean, saved: InsideLayout | undefined, items: readonly PantryItem[]) => {
  const spec = insideSpecFor(kind, isFreezer);
  const layout = saved ? fitToSpec(saved, spec) : defaultLayout(spec);
  const present = items.filter((item) => item.amount > 0);
  const itemsByKey = new Map(present.map((item) => [item.key, item]));
  const arranged = arrange(
    spec,
    layout,
    present.map((item) => ({ key: item.key, zone: item.inFreezer ? "freezer" : "main" })),
  );
  return { spec, layout, itemsByKey, arranged };
};

/** A piece's shelves as the 3D room draws them: boards where the layout put them, items at their saved spots. */
export const sceneShelvesFor = (kind: StorageKind, location: PantryLocation, saved: InsideLayout | undefined): SceneShelves | undefined => {
  if (!arrangesIn3d(kind) || location.isFreezer) return undefined;
  const { layout, itemsByKey, arranged } = planFor(kind, location.isFreezer, saved, location.items);
  const surfaces = shelfSurfaces(kind, layout.sections);
  const sectionById = new Map(layout.sections.map((section) => [section.id, section]));
  const spots = surfaces.flatMap((surface) => {
    const widthOf = widthsFor(itemsByKey, kind, sectionById.get(surface.sectionId), sizeIn(layout));
    return spotsOnShelf(layout, arranged, surface.sectionId, widthOf).map((spot) => ({
      key: spot.key,
      sectionId: surface.sectionId,
      x: spot.x,
      width: widthOf(spot.key),
    }));
  });
  return { surfaces, spots };
};
