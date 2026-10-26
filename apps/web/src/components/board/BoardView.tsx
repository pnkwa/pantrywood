"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { motion } from "motion/react";
import { ArrowLeftIcon, ArrowsOutSimpleIcon, PlusIcon, StackIcon, TrashIcon } from "@phosphor-icons/react";
import type { BoardPiece } from "@pantrywood/shared";
import { ConfirmDialog } from "@/components/decorate/ConfirmDialog";
import { BOARD_COLS, BOARD_ROWS, isResizable, movePiece, resizePiece } from "@/lib/board/board";
import { useBoardStore } from "@/lib/board/board-store";
import { boardLookFor } from "@/lib/board/look";
import { PANEL_SPRING } from "@/lib/motion";
import { useReceiptMemories } from "@/lib/receipt/store";
import { useRoomStore } from "@/lib/room/room-store";
import { useUiStore } from "@/lib/store/ui-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { PieceArt, pieceName } from "./PieceArt";

type Box = Pick<BoardPiece, "x" | "y" | "w" | "h">;
type Gesture = { id: string; mode: "move" | "resize"; pointerX: number; pointerY: number; origin: BoardPiece; changed: boolean };

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

// A small, stable tilt per piece so the board looks hand-pinned; accessories hang straight.
const tiltOf = (piece: BoardPiece) => {
  if (piece.kind === "accessory") return 0;
  const hash = [...piece.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ((hash % 7) - 3) * 0.7;
};

const percent = (cells: number, total: number) => `${(cells / total) * 100}%`;

const toolButton =
  "flex size-11 items-center justify-center rounded-[10px] transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";

export const BoardView = () => {
  const reducedMotion = useReducedMotion();
  const pieces = useBoardStore((state) => state.board.pieces);
  const move = useBoardStore((state) => state.move);
  const resize = useBoardStore((state) => state.resize);
  const bringToFront = useBoardStore((state) => state.bringToFront);
  const remove = useBoardStore((state) => state.remove);
  const selectedId = useUiStore((state) => state.boardPiece);
  const selectPiece = useUiStore((state) => state.selectBoardPiece);
  const closeBoard = useUiStore((state) => state.closeBoard);
  const setBoardSheet = useUiStore((state) => state.setBoardSheet);
  const look = boardLookFor(useRoomStore((state) => state.layout.pegboard));
  const receipts = useReceiptMemories();
  const receiptById = new Map((receipts.data ?? []).map((receipt) => [receipt.id, receipt]));
  const boardRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [draft, setDraft] = useState<{ id: string } & Box | null>(null);
  const [deleting, setDeleting] = useState<BoardPiece | null>(null);

  const boxOf = (piece: BoardPiece): Box => (draft?.id === piece.id ? draft : piece);
  const selected = pieces.find((piece) => piece.id === selectedId);
  const toolbarBelow = selected !== undefined && selected.y < 3;

  const startGesture = (event: PointerEvent<HTMLElement>, piece: BoardPiece, mode: Gesture["mode"]) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: piece.id, mode, pointerX: event.clientX, pointerY: event.clientY, origin: piece, changed: false };
  };

  const followPointer = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    const bounds = boardRef.current?.getBoundingClientRect();
    if (!current || !bounds) return;
    const columns = Math.round(((event.clientX - current.pointerX) / bounds.width) * BOARD_COLS);
    const rows = Math.round(((event.clientY - current.pointerY) / bounds.height) * BOARD_ROWS);
    if (columns === 0 && rows === 0 && !current.changed) return;
    current.changed = true;
    const { origin } = current;
    // The same rules as the saved board, so the piece snaps to pegs and stays on the board while it moves.
    const [next] = (
      current.mode === "move"
        ? movePiece({ pieces: [origin] }, origin.id, origin.x + columns, origin.y + rows)
        : resizePiece({ pieces: [origin] }, origin.id, origin.w + columns, origin.h + rows)
    ).pieces;
    if (next) setDraft({ id: origin.id, x: next.x, y: next.y, w: next.w, h: next.h });
  };

  const endGesture = () => {
    const current = gesture.current;
    gesture.current = null;
    if (!current) return;
    if (current.changed && draft?.id === current.id) {
      if (current.mode === "move") move(current.id, draft.x, draft.y);
      else resize(current.id, draft.w, draft.h);
    }
    setDraft(null);
    selectPiece(current.id);
    // A tap opens the piece to edit; a drag only moves it, so the sheet stays out of the way on phones.
    if (!current.changed) setBoardSheet(true);
  };

  const handleKey = (event: KeyboardEvent<HTMLElement>, piece: BoardPiece) => {
    const arrow = ARROWS[event.key];
    if (arrow) {
      event.preventDefault();
      if (event.shiftKey) resize(piece.id, piece.w + arrow[0], piece.h + arrow[1]);
      else move(piece.id, piece.x + arrow[0], piece.y + arrow[1]);
      selectPiece(piece.id);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectPiece(piece.id);
      setBoardSheet(true);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={closeBoard}
          aria-label="Back to the room"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-card transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeftIcon size={18} weight="bold" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-[13px] text-muted-foreground">Storage room / Pegboard</span>
          <h2 className="text-xl sm:text-2xl">Pegboard</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            selectPiece(null);
            setBoardSheet(true);
          }}
          className="ml-auto flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-sage-deep px-4 text-sm font-semibold text-primary-foreground shadow-[0_3px_0_#3F5236] transition-[transform,background-color] duration-150 ease-out hover:bg-sage-deep/85 active:translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
        >
          <PlusIcon size={16} weight="bold" aria-hidden />
          Add<span className="sr-only"> to the board, or decorate it</span>
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-start justify-center [container-type:size] lg:items-center" onPointerDown={() => selectPiece(null)}>
        <div className="relative aspect-[4/3] w-[min(100cqw,133cqh)] rounded-[18px] p-[10px] shadow-paper" style={{ backgroundColor: look.frame }}>
          <div
            ref={boardRef}
            role="group"
            aria-label={`Pegboard with ${pieces.length} ${pieces.length === 1 ? "piece" : "pieces"}. Use the arrow keys on a piece to move it, Shift and the arrows to resize it.`}
            className="relative size-full rounded-[10px]"
            style={{
              backgroundColor: look.board,
              backgroundImage: `radial-gradient(circle, ${look.hole} 0 14%, transparent 17%)`,
              backgroundSize: `${100 / BOARD_COLS}% ${100 / BOARD_ROWS}%`,
            }}
          >
            {pieces.length === 0 && (
              <p className="absolute inset-0 m-auto h-fit max-w-xs rounded-md border-[1.5px] border-dashed border-foreground/25 bg-card/80 px-4 py-5 text-center text-sm text-muted-foreground">
                The board is bare. Pin a note, a checklist, a receipt or a photo to get started.
              </p>
            )}
            {pieces.map((piece) => {
              const box = boxOf(piece);
              const isSelected = piece.id === selectedId;
              const receipt = piece.kind === "slip" ? receiptById.get(piece.receiptId) : undefined;
              return (
                <motion.div
                  key={piece.id}
                  layout
                  transition={reducedMotion ? { duration: 0 } : PANEL_SPRING}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={pieceName(piece, receipt)}
                  onPointerDown={(event) => startGesture(event, piece, "move")}
                  onPointerMove={followPointer}
                  onPointerUp={endGesture}
                  onPointerCancel={endGesture}
                  onKeyDown={(event) => handleKey(event, piece)}
                  style={{
                    left: percent(box.x, BOARD_COLS),
                    top: percent(box.y, BOARD_ROWS),
                    width: percent(box.w, BOARD_COLS),
                    height: percent(box.h, BOARD_ROWS),
                    zIndex: draft?.id === piece.id ? 999 : piece.z,
                  }}
                  className="absolute cursor-grab touch-none rounded-[6px] outline-offset-4 select-none focus-visible:outline-3 focus-visible:outline-ring active:cursor-grabbing"
                >
                  <div className="size-full p-[3px]" style={{ transform: `rotate(${tiltOf(piece)}deg)` }}>
                    <PieceArt piece={piece} receipt={receipt} />
                  </div>
                  {isSelected && (
                    <>
                      <span aria-hidden className="pointer-events-none absolute -inset-1.5 rounded-[10px] border-[3px] border-sage-deep" />
                      {isResizable(piece) && (
                        <span
                          aria-hidden
                          onPointerDown={(event) => startGesture(event, piece, "resize")}
                          className="absolute -right-3 -bottom-3 flex size-7 cursor-nwse-resize touch-none items-center justify-center rounded-[8px] border-[2.5px] border-sage-deep bg-card"
                        >
                          <ArrowsOutSimpleIcon size={12} weight="bold" className="text-sage-deep" />
                        </span>
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
          {selected && !draft && (
            <div
              role="toolbar"
              aria-label={`Selected: ${pieceName(selected, selected.kind === "slip" ? receiptById.get(selected.receiptId) : undefined)}`}
              onPointerDown={(event) => event.stopPropagation()}
              className={`absolute z-[1000] flex -translate-x-1/2 items-center gap-1 rounded-[16px] border-[1.5px] border-border bg-card p-1.5 shadow-[0_12px_24px_-12px_rgba(74,59,46,0.5)] animate-in fade-in zoom-in-95 duration-150 motion-reduce:zoom-in-100 ${
                toolbarBelow ? "" : "-translate-y-full"
              }`}
              style={{
                left: `calc(10px + ${percent(selected.x + selected.w / 2, BOARD_COLS)})`,
                // Near the top edge the toolbar drops below the piece instead of covering the header.
                top: toolbarBelow
                  ? `calc(10px + ${percent(selected.y + selected.h, BOARD_ROWS)} + 12px)`
                  : `calc(10px + ${percent(selected.y, BOARD_ROWS)} - 12px)`,
              }}
            >
              <button type="button" aria-label="Bring to front" onClick={() => bringToFront(selected.id)} className={toolButton}>
                <StackIcon size={18} weight="duotone" aria-hidden />
              </button>
              <button type="button" aria-label="Take it off the board" onClick={() => setDeleting(selected)} className={`${toolButton} text-destructive`}>
                <TrashIcon size={18} weight="duotone" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[13px] text-muted-foreground max-sm:hidden">
        Drag anything onto the pegs · notes, checklists and photos resize from their corner · tap a slip to see what it added to stock
      </p>

      <ConfirmDialog
        open={deleting !== null}
        title="Take it off the board?"
        confirmLabel="Take it off"
        onConfirm={() => {
          if (deleting) remove(deleting.id);
          setDeleting(null);
          selectPiece(null);
        }}
        onClose={() => setDeleting(null)}
      >
        {deleting?.kind === "slip"
          ? "The receipt stays in your receipt memories; only its slip leaves the board."
          : deleting?.kind === "accessory"
            ? "You still own it and can hang it again from the panel."
            : "This can't be undone."}
      </ConfirmDialog>
    </div>
  );
};
