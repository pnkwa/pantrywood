import { z } from "zod";

export const PinStyleSchema = z.enum(["magnet", "pushPin", "washi", "clip"]);
export const NotePaperSchema = z.enum(["butter", "blush", "mint", "sky", "lined"]);

/** Position and size in peg holes from the board's top-left; `z` orders pieces front to back. */
const Placement = {
  id: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  z: z.number().int(),
};

/** A Grocy product a note points at; `restocked` turns true when that product is added to stock again. */
const ProductLink = z.object({ productId: z.number(), restocked: z.boolean() });

export const BoardPieceSchema = z.discriminatedUnion("kind", [
  z.object({
    ...Placement,
    kind: z.literal("note"),
    pin: PinStyleSchema,
    paper: NotePaperSchema,
    text: z.string(),
    links: z.array(ProductLink),
  }),
  z.object({
    ...Placement,
    kind: z.literal("checklist"),
    pin: PinStyleSchema,
    title: z.string(),
    lines: z.array(
      z.object({ id: z.string(), text: z.string(), done: z.boolean(), productId: z.number().nullable() }),
    ),
  }),
  /** A receipt from the receipt scanner, by its receipt memory id. */
  z.object({ ...Placement, kind: z.literal("slip"), pin: PinStyleSchema, receiptId: z.string() }),
  z.object({
    ...Placement,
    kind: z.literal("photo"),
    pin: PinStyleSchema,
    /** PNG data URL; transparent PNGs hang without a polaroid frame. */
    dataUrl: z.string(),
    framed: z.boolean(),
    caption: z.string(),
  }),
  /** Hangs on the pegs by itself, so it has no pin. `itemId` is its Decorate catalog item. */
  z.object({ ...Placement, kind: z.literal("accessory"), itemId: z.string() }),
]);

/** The pegboard. Pantrywood's own data: never stored in Grocy. */
export const BoardSchema = z.object({ pieces: z.array(BoardPieceSchema) });

export type PinStyle = z.infer<typeof PinStyleSchema>;
export type NotePaper = z.infer<typeof NotePaperSchema>;
export type BoardPiece = z.infer<typeof BoardPieceSchema>;
export type Board = z.infer<typeof BoardSchema>;
