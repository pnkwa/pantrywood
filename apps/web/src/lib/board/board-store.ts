import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { BoardSchema, type Board, type BoardPiece } from "@pantrywood/shared";
import { z } from "zod";
import { localStorageRepository } from "@/lib/repository/local-storage";
import { addPiece, bringToFront, markRestocked, movePiece, removePiece, resizePiece, type NewPiece } from "./board";

// Saved through the Repository, so the board can move to apps/api later without touching the UI.
const SavedBoardSchema = z.object({ state: z.object({ board: BoardSchema }), version: z.number() });
const boardRepository = localStorageRepository("board", SavedBoardSchema);
const SAVED_ID = "board";

const repositoryStorage: StateStorage = {
  getItem: async () => {
    const saved = await boardRepository.get(SAVED_ID);
    return saved ? JSON.stringify(saved) : null;
  },
  setItem: async (_name, value) => {
    const saved = SavedBoardSchema.safeParse(JSON.parse(value));
    if (saved.success) await boardRepository.save(SAVED_ID, saved.data);
  },
  removeItem: () => boardRepository.remove(SAVED_ID),
};

type BoardState = {
  board: Board;
  add: (piece: NewPiece) => void;
  /** Changes a piece's content (text, paper, pin, links, lines, caption), never its placement. */
  edit: (id: string, change: (piece: BoardPiece) => BoardPiece) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number) => void;
  bringToFront: (id: string) => void;
  remove: (id: string) => void;
  restocked: (productId: number) => void;
};

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      board: { pieces: [] },
      add: (piece) => set((state) => ({ board: addPiece(state.board, piece) })),
      edit: (id, change) =>
        set((state) => ({
          board: { pieces: state.board.pieces.map((piece) => (piece.id === id ? change(piece) : piece)) },
        })),
      move: (id, x, y) => set((state) => ({ board: movePiece(state.board, id, x, y) })),
      resize: (id, w, h) => set((state) => ({ board: resizePiece(state.board, id, w, h) })),
      bringToFront: (id) => set((state) => ({ board: bringToFront(state.board, id) })),
      remove: (id) => set((state) => ({ board: removePiece(state.board, id) })),
      restocked: (productId) => set((state) => ({ board: markRestocked(state.board, productId) })),
    }),
    {
      name: "board",
      storage: createJSONStorage(() => repositoryStorage),
      partialize: (state) => ({ board: state.board }),
      version: 1,
    },
  ),
);
