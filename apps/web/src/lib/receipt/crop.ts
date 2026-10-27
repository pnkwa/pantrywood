// No "@/" imports: scripts/receipt-crop.test.mjs runs this file directly with Node.

/** The part of the photo to read, as fractions of its width and height. */
export type CropRect = { x: number; y: number; width: number; height: number };

export type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export const WHOLE_PHOTO: CropRect = { x: 0, y: 0, width: 1, height: 1 };

// Smaller than this a frame can't hold a receipt line, and its handles would overlap.
const MIN_SIZE = 0.1;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Moves one corner by a fraction of the photo, keeping the frame inside the photo and at least MIN_SIZE. */
export const moveCorner = (rect: CropRect, corner: Corner, dx: number, dy: number): CropRect => {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;
  if (corner === "topLeft" || corner === "bottomLeft") left = clamp(left + dx, 0, right - MIN_SIZE);
  else right = clamp(right + dx, left + MIN_SIZE, 1);
  if (corner === "topLeft" || corner === "topRight") top = clamp(top + dy, 0, bottom - MIN_SIZE);
  else bottom = clamp(bottom + dy, top + MIN_SIZE, 1);
  return { x: left, y: top, width: right - left, height: bottom - top };
};

/** A line's height in the whole photo (0–1), as a height in the cropped picture shown on review. */
export const yInCrop = (y: number, rect: CropRect) => clamp((y - rect.y) / rect.height, 0, 1);

export const isWholePhoto = (rect: CropRect) => rect.x <= 0 && rect.y <= 0 && rect.width >= 1 && rect.height >= 1;
