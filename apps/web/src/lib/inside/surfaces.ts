// No "@/" imports: scripts/shelf-surfaces.test.mjs runs this file directly with Node.
import type { InsideSection } from "@pantrywood/shared";
import type { StorageKind } from "../../components/scene/types";

/** Where a shelf of the inside layout is on the piece's 3D model: its top surface, in the model's own units. */
export type ShelfSurface = { sectionId: string; y: number; x: number; width: number; z: number };

/**
 * Pieces whose 3D shelves follow the inside layout. Each maps a rail notch (0 = top) to the height its board's
 * top sits at, matching the model's own boards at the default notches (pantry tiers 1·3·5·7, cabinet tiers 2·5).
 */
const MODELS: Partial<Record<StorageKind, { yAt: (notch: number) => number; x: number; width: number; z: number }>> = {
  pantryShelf: { yAt: (notch) => Math.max(0.12, 4.2 - 0.6 * notch), x: -1.32, width: 2.64, z: 0.2 },
  suppliesCabinet: { yAt: (notch) => Math.max(0.14, 1.32 - (1.18 / 3) * (notch - 2)), x: -1.15, width: 2.3, z: 0.25 },
};

export const arrangesIn3d = (kind: StorageKind) => MODELS[kind] !== undefined;

/** Pieces drawn only from the front inside size items against this shelf width, so a jar takes about a quarter. */
const FRONT_ONLY_SHELF_WIDTH = 1.25;

/** How wide a shelf of this piece is, in scene units. */
export const shelfWidthFor = (kind: StorageKind) => MODELS[kind]?.width ?? FRONT_ONLY_SHELF_WIDTH;

/** The shelves with a notch, as surfaces on the model; empty for pieces that fill their shelves themselves. */
export const shelfSurfaces = (kind: StorageKind, sections: readonly InsideSection[]): ShelfSurface[] => {
  const model = MODELS[kind];
  if (!model) return [];
  return sections.flatMap((section) =>
    section.notch === null ? [] : [{ sectionId: section.id, y: model.yAt(section.notch), x: model.x, width: model.width, z: model.z }],
  );
};
