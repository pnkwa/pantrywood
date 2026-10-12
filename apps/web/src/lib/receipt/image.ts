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

export const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(reader.error));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
