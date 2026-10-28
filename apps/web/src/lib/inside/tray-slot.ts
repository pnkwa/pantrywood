import { create } from "zustand";

/**
 * Where the open piece's item tray goes: the side panel offers this spot, and the inside view draws its tray into
 * it, so tray items stay inside the view's drag and drop (on phones there's no spot and the tray sits in the view).
 */
export const useTraySlot = create<{ slot: HTMLElement | null; offer: (slot: HTMLElement) => () => void }>()((set) => ({
  slot: null,
  // A panel hidden on this screen size (the desktop one on a phone) offers nothing, or the tray would vanish into it.
  offer: (slot) => {
    if (slot.offsetParent === null) return () => undefined;
    set({ slot });
    return () => set((state) => (state.slot === slot ? { slot: null } : state));
  },
}));
