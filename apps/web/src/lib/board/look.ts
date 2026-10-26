import type { BoardPiece, NotePaper, PinStyle } from "@pantrywood/shared";
import { catalogItem, STARTER_PEGBOARD, type BoardCatalogItem } from "@/data/catalog";
import type { BoardPlane } from "@/components/scene/types";
import { BOARD_COLS, BOARD_ROWS } from "./board";

export const PAPERS: Record<NotePaper, { label: string; color: string; edge: string }> = {
  butter: { label: "Butter", color: "#FFF1C9", edge: "#E2B25C" },
  blush: { label: "Blush", color: "#FBE3DC", edge: "#E9A9A9" },
  mint: { label: "Mint", color: "#E6EFDB", edge: "#A9BC95" },
  sky: { label: "Sky", color: "#E1ECEE", edge: "#A9C4C9" },
  lined: { label: "Lined white", color: "#FFFDF8", edge: "#D3E2E6" },
};

export const PIN_NAMES: Record<PinStyle, string> = {
  magnet: "Magnet",
  pushPin: "Push pin",
  washi: "Washi tape",
  clip: "Clip",
};

export const SLIP_PAPER = "#FFFFFF";
const PHOTO_FRAME = "#FFFFFF";
const CHECKLIST_PAPER = "#FFFDF8";

export const boardLookFor = (itemId: string | undefined): BoardCatalogItem["model"] => {
  const item = catalogItem(itemId ?? STARTER_PEGBOARD) ?? catalogItem(STARTER_PEGBOARD);
  return item?.category === "pegboard" && item.kind === "board"
    ? item.model
    : { board: "#EAD7B2", hole: "#C2A87D", frame: "#A47551" };
};

const colorOf = (piece: BoardPiece) => {
  switch (piece.kind) {
    case "note":
      return PAPERS[piece.paper].color;
    case "checklist":
      return CHECKLIST_PAPER;
    case "slip":
      return SLIP_PAPER;
    case "photo":
      return piece.framed ? PHOTO_FRAME : "#E3D6C0";
    case "accessory": {
      const item = catalogItem(piece.itemId);
      return item?.category === "pegboard" && item.kind === "accessory" ? item.model.colors[0] : "#C9B79A";
    }
  }
};

/** The board as the room shows it: each piece a flat card, back to front. */
export const planesFor = (pieces: readonly BoardPiece[]): BoardPlane[] =>
  [...pieces]
    .sort((first, second) => first.z - second.z)
    .map((piece) => ({
      id: piece.id,
      x: piece.x / BOARD_COLS,
      y: piece.y / BOARD_ROWS,
      w: piece.w / BOARD_COLS,
      h: piece.h / BOARD_ROWS,
      color: colorOf(piece),
    }));
