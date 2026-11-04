import { z } from "zod";

/** Grid cell of a piece's corner with the lowest x and z; the floor is 10 × 10 cells of 50 cm. */
const Cell = z.tuple([z.number().int(), z.number().int()]);
/** Quarter turns clockwise, seen from above. */
const Rotation = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

/** The room's two walls, named as Room.tsx names them: right runs along x, left along z. */
const WallSide = z.enum(["left", "right"]);

export const StoragePlacementSchema = z.object({
  locationId: z.number(),
  /** Catalog item that dresses this Grocy location; null keeps the built-in look. */
  itemId: z.string().nullable(),
  cell: Cell,
  rotation: Rotation,
  /** Put away: not drawn in the room, though the Grocy location and its stock are untouched. */
  stored: z.boolean().optional(),
  /** Wall-hung pieces (wall shelf, wall cabinet) only: which wall. Absent means the back (right) wall. */
  wall: WallSide.optional(),
  /** Kept plain: without its cute props (the fridge's cloth and basket, a runner, a radio). Absent means dressed up. */
  plain: z.boolean().optional(),
});


export const DecorPlacementSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  cell: Cell,
  rotation: Rotation,
  /** Wall pieces only: which wall it hangs on. Absent means the right wall. */
  wall: WallSide.optional(),
});

/** The decorated storage room. Pantrywood's own data: never stored in Grocy. */
export const RoomLayoutSchema = z.object({
  owned: z.array(z.string()),
  wallpaper: z.string(),
  /** The pegboard's catalog item, which sets its color. Absent means the starter oat board. */
  pegboard: z.string().optional(),
  floor: z.string(),
  storage: z.array(StoragePlacementSchema),
  decor: z.array(DecorPlacementSchema),
});

export type Rotation = z.infer<typeof Rotation>;
export type WallSide = z.infer<typeof WallSide>;
export type StoragePlacement = z.infer<typeof StoragePlacementSchema>;
export type DecorPlacement = z.infer<typeof DecorPlacementSchema>;
export type RoomLayout = z.infer<typeof RoomLayoutSchema>;
