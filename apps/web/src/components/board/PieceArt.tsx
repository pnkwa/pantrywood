"use client";

import type { BoardPiece, PinStyle, ReceiptMemory } from "@pantrywood/shared";
import { CheckIcon } from "@phosphor-icons/react";
import { catalogItem, type AccessoryKind } from "@/data/catalog";
import { isNoteDone } from "@/lib/board/board";
import { PAPERS, SLIP_PAPER } from "@/lib/board/look";
import { formatDate, formatMoney } from "@/lib/pantry/format";

// Zig-zag torn bottom edge for receipt slips.
const TORN_EDGE =
  "polygon(0 0,100% 0,100% 96%,95% 100%,90% 96%,85% 100%,80% 96%,75% 100%,70% 96%,65% 100%,60% 96%,55% 100%,50% 96%,45% 100%,40% 96%,35% 100%,30% 96%,25% 100%,20% 96%,15% 100%,10% 96%,5% 100%,0 96%)";

export const Pin = ({ style }: { style: PinStyle }) => {
  switch (style) {
    case "magnet":
      return <span aria-hidden className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-terracotta shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.15)]" />;
    case "pushPin":
      return (
        <span aria-hidden className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 flex-col items-center">
          <span className="size-3.5 rounded-full bg-[#D9604A] shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.18)]" />
          <span className="h-1.5 w-0.5 bg-[#A9AAA4]" />
        </span>
      );
    case "washi":
      return <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-[45%] -translate-x-1/2 -rotate-3 bg-sage/80" />;
    case "clip":
      return (
        <span aria-hidden className="absolute -top-3 left-1/2 flex w-[34%] -translate-x-1/2 flex-col items-center">
          <span className="h-2 w-[70%] rounded-t-full border-2 border-b-0 border-[#A9AAA4]" />
          <span className="h-3 w-full rounded-[4px] bg-foreground" />
        </span>
      );
  }
};

/** Each accessory drawn flat, in its catalog colors, filling its box. */
export const AccessoryArt = ({ kind, colors: [main, second] }: { kind: AccessoryKind; colors: [string, string] }) => {
  switch (kind) {
    case "lights":
      return (
        <svg viewBox="0 0 240 20" preserveAspectRatio="none" className="size-full" aria-hidden>
          <path d="M0,4 Q30,16 60,6 T120,6 T180,6 T240,4" fill="none" stroke={second} strokeWidth="1.5" />
          {[20, 50, 80, 110, 140, 170, 200, 228].map((x, index) => (
            <circle key={x} cx={x} cy={index % 2 ? 11 : 13} r="4" fill={index % 3 === 1 ? "#E9A9A9" : index % 3 === 2 ? "#A9C9DA" : main} />
          ))}
        </svg>
      );
    case "shelf":
      return (
        <svg viewBox="0 0 80 40" className="size-full" aria-hidden>
          <path d="M8,26 h12 l-2,10 h-8 z" fill="#C8755A" />
          <circle cx="12" cy="20" r="6" fill={second} />
          <circle cx="18" cy="17" r="5" fill="#A9BC95" />
          <rect x="34" y="20" width="9" height="12" rx="2" fill="#A9C9DA" />
          <rect x="52" y="24" width="14" height="10" rx="3" fill="#F7F4EE" stroke="#E2DCCF" />
          <rect x="2" y="34" width="76" height="4" rx="1" fill={main} />
        </svg>
      );
    case "penCup":
      return (
        <svg viewBox="0 0 20 30" className="size-full" aria-hidden>
          <path d="M6,12 l-2,-9 M10,12 v-11 M14,12 l3,-8" stroke="#4A3B2E" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="3" y="11" width="14" height="17" rx="3" fill={main} />
          <circle cx="4" cy="3" r="1.5" fill={second} />
        </svg>
      );
    case "toteHook":
      return (
        <svg viewBox="0 0 40 50" className="size-full" aria-hidden>
          <path d="M20,2 v6 q0,4 4,4" stroke={second} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M12,22 q0,-12 8,-12 q8,0 8,12" fill="none" stroke="#7E9A68" strokeWidth="2.5" />
          <path d="M6,20 h28 l-3,28 h-22 z" fill={main} />
          <path d="M13,36 c0,-5 3,-8 7,-8 0,4 -3,8 -7,8z" fill="#FFFBF3" />
        </svg>
      );
    case "clips":
      return (
        <svg viewBox="0 0 30 20" className="size-full" aria-hidden>
          {[3, 17].map((x) => (
            <g key={x}>
              <path d={`M${x + 2},8 q3,-7 6,0`} fill="none" stroke="#A9AAA4" strokeWidth="1.5" />
              <rect x={x} y="8" width="10" height="9" rx="1.5" fill={x === 3 ? main : second} />
            </g>
          ))}
        </svg>
      );
    case "basket":
      return (
        <svg viewBox="0 0 40 30" className="size-full" aria-hidden>
          <path d="M3,6 h34 l-3,22 h-28 z" fill={second} stroke={main} strokeWidth="2" />
          <path d="M10,6 v22 M17,6 v22 M24,6 v22 M31,6 v22 M4,16 h32" stroke={main} strokeWidth="1.2" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 30 30" className="size-full" aria-hidden>
          <circle cx="15" cy="15" r="13" fill={main} />
          <circle cx="15" cy="15" r="10" fill={second} />
          <path d="M15,8 v7 l5,3" stroke="#4A3B2E" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "stickers":
      return (
        <svg viewBox="0 0 30 20" className="size-full" aria-hidden>
          <g fill="#FFFFFF" stroke="#EADFC9" strokeWidth="0.6" transform="translate(8 10)">
            <ellipse cy="-4" rx="2.5" ry="3.5" />
            <ellipse cy="4" rx="2.5" ry="3.5" />
            <ellipse cx="-4" rx="3.5" ry="2.5" />
            <ellipse cx="4" rx="3.5" ry="2.5" />
          </g>
          <circle cx="8" cy="10" r="2.5" fill={main} />
          <path d="M22,4 q5,0 5,6 q0,6 -5,8 q-5,-2 -5,-8 q0,-6 5,-6z" fill={second} />
          <path d="M19,5 l3,2 3,-2" stroke="#8FA67A" strokeWidth="1.5" fill="none" />
        </svg>
      );
  }
};

/** How a piece looks on the board; `receipt` is the slip's kept receipt when it still exists. */
export const PieceArt = ({ piece, receipt }: { piece: BoardPiece; receipt?: ReceiptMemory }) => {
  switch (piece.kind) {
    case "note": {
      const paper = PAPERS[piece.paper];
      const done = isNoteDone(piece);
      return (
        <div
          className={`relative flex size-full flex-col gap-1 rounded-[3px] p-[10%] shadow-[0_4px_8px_rgba(74,59,46,0.22)] ${
            piece.paper === "lined" ? "bg-[repeating-linear-gradient(transparent_0_17px,#D3E2E6_17px_18px)]" : ""
          }`}
          style={{ backgroundColor: paper.color }}
        >
          <p className={`line-clamp-6 text-[clamp(11px,1.5cqw,17px)] leading-snug font-medium break-words whitespace-pre-line ${done ? "text-muted-foreground line-through" : ""}`}>
            {piece.text || "New note"}
          </p>
          {piece.links.length > 0 && (
            <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-status-fresh px-2 py-0.5 text-[10px] font-semibold text-status-fresh-foreground">
              {done && <CheckIcon size={10} weight="bold" aria-hidden />}
              {done ? "Restocked" : `${piece.links.length} ${piece.links.length === 1 ? "item" : "items"}`}
            </span>
          )}
          <Pin style={piece.pin} />
        </div>
      );
    }
    case "checklist":
      return (
        <div className="relative flex size-full flex-col gap-1 rounded-[3px] bg-[#FFFDF8] bg-[repeating-linear-gradient(transparent_0_19px,#D3E2E6_19px_20px)] p-[9%] shadow-[0_4px_8px_rgba(74,59,46,0.22)]">
          <p className="truncate text-[clamp(11px,1.5cqw,16px)] font-semibold">{piece.title || "Checklist"}</p>
          <ul className="flex min-h-0 flex-col gap-0.5 overflow-hidden text-[clamp(10px,1.3cqw,14px)]">
            {piece.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-1.5">
                <span aria-hidden className={`flex size-3 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] ${line.done ? "border-sage-deep bg-sage-deep text-primary-foreground" : "border-muted-foreground"}`}>
                  {line.done && <CheckIcon size={8} weight="bold" />}
                </span>
                <span className={`truncate ${line.done ? "text-muted-foreground line-through" : ""}`}>{line.text}</span>
              </li>
            ))}
          </ul>
          <Pin style={piece.pin} />
        </div>
      );
    case "slip":
      return (
        <div className="relative size-full drop-shadow-[0_4px_4px_rgba(74,59,46,0.22)]">
          <div className="flex size-full flex-col items-center gap-0.5 px-[10%] pt-[14%] pb-[16%] text-center" style={{ backgroundColor: SLIP_PAPER, clipPath: TORN_EDGE }}>
            <p className="w-full truncate text-[clamp(11px,1.4cqw,15px)] font-semibold uppercase">{receipt?.store ?? "Receipt"}</p>
            {receipt?.date && <p className="text-[clamp(9px,1.1cqw,12px)] text-muted-foreground">{formatDate(receipt.date)}</p>}
            <span aria-hidden className="my-1 w-full border-t border-dashed border-[#C9B79A]" />
            <p className="text-[clamp(10px,1.2cqw,13px)]">{receipt ? `${receipt.lineCount} lines` : "Receipt removed"}</p>
            {receipt?.total !== null && receipt?.total !== undefined && (
              <p className="tabular text-[clamp(11px,1.3cqw,14px)] font-semibold">{formatMoney(receipt.total, receipt.currency)}</p>
            )}
            {receipt?.added && receipt.added.length > 0 && (
              <span className="mt-auto -rotate-6 rounded-[6px] border-2 border-sage-deep px-1.5 text-[clamp(9px,1.1cqw,12px)] font-semibold tracking-wider text-sage-deep">
                ADDED · {receipt.added.length}
              </span>
            )}
          </div>
          <Pin style={piece.pin} />
        </div>
      );
    case "photo":
      return (
        <div className={`relative size-full ${piece.framed ? "flex flex-col bg-white p-[7%] pb-[4%] shadow-[0_4px_8px_rgba(74,59,46,0.22)]" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimize */}
          <img
            src={piece.dataUrl}
            alt={piece.caption}
            draggable={false}
            className={piece.framed ? "min-h-0 w-full flex-1 object-cover" : "size-full object-contain drop-shadow-[0_4px_4px_rgba(74,59,46,0.22)]"}
          />
          {piece.framed && piece.caption && (
            <p className="truncate pt-1 text-center text-[clamp(10px,1.2cqw,13px)] text-muted-foreground">{piece.caption}</p>
          )}
          <Pin style={piece.pin} />
        </div>
      );
    case "accessory": {
      const item = catalogItem(piece.itemId);
      return item?.category === "pegboard" && item.kind === "accessory" ? (
        <AccessoryArt kind={item.model.accessory} colors={item.model.colors} />
      ) : null;
    }
  }
};

export const pieceName = (piece: BoardPiece, receipt?: ReceiptMemory) => {
  switch (piece.kind) {
    case "note":
      return `Note: ${piece.text.trim().split("\n")[0] || "empty"}`;
    case "checklist":
      return `Checklist: ${piece.title || "untitled"}`;
    case "slip":
      return `Receipt slip${receipt?.store ? ` from ${receipt.store}` : ""}`;
    case "photo":
      return `Photo${piece.caption ? `: ${piece.caption}` : ""}`;
    case "accessory":
      return catalogItem(piece.itemId)?.name ?? "Accessory";
  }
};
