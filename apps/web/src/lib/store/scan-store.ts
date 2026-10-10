import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export type ScanMode = "add" | "eat" | "check";

export type SessionRow = {
  id: number;
  productName: string;
  amountText: string;
  /** Where it went, or what happened ("Fridge · best before 24 Oct", "Eaten"). */
  detail: string;
  mode: ScanMode;
  transactionId: string | null;
  undone: boolean;
};

type ScanState = {
  mode: ScanMode;
  keepScanning: boolean;
  lastLocationId: number | null;
  /** The barcode being handled; also set by a scan elsewhere before opening the scan screen. */
  currentBarcode: string | null;
  /** Bumps on every scan, to replay the success flash. */
  scanCount: number;
  session: SessionRow[];
  setMode: (mode: ScanMode) => void;
  setKeepScanning: (keepScanning: boolean) => void;
  rememberLocation: (locationId: number) => void;
  showBarcode: (barcode: string) => void;
  clearBarcode: () => void;
  addSessionRow: (row: Omit<SessionRow, "id" | "undone">) => void;
  markUndone: (id: number) => void;
  clearSession: () => void;
};

// Private windows can block storage; the scanner still works, it just forgets the choices.
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      return;
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      return;
    }
  },
};

let nextRowId = 1;

export const useScanStore = create<ScanState>()(
  persist(
    (set) => ({
      mode: "add",
      keepScanning: true,
      lastLocationId: null,
      currentBarcode: null,
      scanCount: 0,
      session: [],
      setMode: (mode) => set({ mode }),
      setKeepScanning: (keepScanning) => set({ keepScanning }),
      rememberLocation: (locationId) => set({ lastLocationId: locationId }),
      showBarcode: (barcode) =>
        set((state) => ({
          currentBarcode: barcode.trim(),
          scanCount: state.scanCount + 1,
        })),
      clearBarcode: () => set({ currentBarcode: null }),
      addSessionRow: (row) =>
        set((state) => ({
          session: [{ ...row, id: nextRowId++, undone: false }, ...state.session],
        })),
      markUndone: (id) =>
        set((state) => ({
          session: state.session.map((row) =>
            row.id === id ? { ...row, undone: true } : row,
          ),
        })),
      clearSession: () => set({ session: [] }),
    }),
    {
      name: "pantrywood-scan",
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        mode: state.mode,
        keepScanning: state.keepScanning,
        lastLocationId: state.lastLocationId,
      }),
    },
  ),
);
