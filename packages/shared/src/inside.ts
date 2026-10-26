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

export const ItemSlotSchema = z.object({ section: z.string(), order: z.number() });

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
