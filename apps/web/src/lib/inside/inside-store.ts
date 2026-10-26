import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { InsideLayoutSchema, type InsideLayout } from "@pantrywood/shared";
import { z } from "zod";
import { localStorageRepository } from "@/lib/repository/local-storage";

// Saved through the Repository, so shelf layouts can move to apps/api later without touching the UI.
const SavedInsideSchema = z.object({
  state: z.object({ layouts: z.record(z.string(), InsideLayoutSchema) }),
  version: z.number(),
});
const insideRepository = localStorageRepository("inside", SavedInsideSchema);
const SAVED_ID = "layouts";

const repositoryStorage: StateStorage = {
  getItem: async () => {
    const saved = await insideRepository.get(SAVED_ID);
    return saved ? JSON.stringify(saved) : null;
  },
  setItem: async (_name, value) => {
    const saved = SavedInsideSchema.safeParse(JSON.parse(value));
    if (saved.success) await insideRepository.save(SAVED_ID, saved.data);
  },
  removeItem: () => insideRepository.remove(SAVED_ID),
};

type InsideState = {
  /** Keyed by Grocy location id; a piece without one uses its default layout. */
  layouts: Record<string, InsideLayout>;
  save: (locationId: number, layout: InsideLayout) => void;
};

export const useInsideStore = create<InsideState>()(
  persist(
    (set) => ({
      layouts: {},
      save: (locationId, layout) => set((state) => ({ layouts: { ...state.layouts, [locationId]: layout } })),
    }),
    {
      name: "inside",
      storage: createJSONStorage(() => repositoryStorage),
      partialize: (state) => ({ layouts: state.layouts }),
      version: 1,
    },
  ),
);
