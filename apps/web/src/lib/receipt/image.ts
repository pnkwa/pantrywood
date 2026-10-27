import type { CropRect } from "./crop";

/** Re-encodes a photo as a JPEG no larger than `maxEdge` px on its long side. */
export const shrinkImage = async (photo: Blob, maxEdge: number, quality: number) => {
  const bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Couldn't open that photo. Try a JPEG or PNG.");
  });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't read that photo."))),
      "image/jpeg",
      quality,
    ),
  );
};

// A brighter, cleaner scan. It helps dark or faded photos and can cost a line on clean ones, so it's your
// choice on the crop screen, and the preview shows exactly what gets read.
export const BRIGHTEN_FILTER = "brightness(1.15) contrast(1.15)";

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't prepare that photo."))), "image/jpeg", quality),
  );

const pixelRect = (bitmap: ImageBitmap, rect: CropRect) => ({
  x: Math.round(rect.x * bitmap.width),
  y: Math.round(rect.y * bitmap.height),
  width: Math.max(1, Math.round(rect.width * bitmap.width)),
  height: Math.max(1, Math.round(rect.height * bitmap.height)),
});

/**
 * The photo to read: the same size, with everything outside your frame painted white. Cutting it out instead
 * changes the scale the text finder works at, which made reading worse on real receipts.
 */
export const blankOutside = async (photo: Blob, rect: CropRect, brighten: boolean, quality: number) => {
  const bitmap = await createImageBitmap(photo);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  const { x, y, width, height } = pixelRect(bitmap, rect);
  if (context) {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (brighten) context.filter = BRIGHTEN_FILTER;
    context.drawImage(bitmap, x, y, width, height, x, y, width, height);
  }
  bitmap.close();
  return toJpeg(canvas, quality);
};

/** The part inside your frame, for the review screen and the kept receipt. */
export const cropPhoto = async (photo: Blob, rect: CropRect, brighten: boolean, quality: number) => {
  const bitmap = await createImageBitmap(photo);
  const { x, y, width, height } = pixelRect(bitmap, rect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    if (brighten) context.filter = BRIGHTEN_FILTER;
    context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
  }
  bitmap.close();
  return toJpeg(canvas, quality);
};

export const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(reader.error));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
