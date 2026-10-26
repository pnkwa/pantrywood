// No "@/" imports: scripts/board.test.mjs runs this file directly with Node.
import type { Board, BoardPiece } from "@pantrywood/shared";

export const BOARD_COLS = 24;
export const BOARD_ROWS = 18;
const MIN_SIZE = 3;

type Rect = { x: number; y: number; w: number; h: number };

const overlaps = (first: Rect, second: Rect) =>
  first.x < second.x + second.w &&
  second.x < first.x + first.w &&
  first.y < second.y + second.h &&
  second.y < first.y + first.h;

/** Kept on the board: no piece hangs off an edge or is bigger than the board. */
const clamp = <T extends Rect>(rect: T): T => {
  const w = Math.min(BOARD_COLS, rect.w);
  const h = Math.min(BOARD_ROWS, rect.h);
  return {
    ...rect,
    w,
    h,
    x: Math.min(BOARD_COLS - w, Math.max(0, rect.x)),
    y: Math.min(BOARD_ROWS - h, Math.max(0, rect.y)),
  };
};

/** The first gap, row by row, where a new piece covers nothing; the top-left corner when the board is full. */
export const freeSpot = (pieces: readonly Rect[], w: number, h: number): { x: number; y: number } => {
  for (let y = 0; y + h <= BOARD_ROWS; y++) {
    for (let x = 0; x + w <= BOARD_COLS; x++) {
      if (!pieces.some((piece) => overlaps(piece, { x, y, w, h }))) return { x, y };
    }
  }
  return { x: 0, y: 0 };
};

const topZ = (board: Board) => board.pieces.reduce((top, piece) => Math.max(top, piece.z), 0);

export type NewPiece = DistributiveOmit<BoardPiece, "x" | "y" | "z">;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Hangs a new piece in the first free gap, in front of everything else. */
export const addPiece = (board: Board, piece: NewPiece): Board => {
  const spot = freeSpot(board.pieces, piece.w, piece.h);
  const placed: BoardPiece = clamp({ ...piece, ...spot, z: topZ(board) + 1 });
  return { pieces: [...board.pieces, placed] };
};

const update = (board: Board, id: string, change: (piece: BoardPiece) => BoardPiece): Board => ({
  pieces: board.pieces.map((piece) => (piece.id === id ? change(piece) : piece)),
});

export const movePiece = (board: Board, id: string, x: number, y: number) =>
  update(board, id, (piece) => clamp({ ...piece, x, y }));

/** Notes, checklists and photos can be resized; slips and accessories keep their size. */
export const isResizable = (piece: BoardPiece) => piece.kind === "note" || piece.kind === "checklist" || piece.kind === "photo";

/** Resizing never shrinks a piece below a few holes, so its text and pin stay readable. */
export const resizePiece = (board: Board, id: string, w: number, h: number) =>
  update(board, id, (piece) =>
    isResizable(piece) ? clamp({ ...piece, w: Math.max(MIN_SIZE, w), h: Math.max(MIN_SIZE, h) }) : piece,
  );

export const bringToFront = (board: Board, id: string) => {
  const front = topZ(board);
  return update(board, id, (piece) => (piece.z === front ? piece : { ...piece, z: front + 1 }));
};

export const removePiece = (board: Board, id: string): Board => ({
  pieces: board.pieces.filter((piece) => piece.id !== id),
});

/** A restock ticks off every note link and checklist line that points at the product. */
export const markRestocked = (board: Board, productId: number): Board => ({
  pieces: board.pieces.map((piece) => {
    if (piece.kind === "note" && piece.links.some((link) => link.productId === productId)) {
      return { ...piece, links: piece.links.map((link) => (link.productId === productId ? { ...link, restocked: true } : link)) };
    }
    if (piece.kind === "checklist" && piece.lines.some((line) => line.productId === productId)) {
      return { ...piece, lines: piece.lines.map((line) => (line.productId === productId ? { ...line, done: true } : line)) };
    }
    return piece;
  }),
});

/** A linked note is done once everything it links to has been restocked. */
export const isNoteDone = (piece: BoardPiece) =>
  piece.kind === "note" && piece.links.length > 0 && piece.links.every((link) => link.restocked);
