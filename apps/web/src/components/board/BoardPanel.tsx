"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BarcodeIcon,
  CheckSquareIcon,
  ImageIcon,
  MinusIcon,
  NoteIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { NotePaperSchema, PinStyleSchema, THAI_NAME_USERFIELD, type BoardPiece } from "@pantrywood/shared";
import { Combobox } from "@/components/ui/combobox";
import { CATALOG, catalogItem } from "@/data/catalog";
import { isResizable } from "@/lib/board/board";
import { useBoardStore } from "@/lib/board/board-store";
import { boardLookFor, PAPERS, PIN_NAMES } from "@/lib/board/look";
import { useProducts } from "@/lib/grocy/queries";
import { MAX_PICTURE_BYTES, preparePicture } from "@/lib/inside/pictures";
import { OPEN_SCAN } from "@/lib/page-transitions";
import { formatDate, formatNumber } from "@/lib/pantry/format";
import type { Pantry } from "@/lib/pantry/model";
import { useReceiptMemories } from "@/lib/receipt/store";
import type { useDecorate } from "@/lib/room/use-decorate";
import { useRoomStore } from "@/lib/room/room-store";
import { useUiStore } from "@/lib/store/ui-store";
import { CloseButton } from "@/components/pantry/StoragePanel";
import { pieceName } from "./PieceArt";

const BOARDS = CATALOG.filter((item) => item.category === "pegboard" && item.kind === "board");
const ACCESSORIES = CATALOG.filter((item) => item.category === "pegboard" && item.kind === "accessory");
const RECENT_RECEIPTS = 5;

const fieldClass =
  "w-full rounded-[12px] border-[1.5px] border-border bg-card px-3 py-2.5 text-[15px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";
const pillClass = (active: boolean) =>
  `h-11 rounded-full border-[1.5px] px-3.5 text-sm transition-colors duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
    active ? "border-sage-deep bg-card font-semibold" : "border-border bg-muted font-medium text-muted-foreground hover:text-foreground"
  }`;
const squareButton =
  "flex size-11 items-center justify-center rounded-[12px] border-[1.5px] border-border bg-card transition-colors duration-150 ease-out hover:bg-muted/40 disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-sm font-semibold">{title}</h3>
    {children}
  </section>
);

const useProductOptions = () => {
  const products = useProducts();
  const options = (products.data ?? [])
    .filter((product) => product.active !== 0)
    .map((product) => ({
      value: String(product.id),
      label: product.name,
      keywords: [product.userfields?.[THAI_NAME_USERFIELD] ?? ""].filter(Boolean),
    }));
  return { options, nameOf: (productId: number) => options.find((option) => option.value === String(productId))?.label ?? "An item" };
};

/** The button version of dragging and resizing on the board. */
const Placement = ({ piece }: { piece: BoardPiece }) => {
  const move = useBoardStore((state) => state.move);
  const resize = useBoardStore((state) => state.resize);
  return (
    <Section title="Place it">
      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label="Move" className="flex gap-1">
          <button type="button" aria-label="Move left" onClick={() => move(piece.id, piece.x - 1, piece.y)} className={squareButton}><ArrowLeftIcon size={16} weight="bold" aria-hidden /></button>
          <button type="button" aria-label="Move up" onClick={() => move(piece.id, piece.x, piece.y - 1)} className={squareButton}><ArrowUpIcon size={16} weight="bold" aria-hidden /></button>
          <button type="button" aria-label="Move down" onClick={() => move(piece.id, piece.x, piece.y + 1)} className={squareButton}><ArrowDownIcon size={16} weight="bold" aria-hidden /></button>
          <button type="button" aria-label="Move right" onClick={() => move(piece.id, piece.x + 1, piece.y)} className={squareButton}><ArrowRightIcon size={16} weight="bold" aria-hidden /></button>
        </div>
        {isResizable(piece) && (
          <div role="group" aria-label="Size" className="flex gap-1">
            <button type="button" aria-label="Smaller" onClick={() => resize(piece.id, piece.w - 1, piece.h - 1)} className={squareButton}><MinusIcon size={16} weight="bold" aria-hidden /></button>
            <button type="button" aria-label="Bigger" onClick={() => resize(piece.id, piece.w + 1, piece.h + 1)} className={squareButton}><PlusIcon size={16} weight="bold" aria-hidden /></button>
          </div>
        )}
      </div>
    </Section>
  );
};

const PinPicker = ({ piece }: { piece: Extract<BoardPiece, { pin: unknown }> }) => {
  const edit = useBoardStore((state) => state.edit);
  return (
    <Section title="Hold it with">
      <div role="group" aria-label="Pin style" className="flex flex-wrap gap-1.5">
        {PinStyleSchema.options.map((pin) => (
          <button
            key={pin}
            type="button"
            aria-pressed={piece.pin === pin}
            onClick={() => edit(piece.id, (current) => ("pin" in current ? { ...current, pin } : current))}
            className={pillClass(piece.pin === pin)}
          >
            {PIN_NAMES[pin]}
          </button>
        ))}
      </div>
    </Section>
  );
};

const NoteEditor = ({ piece }: { piece: Extract<BoardPiece, { kind: "note" }> }) => {
  const edit = useBoardStore((state) => state.edit);
  const textId = useId();
  const { options, nameOf } = useProductOptions();
  const linked = new Set(piece.links.map((link) => link.productId));
  const setNote = (change: Partial<typeof piece>) => edit(piece.id, (current) => (current.kind === "note" ? { ...current, ...change } : current));
  return (
    <>
      <label htmlFor={textId} className="flex flex-col gap-1.5 text-sm font-semibold">
        Text
        <textarea
          id={textId}
          rows={3}
          value={piece.text}
          onChange={(event) => setNote({ text: event.target.value })}
          placeholder="Buy tissue + rice before Sunday"
          className={`${fieldClass} resize-y font-normal`}
          style={{ backgroundColor: PAPERS[piece.paper].color }}
        />
      </label>
      <Section title="Paper">
        <div className="flex gap-2">
          {NotePaperSchema.options.map((paper) => (
            <button
              key={paper}
              type="button"
              aria-label={PAPERS[paper].label}
              aria-pressed={piece.paper === paper}
              onClick={() => setNote({ paper })}
              className={`size-11 rounded-[12px] transition-[border-color] duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                piece.paper === paper ? "border-[2.5px] border-sage-deep" : "border-[1.5px] border-border"
              }`}
              style={{ backgroundColor: PAPERS[paper].color }}
            />
          ))}
        </div>
      </Section>
      <PinPicker piece={piece} />
      <Section title="Linked items">
        <div className="flex flex-wrap items-center gap-1.5">
          {piece.links.map((link) => (
            <span key={link.productId} className="inline-flex items-center gap-1 rounded-full bg-status-fresh py-1 pr-1 pl-3 text-sm font-semibold text-status-fresh-foreground">
              {nameOf(link.productId)}
              {link.restocked && " · restocked"}
              <button
                type="button"
                aria-label={`Unlink ${nameOf(link.productId)}`}
                onClick={() => setNote({ links: piece.links.filter((other) => other.productId !== link.productId) })}
                className="flex size-7 items-center justify-center rounded-full hover:bg-card/60 focus-visible:outline-3 focus-visible:outline-ring"
              >
                <XIcon size={12} weight="bold" aria-hidden />
              </button>
            </span>
          ))}
          <Combobox
            value=""
            placeholder="+ Link item"
            options={options.filter((option) => !linked.has(Number(option.value)))}
            onChange={(value) => setNote({ links: [...piece.links, { productId: Number(value), restocked: false }] })}
            className="h-11 w-44"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Linked items show this note in their details, and the note ticks itself off when they are restocked.
        </p>
      </Section>
    </>
  );
};

const ChecklistEditor = ({ piece }: { piece: Extract<BoardPiece, { kind: "checklist" }> }) => {
  const edit = useBoardStore((state) => state.edit);
  const titleId = useId();
  const { options } = useProductOptions();
  const setList = (change: Partial<typeof piece>) => edit(piece.id, (current) => (current.kind === "checklist" ? { ...current, ...change } : current));
  const setLine = (lineId: string, change: Partial<(typeof piece.lines)[number]>) =>
    setList({ lines: piece.lines.map((line) => (line.id === lineId ? { ...line, ...change } : line)) });
  return (
    <>
      <label htmlFor={titleId} className="flex flex-col gap-1.5 text-sm font-semibold">
        Title
        <input id={titleId} value={piece.title} onChange={(event) => setList({ title: event.target.value })} className={`${fieldClass} font-normal`} />
      </label>
      <Section title="Lines">
        <ul className="flex flex-col gap-2">
          {piece.lines.map((line) => (
            <li key={line.id} className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                aria-label={`${line.text || "Line"} done`}
                checked={line.done}
                onChange={(event) => setLine(line.id, { done: event.target.checked })}
                className="size-5 accent-sage-deep"
              />
              <input
                aria-label="Line text"
                value={line.text}
                onChange={(event) => setLine(line.id, { text: event.target.value })}
                className={`${fieldClass} min-w-0 flex-1 py-2`}
              />
              <Combobox
                value={line.productId === null ? "" : String(line.productId)}
                placeholder="Link item"
                options={options}
                onChange={(value) => setLine(line.id, { productId: Number(value) })}
                className="h-11 w-36"
              />
              <button
                type="button"
                aria-label={`Remove ${line.text || "line"}`}
                onClick={() => setList({ lines: piece.lines.filter((other) => other.id !== line.id) })}
                className={squareButton}
              >
                <XIcon size={14} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setList({ lines: [...piece.lines, { id: crypto.randomUUID(), text: "", done: false, productId: null }] })}
          className="flex h-11 w-fit items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-border px-4 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <PlusIcon size={14} weight="bold" aria-hidden />
          Add line
        </button>
        <p className="text-xs text-muted-foreground">A line linked to an item ticks itself off when that item is restocked.</p>
      </Section>
      <PinPicker piece={piece} />
    </>
  );
};

const SlipDetails = ({ piece, pantry }: { piece: Extract<BoardPiece, { kind: "slip" }>; pantry: Pantry | null }) => {
  const receipts = useReceiptMemories();
  const closeBoard = useUiStore((state) => state.closeBoard);
  const selectItem = useUiStore((state) => state.selectItem);
  const receipt = receipts.data?.find((candidate) => candidate.id === piece.receiptId);
  const locationOf = (productId: number) =>
    pantry?.locations.find((location) => location.items.some((item) => item.productId === productId && item.amount > 0));
  if (!receipt) return <p className="text-sm text-muted-foreground">This receipt is no longer in your receipt memories.</p>;
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {[receipt.store, receipt.date ? formatDate(receipt.date) : null, `${receipt.lineCount} lines`].filter(Boolean).join(" · ")}
      </p>
      <Section title="Added to stock">
        {receipt.added?.length ? (
          <ul className="flex flex-col gap-1.5">
            {receipt.added.map((added) => {
              const location = locationOf(added.productId);
              return (
                <li key={added.productId} className="flex items-center justify-between gap-2 rounded-[12px] border-[1.5px] border-border bg-card px-3 py-1.5">
                  <span className="min-w-0 truncate text-sm">
                    {added.name} <span className="tabular text-muted-foreground">× {formatNumber(added.amount)}</span>
                  </span>
                  {location ? (
                    <button
                      type="button"
                      onClick={() => {
                        closeBoard();
                        selectItem(location.id, added.productId);
                      }}
                      className="h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-sage-deep transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      Open
                    </button>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">Used up</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">This receipt was kept before slips remembered what they added.</p>
        )}
      </Section>
      <PinPicker piece={piece} />
    </>
  );
};

const PhotoEditor = ({ piece }: { piece: Extract<BoardPiece, { kind: "photo" }> }) => {
  const edit = useBoardStore((state) => state.edit);
  const captionId = useId();
  return (
    <>
      <label htmlFor={captionId} className="flex flex-col gap-1.5 text-sm font-semibold">
        Caption
        <input
          id={captionId}
          value={piece.caption}
          placeholder="new fridge!"
          onChange={(event) => edit(piece.id, (current) => (current.kind === "photo" ? { ...current, caption: event.target.value } : current))}
          className={`${fieldClass} font-normal`}
        />
        <span className="text-xs font-normal text-muted-foreground">Also read aloud to screen readers.</span>
      </label>
      <PinPicker piece={piece} />
    </>
  );
};

const PieceEditor = ({ piece, pantry }: { piece: BoardPiece; pantry: Pantry | null }) => {
  const receipts = useReceiptMemories();
  const selectPiece = useUiStore((state) => state.selectBoardPiece);
  const receipt = piece.kind === "slip" ? receipts.data?.find((candidate) => candidate.id === piece.receiptId) : undefined;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 text-[22px] leading-tight">{pieceName(piece, receipt)}</h2>
        <CloseButton label="Done with this piece" onClick={() => selectPiece(null)} />
      </div>
      {piece.kind === "note" && <NoteEditor piece={piece} />}
      {piece.kind === "checklist" && <ChecklistEditor piece={piece} />}
      {piece.kind === "slip" && <SlipDetails piece={piece} pantry={pantry} />}
      {piece.kind === "photo" && <PhotoEditor piece={piece} />}
      <Placement piece={piece} />
    </div>
  );
};

const addButton =
  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-border bg-card px-2 py-2.5 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";

const AddAndDecorate = ({ decorate }: { decorate: ReturnType<typeof useDecorate> }) => {
  const photoId = useId();
  const add = useBoardStore((state) => state.add);
  const pieces = useBoardStore((state) => state.board.pieces);
  const selectPiece = useUiStore((state) => state.selectBoardPiece);
  const showToast = useUiStore((state) => state.showToast);
  const layout = useRoomStore((state) => state.layout);
  const receipts = useReceiptMemories();
  const [savingPhoto, setSavingPhoto] = useState(false);
  const currentBoard = layout.pegboard ?? BOARDS[0]?.id;
  const pinned = new Set(pieces.flatMap((piece) => (piece.kind === "slip" ? [piece.receiptId] : [])));
  const unpinned = (receipts.data ?? []).filter((receipt) => !pinned.has(receipt.id)).slice(0, RECENT_RECEIPTS);

  const addAndSelect = (piece: Parameters<typeof add>[0]) => {
    add(piece);
    selectPiece(piece.id);
  };

  const addPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_PICTURE_BYTES) return showToast("That picture is over 2 MB. Try a smaller one.", "error");
    setSavingPhoto(true);
    try {
      // PNGs keep their transparency and hang without a polaroid frame (DESIGN.md section 15).
      const framed = file.type !== "image/png";
      const dataUrl = await preparePicture(file, false);
      addAndSelect({ id: crypto.randomUUID(), kind: "photo", pin: "pushPin", dataUrl, framed, caption: "", w: framed ? 5 : 4, h: framed ? 6 : 4 });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn't add that picture", "error");
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title="Add to board">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => addAndSelect({ id: crypto.randomUUID(), kind: "note", pin: "magnet", paper: "butter", text: "", links: [], w: 5, h: 5 })}
            className={addButton}
          >
            <NoteIcon size={20} weight="duotone" aria-hidden />
            Note
          </button>
          <button
            type="button"
            onClick={() =>
              addAndSelect({
                id: crypto.randomUUID(),
                kind: "checklist",
                pin: "washi",
                title: "Restock",
                lines: [{ id: crypto.randomUUID(), text: "", done: false, productId: null }],
                w: 6,
                h: 7,
              })
            }
            className={addButton}
          >
            <CheckSquareIcon size={20} weight="duotone" aria-hidden />
            Checklist
          </button>
          <Link href="/scan/receipt" transitionTypes={OPEN_SCAN} className={addButton}>
            <BarcodeIcon size={20} weight="duotone" aria-hidden />
            Scan slip
          </Link>
          <label htmlFor={photoId} className={`${addButton} relative cursor-pointer focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring`}>
            <ImageIcon size={20} weight="duotone" aria-hidden />
            {savingPhoto ? "Adding…" : "Photo / PNG"}
            <input
              id={photoId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={savingPhoto}
              onChange={(event) => void addPhoto(event.target.files?.[0])}
              className="absolute size-px opacity-0"
            />
          </label>
        </div>
        {unpinned.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Pin a kept receipt</span>
            <ul className="flex flex-wrap gap-1.5">
              {unpinned.map((receipt) => (
                <li key={receipt.id}>
                  <button
                    type="button"
                    onClick={() => addAndSelect({ id: crypto.randomUUID(), kind: "slip", pin: "clip", receiptId: receipt.id, w: 5, h: 8 })}
                    className={pillClass(false)}
                  >
                    {receipt.store ?? "Receipt"}
                    {receipt.date ? ` · ${formatDate(receipt.date)}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Decorate the board">
        <div role="group" aria-label="Board color" className="flex gap-2">
          {BOARDS.map((board) => {
            const look = boardLookFor(board.id);
            return (
              <button
                key={board.id}
                type="button"
                aria-pressed={board.id === currentBoard}
                aria-label={board.name}
                title={board.name}
                onClick={() => board.id !== currentBoard && decorate.chooseItem(board, null)}
                className={`size-11 rounded-[12px] transition-[border-color] duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  board.id === currentBoard ? "border-[2.5px] border-sage-deep" : "border-[1.5px] border-border"
                }`}
                style={{
                  backgroundColor: look.board,
                  backgroundImage: `radial-gradient(circle, ${look.hole} 0 18%, transparent 22%)`,
                  backgroundSize: "8px 8px",
                }}
              />
            );
          })}
        </div>
        <ul className="flex flex-col gap-1.5">
          {ACCESSORIES.map((item) => {
            const onBoard = pieces.some((piece) => piece.kind === "accessory" && piece.itemId === item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => decorate.chooseItem(item, null)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[12px] border-[1.5px] border-border bg-card px-3 text-left text-sm transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className={`text-xs font-semibold ${onBoard ? "text-status-fresh-foreground" : "text-muted-foreground"}`}>
                    {onBoard ? "On board" : "Hang it"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
};

/** The board's side panel (bottom sheet on phones): edit the picked piece, or add to and decorate the board. */
export const BoardPanel = ({ pantry, decorate }: { pantry: Pantry | null; decorate: ReturnType<typeof useDecorate> }) => {
  const selectedId = useUiStore((state) => state.boardPiece);
  const piece = useBoardStore((state) => state.board.pieces.find((candidate) => candidate.id === selectedId));
  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      {piece && piece.kind !== "accessory" ? (
        <PieceEditor key={piece.id} piece={piece} pantry={pantry} />
      ) : (
        <>
          {piece && (
            <div className="mb-4 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-[22px] leading-tight">{catalogItem(piece.itemId)?.name ?? "Accessory"}</h2>
                <CloseButton label="Done with this piece" onClick={() => useUiStore.getState().selectBoardPiece(null)} />
              </div>
              <Placement piece={piece} />
            </div>
          )}
          <AddAndDecorate decorate={decorate} />
        </>
      )}
    </div>
  );
};
