// No "@/" imports: scripts/fridge-surfaces.test.mjs runs this file directly with Node.
import type { InsideSection } from "@pantrywood/shared";
import type { ShelfSurface } from "./surfaces";

/** Where in the fridge model a surface is: a main shelf, a crisper drawer, the freezer above the divider, or the open door. */
export type FridgePart = "cavity" | "crisper" | "freezer" | "door";
/** `rows`: how many rows deep things stand (shelves and crispers hold a back row; door bins are too shallow). */
export type FridgeSurface = ShelfSurface & { part: FridgePart; rows: number };

// Inside the fridge model (storage/Fridge.tsx): walls 0.15 thick, items stand along the front. Each surface stops
// 0.1 short of the walls (and the door's bins short of its edges): seen from an angle, a model is drawn wider than
// its footprint, so the ones at the ends would otherwise hang past the wall.
const CAVITY = { x: -0.85, width: 1.7, z: 0.45, rows: 2 };
const DOOR = { x: -0.6, width: 1.2, z: 0.1, rows: 1 };
const CRISPER = { y: 0.3, width: 0.82, gap: 0.06 };

/** Rail notch (0 = top) to the height a shelf's top sits at, per tab. */
const MAIN_Y = (notch: number) => 3.18 - (notch + 1) * 0.35;
const FREEZER_Y = (notch: number) => 4.45 - (notch + 1) * 0.28;
const DOOR_Y = (notch: number) => 3.9 - notch * 0.6;

/** Every fridge section's top surface in the fridge model's units; door surfaces are in the door's own space. */
export const fridgeSurfaces = (sections: readonly InsideSection[]): FridgeSurface[] => {
  let crispers = 0;
  return sections.flatMap((section): FridgeSurface[] => {
    const { id: sectionId, notch } = section;
    if (notch === null) {
      if (section.type !== "crisper") return [];
      const x = CAVITY.x + crispers++ * (CRISPER.width + CRISPER.gap);
      return [{ sectionId, part: "crisper", y: CRISPER.y, x, width: CRISPER.width, z: CAVITY.z, rows: CAVITY.rows }];
    }
    if (section.tab === "door") return [{ sectionId, part: "door", y: DOOR_Y(notch), ...DOOR }];
    if (section.tab === "freezer") return [{ sectionId, part: "freezer", y: FREEZER_Y(notch), ...CAVITY }];
    return [{ sectionId, part: "cavity", y: MAIN_Y(notch), ...CAVITY }];
  });
};

/** How tall the space over a surface is at most, where dropping picks it. */
export const PICK_HEIGHT = 0.6;

/**
 * The space over `surface` that picks it: up to the next surface above it in the same space (the body, or the door),
 * so close shelves never share a slice and a pointer between them always means one shelf.
 */
export const pickHeightFor = (surfaces: readonly FridgeSurface[], surface: FridgeSurface) => {
  const inDoor = surface.part === "door";
  const gaps = surfaces
    .filter((other) => (other.part === "door") === inDoor && other.y > surface.y && other.x < surface.x + surface.width && other.x + other.width > surface.x)
    .map((other) => other.y - surface.y);
  return Math.min(PICK_HEIGHT, ...gaps);
};
