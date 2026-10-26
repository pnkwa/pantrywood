import type { CSSProperties, ReactNode } from "react";
import type { StorageKind, StoragePalette } from "@/components/scene/types";

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

/** Width over height of each piece's front, from its model in the room. */
const RATIOS: Record<Frame, number> = { fridge: 0.62, bookcase: 0.72, dresser: 1.12, cabinet: 1.45, wall: 1.55 };

const DEFAULTS: Record<Frame, StoragePalette> = {
  fridge: { body: "#F3EADB", trim: "#C9B79A", accent: "#D9CCB0" },
  bookcase: { body: "#C9915F", trim: "#C9915F", accent: "#8A5A38" },
  dresser: { body: "#E9C46E", trim: "#E9C46E", accent: "#C9A27A" },
  cabinet: { body: MINT, trim: "#F1D88E", accent: "#9DBBA5" },
  wall: { body: OAK, trim: OAK, accent: "#B88E62" },
};

/** A darker shade of a color, for edges and shadows. */
const shade = (color: string, amount = 22) => `color-mix(in srgb, ${color} ${100 - amount}%, #4A3B2E)`;

export const frameFor = (kind: StorageKind) => FRAMES[kind];

/** The board color a shelf in this piece is made of. */
export const boardColor = (kind: StorageKind, palette: StoragePalette | null) => {
  const frame = FRAMES[kind];
  if (frame === "wall") return OAK;
  return (palette ?? DEFAULTS[frame]).body;
};

/** Sizes the piece to fit its box at its own proportions (the parent is a size container). */
export const frameSize = (kind: StorageKind): CSSProperties => {
  const ratio = RATIOS[FRAMES[kind]];
  return { aspectRatio: `${ratio}`, width: `min(100cqw, ${ratio * 100}cqh)` };
};

type PieceFrameProps = { kind: StorageKind; palette: StoragePalette | null; children: ReactNode };

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
            <div className="relative h-full">{children}</div>
          </div>
        </div>
      );
  }
};
