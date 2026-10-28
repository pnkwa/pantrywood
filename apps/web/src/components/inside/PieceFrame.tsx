import type { CSSProperties, ReactNode } from "react";
import type { StorageKind, StoragePalette } from "@/components/scene/types";
import { frontRatio } from "@/lib/storage/dimensions";

// Each piece's inside is framed like the piece itself, in its own proportions and the colors of its
// furniture style in the room: a rounded fridge shell, a bookcase with posts rising past the top, a painted
// dresser under an oak crown, a cabinet under an overhanging worktop, or a plain plaster wall.

const OAK = "#D9B98C";
const MINT = "#BFD9C4";

type Frame = "fridge" | "bookcase" | "dresser" | "cabinet" | "wall";

const FRAMES: Record<StorageKind, Frame> = {
  fridge: "fridge",
  pantryShelf: "bookcase",
  suppliesCabinet: "dresser",
  counter: "cabinet",
  makerShelf: "wall",
  crates: "bookcase",
  basket: "bookcase",
  riceBin: "bookcase",
};

/** Width over height for pieces with no front in the room: a stretch of wall, or the top-down pieces. */
const RATIOS: Record<Frame, number> = { fridge: 0.62, bookcase: 0.72, dresser: 1.12, cabinet: 1.45, wall: 1.55 };
const BRASS = "#C9A15A";

const DEFAULTS: Record<Frame, StoragePalette> = {
  fridge: { body: "#EFDCB6", trim: "#B8976A", accent: "#E2CA9C" },
  bookcase: { body: "#C9915F", trim: "#C9915F", accent: "#8A5A38" },
  dresser: { body: "#E9C46E", trim: "#E9C46E", accent: "#C9A27A" },
  cabinet: { body: MINT, trim: "#F1D88E", accent: "#9DBBA5" },
  wall: { body: OAK, trim: OAK, accent: "#B88E62" },
};

/** A darker shade of a color, for edges and shadows. */
const shade = (color: string, amount = 22) => `color-mix(in srgb, ${color} ${100 - amount}%, #4A3B2E)`;

export const frameFor = (kind: StorageKind) => FRAMES[kind];

/** The board color a shelf in this piece is made of, and the lip along its front edge (as in the room). */
export const boardColor = (kind: StorageKind, palette: StoragePalette | null) => {
  const frame = FRAMES[kind];
  if (frame === "wall") return { board: OAK, lip: shade(OAK, 18) };
  const { body, trim } = palette ?? DEFAULTS[frame];
  return { board: body, lip: trim === body ? shade(body, 14) : trim };
};

/** Sizes the piece to fit its box at its own proportions (the parent is a size container). */
export const frameSize = (kind: StorageKind): CSSProperties => {
  // The piece's own proportions in the room, so the inside matches what you tapped.
  const ratio = frontRatio(kind) ?? RATIOS[FRAMES[kind]];
  return { aspectRatio: `${ratio}`, width: `min(100cqw, ${ratio * 100}cqh)` };
};

type PieceFrameProps = { kind: StorageKind; palette: StoragePalette | null; children: ReactNode };

/** The pantry shelf's brass rail with cup hooks, hung under its top board like in the room. */
const CupHookRail = () => (
  <div aria-hidden className="pointer-events-none absolute inset-x-[7%] top-[3%] h-[5%]">
    <span className="absolute inset-x-0 top-0 h-[5px] rounded-full" style={{ background: BRASS, boxShadow: `0 1px 0 ${shade(BRASS, 30)}` }} />
    {[0.15, 0.38, 0.62, 0.85].map((at) => (
      <span
        key={at}
        style={{ left: `${at * 100}%`, borderColor: BRASS }}
        className="absolute top-[3px] size-3.5 -translate-x-1/2 rounded-b-full border-[2.5px] border-t-0"
      />
    ))}
  </div>
);

/** The frame around the cavity; `children` go in the cavity itself. */
export const PieceFrame = ({ kind, palette, children }: PieceFrameProps) => {
  const frame = FRAMES[kind];
  const { body, accent } = palette ?? DEFAULTS[frame];
  switch (frame) {
    case "fridge":
      return (
        <div className="absolute inset-0 rounded-[38px] p-[4.5%] shadow-paper" style={{ background: body }}>
          <div
            className="relative h-full rounded-[24px] bg-[linear-gradient(180deg,#FCFDFC,#E8EFED)]"
            style={{ boxShadow: `inset 0 0 0 10px ${shade(body, 8)}, inset 0 18px 24px -18px rgba(74,59,46,0.25)` }}
          >
            {children}
          </div>
        </div>
      );
    case "dresser":
      return (
        <div className="absolute inset-0 pt-[7%] pb-[5%]">
          <div className="absolute inset-x-[-3%] top-0 h-[7%] rounded-[10px] shadow-paper" style={{ background: OAK, boxShadow: `0 3px 0 ${shade(OAK)}` }} />
          <div className="relative h-full rounded-b-[12px] px-[4%] pb-[4%] shadow-paper" style={{ background: body }}>
            <div className="relative h-full rounded-[8px] bg-[#F6EEDF]" style={{ boxShadow: `inset 0 10px 18px -10px ${shade(body, 40)}` }}>
              {children}
            </div>
          </div>
          <span className="absolute bottom-[1.2%] left-1/2 size-3 -translate-x-1/2 rounded-full bg-[#C9A15A] shadow-[0_1px_0_#8A6A3A]" />
        </div>
      );
    case "cabinet":
      return (
        <div className="absolute inset-0 pt-[9%] pb-[6%]">
          <div className="absolute inset-x-[-4%] top-0 h-[9%] rounded-[10px]" style={{ background: OAK, boxShadow: `0 4px 0 ${shade(OAK)}` }} />
          <div className="relative h-full rounded-b-[14px] px-[4%] pb-[4%] shadow-paper" style={{ background: body }}>
            <div className="relative h-full rounded-[10px]" style={{ background: accent, boxShadow: `inset 0 12px 20px -12px ${shade(accent, 45)}` }}>
              {children}
            </div>
          </div>
          <div className="absolute inset-x-[3%] bottom-0 h-[6%] rounded-b-[8px] bg-[#8A6A4C]" />
        </div>
      );
    case "wall":
      return (
        <div className="absolute inset-0 rounded-[24px] bg-[#F3E9DA] shadow-[inset_0_0_0_1.5px_rgba(74,59,46,0.08)]">
          {children}
        </div>
      );
    case "bookcase":
      // Round-topped posts rising past the top board, a warm back panel between them.
      return (
        <div className="absolute inset-0 pt-[6%] pb-[4%]">
          {[0, 1].map((side) => (
            <div
              key={side}
              className={`absolute top-0 bottom-0 w-[8%] rounded-t-full rounded-b-[10px] ${side ? "right-0" : "left-0"}`}
              style={{ background: body, boxShadow: `inset ${side ? "" : "-"}4px 0 0 ${shade(body, 14)}` }}
            />
          ))}
          <div className="absolute inset-x-[8%] top-[6%] h-[4%] rounded-[6px]" style={{ background: body, boxShadow: `0 4px 0 ${shade(body)}` }} />
          <div className="absolute inset-x-0 bottom-0 h-[4%] rounded-[8px]" style={{ background: shade(body, 10) }} />
          <div className="absolute inset-x-[8%] top-[10%] bottom-[4%]" style={{ background: accent, boxShadow: `inset 0 14px 22px -12px ${shade(accent, 50)}` }}>
            {kind === "pantryShelf" && <CupHookRail />}
            <div className="relative h-full">{children}</div>
          </div>
        </div>
      );
  }
};
