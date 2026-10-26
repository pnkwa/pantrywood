import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { RoomLayoutSchema, type DecorPlacement, type RoomLayout } from "@pantrywood/shared";
import { z } from "zod";
import {
  catalogItem,
  STARTER_DECOR,
  STARTER_FLOOR,
  STARTER_LEAVES,
  STARTER_PEGBOARD,
  STARTER_STORAGE,
  STARTER_WALLPAPER,
} from "@/data/catalog";
import { localStorageRepository } from "@/lib/repository/local-storage";

const UNDO_STEPS = 30;

const STARTER_LAYOUT: RoomLayout = {
  leaves: STARTER_LEAVES,
  owned: [
    ...Object.values(STARTER_STORAGE),
    STARTER_WALLPAPER,
    STARTER_FLOOR,
    STARTER_PEGBOARD,
    ...STARTER_DECOR.map((placement) => placement.itemId),
  ],
  wallpaper: STARTER_WALLPAPER,
  floor: STARTER_FLOOR,
  // Locations without a saved placement stand in their default spot (see decorate.ts).
  storage: [],
  decor: STARTER_DECOR.map((placement) => ({ ...placement, cell: [...placement.cell] })),
};

const isWallItem = (itemId: string) => {
  const item = catalogItem(itemId);
  return item?.category === "decor" && item.layer === "wall";
};

/** One step per saved version: step n upgrades a version n layout to n + 1. */
const MIGRATIONS: ((layout: RoomLayout) => RoomLayout)[] = [
  // The fixed window, clock, frames, cat rug and basket became decor you own.
  (layout) => ({
    ...layout,
    decor: [...layout.decor, ...STARTER_LAYOUT.decor],
    owned: [...new Set([...layout.owned, ...STARTER_LAYOUT.owned])],
  }),
  // Wall pieces got a row, so they move up and down too.
  (layout) => ({
    ...layout,
    decor: layout.decor.map((placement) => {
      if (!isWallItem(placement.itemId)) return placement;
      const starter = STARTER_DECOR.find((candidate) => candidate.id === placement.id);
      return { ...placement, cell: [placement.cell[0], starter?.cell[1] ?? 1] };
    }),
  }),
  // The cat got off its rug: the rug and the cat are now two pieces.
  (layout) => ({
    ...layout,
    decor: layout.decor.flatMap((placement): DecorPlacement[] =>
      placement.itemId === "sleepy-cat-rug"
        ? [
            { ...placement, itemId: "butter-oval-rug" },
            { id: `${placement.id}-cat`, itemId: "napping-cat", cell: [placement.cell[0] + 1, placement.cell[1] + 2], rotation: 0 },
          ]
        : [placement],
    ),
    owned: [...new Set(layout.owned.flatMap((id) => (id === "sleepy-cat-rug" ? ["butter-oval-rug", "napping-cat"] : [id])))],
  }),
  // Rooms saved before the mock 1000 leaves get topped up to it.
  (layout) => ({ ...layout, leaves: Math.max(layout.leaves, STARTER_LEAVES) }),
  // The pegboard arrived: it hangs on the left wall and its oat board is owned.
  (layout) => {
    const pegboard = STARTER_LAYOUT.decor.find((placement) => placement.itemId === "pegboard");
    const hasOne = layout.decor.some((placement) => placement.itemId === "pegboard");
    return {
      ...layout,
      decor: pegboard && !hasOne ? [...layout.decor, pegboard] : layout.decor,
      owned: [...new Set([...layout.owned, "pegboard", STARTER_PEGBOARD])],
    };
  },
];

const SavedStateSchema = z.object({ layout: RoomLayoutSchema });

// Saved through the Repository, so the layout can move to apps/api later without touching the UI.
const SavedRoomSchema = z.object({ state: z.object({ layout: RoomLayoutSchema }), version: z.number() });
const roomRepository = localStorageRepository("room", SavedRoomSchema);
const SAVED_ROOM_ID = "layout";

const repositoryStorage: StateStorage = {
  getItem: async () => {
    const saved = await roomRepository.get(SAVED_ROOM_ID);
    return saved ? JSON.stringify(saved) : null;
  },
  setItem: async (_name, value) => {
    const saved = SavedRoomSchema.safeParse(JSON.parse(value));
    if (saved.success) await roomRepository.save(SAVED_ROOM_ID, saved.data);
  },
  removeItem: () => roomRepository.remove(SAVED_ROOM_ID),
};

type RoomState = {
  layout: RoomLayout;
  history: RoomLayout[];
  change: (next: RoomLayout) => void;
  /** Adds (or, when negative, takes back) earned leaves. Not a Decorate step, so Undo never touches it. */
  earn: (leaves: number) => void;
  undo: () => void;
};

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      layout: STARTER_LAYOUT,
      history: [],
      change: (next) =>
        set((state) => ({ layout: next, history: [...state.history, state.layout].slice(-UNDO_STEPS) })),
      earn: (leaves) =>
        set((state) => {
          const withEarned = (layout: RoomLayout) => ({ ...layout, leaves: Math.max(0, layout.leaves + leaves) });
          // The undo steps get the leaves too, so undoing a purchase never loses what was earned since.
          return { layout: withEarned(state.layout), history: state.history.map(withEarned) };
        }),
      undo: () =>
        set((state) => {
          const previous = state.history.at(-1);
          return previous ? { layout: previous, history: state.history.slice(0, -1) } : state;
        }),
    }),
    {
      name: "room",
      storage: createJSONStorage(() => repositoryStorage),
      partialize: (state) => ({ layout: state.layout }),
      version: MIGRATIONS.length,
      migrate: (persisted, version) => {
        const saved = SavedStateSchema.safeParse(persisted);
        if (!saved.success) return { layout: STARTER_LAYOUT };
        return { layout: MIGRATIONS.slice(version).reduce((layout, step) => step(layout), saved.data.layout) };
      },
    },
  ),
);
