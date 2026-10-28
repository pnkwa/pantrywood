import { z } from "zod";

const SectionType = z.enum([
  "wire",
  "glass",
  "half",
  "drawer",
  "doorBin",
  "board",
  "crisper",
  "compartment",
  "loose",
  "bag",
  "wireBasket",
  "floor",
]);

export const InsideSectionSchema = z.object({
  id: z.string(),
  tab: z.string(),
  type: SectionType,
  /** Rail notch counted from the top; null for parts fixed in place (crispers, top-down compartments). */
  notch: z.number().int().nullable(),
});

export const ItemSlotSchema = z.object({
  section: z.string(),
  order: z.number(),
  /** Where it stands along a front-view shelf: its centre, 0 = left end, 1 = right end. Absent on older layouts. */
  x: z.number().min(0).max(1).optional(),
  /** Which row of a deep shelf it stands in: 0 = front (also when unset), 1 = back. */
  row: z.number().int().min(0).max(1).optional(),
  /** How big it's drawn, set by you (1 = fits its shelf); it takes room on the shelf to match. */
  size: z.number().min(0.5).max(1.6).optional(),
  /** Which stands in front where things overlap on a shelf: higher is nearer (0 when unset). */
  layer: z.number().int().optional(),
  /** How far it is turned on its shelf, in degrees (0 = facing out). */
  turn: z.number().min(0).max(360).optional(),
});

/** How one storage piece is arranged inside. Pantrywood's own data: Grocy only knows the location. */
export const InsideLayoutSchema = z.object({
  sections: z.array(InsideSectionSchema),
  /** Keyed by item key. */
  slots: z.record(z.string(), ItemSlotSchema),
  /** Rice bin only: the amount that fills it to the top. */
  capacity: z.number().positive().optional(),
});

/** An item picture the user added, per product. A PNG data URL, transparent where the background was removed. */
export const ItemPictureSchema = z.object({
  productId: z.number(),
  dataUrl: z.string(),
});

export type SectionType = z.infer<typeof SectionType>;
export type InsideSection = z.infer<typeof InsideSectionSchema>;
export type ItemSlot = z.infer<typeof ItemSlotSchema>;
export type InsideLayout = z.infer<typeof InsideLayoutSchema>;
export type ItemPicture = z.infer<typeof ItemPictureSchema>;
