"use client";

import { CheckIcon, PushPinIcon } from "@phosphor-icons/react";
import { useBoardStore } from "@/lib/board/board-store";
import { useUiStore } from "@/lib/store/ui-store";

/** Notes and checklist lines on the pegboard that point at this product (DESIGN.md section 16). */
export const LinkedNotes = ({ productId }: { productId: number }) => {
  const pieces = useBoardStore((state) => state.board.pieces);
  const openBoard = useUiStore((state) => state.openBoard);
  const selectBoardPiece = useUiStore((state) => state.selectBoardPiece);
  const notes = pieces.flatMap((piece) => {
    if (piece.kind === "note") {
      const link = piece.links.find((candidate) => candidate.productId === productId);
      return link ? [{ id: piece.id, text: piece.text.trim() || "A note", done: link.restocked }] : [];
    }
    if (piece.kind === "checklist") {
      return piece.lines
        .filter((line) => line.productId === productId)
        .map((line) => ({ id: piece.id, text: `${piece.title || "Checklist"}: ${line.text || "a line"}`, done: line.done }));
    }
    return [];
  });
  if (notes.length === 0) return null;
  return (
    <section aria-label="On the pegboard" className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">On the pegboard</span>
      <ul className="flex flex-col gap-1.5">
        {notes.map((note, index) => (
          <li key={`${note.id}-${index}`}>
            <button
              type="button"
              onClick={() => {
                openBoard();
                selectBoardPiece(note.id);
                useUiStore.getState().setBoardSheet(true);
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded-[12px] border-[1.5px] border-border bg-[#FFF1C9] px-3 text-left text-sm transition-colors duration-150 ease-out hover:bg-[#FBEBC8] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-card"
            >
              {note.done ? (
                <CheckIcon size={16} weight="bold" aria-hidden className="shrink-0 text-sage-deep" />
              ) : (
                <PushPinIcon size={16} weight="duotone" aria-hidden className="shrink-0 text-terracotta" />
              )}
              <span className={`min-w-0 flex-1 truncate ${note.done ? "text-muted-foreground line-through" : ""}`}>{note.text}</span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">{note.done ? "Restocked" : "Open"}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
