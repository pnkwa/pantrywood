import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ItemPictureSchema } from "@pantrywood/shared";
import { grocyPut, grocyUpload } from "@/lib/grocy/client";
import { grocyKeys } from "@/lib/grocy/queries";
import { localStorageRepository } from "@/lib/repository/local-storage";
import { removeWhiteBackground } from "./cutout";

export const MAX_PICTURE_BYTES = 2 * 1024 * 1024;
// Big enough to stay sharp on a tall shelf, small enough for localStorage.
const PICTURE_EDGE_PX = 480;
const GROCY_PICTURE_HEIGHT = 480;

const itemPictures = localStorageRepository("item-pictures", ItemPictureSchema);
const pictureKeys = { all: ["pantrywood", "item-pictures"] };

export const useItemPictures = () =>
  useQuery({
    queryKey: pictureKeys.all,
    queryFn: async () => new Map((await itemPictures.list()).map((picture) => [picture.productId, picture.dataUrl])),
  });

/** Grocy names pictures by base64 in the URL path; null for a name that can't be encoded that way. */
const encodePictureName = (fileName: string) => {
  try {
    return btoa(fileName);
  } catch {
    return null;
  }
};

export const grocyPictureUrl = (fileName: string | null) => {
  const encoded = fileName ? encodePictureName(fileName) : null;
  return encoded && !encoded.includes("/")
    ? `/api/grocy/files/productpictures/${encoded}?force_serve_as=picture&best_fit_height=${GROCY_PICTURE_HEIGHT}`
    : null;
};

/** A PNG no taller or wider than PICTURE_EDGE_PX, with the white background cleared when asked. */
export const preparePicture = async (file: Blob, removeBackground: boolean) => {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Couldn't open that picture. Try a PNG or JPEG.");
  });
  const scale = Math.min(1, PICTURE_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser can't edit pictures.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  if (removeBackground) {
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    removeWhiteBackground(frame.data, canvas.width, canvas.height);
    context.putImageData(frame, 0, 0);
  }
  return canvas.toDataURL("image/png");
};

/** A file name whose base64 has no "/", so it fits in one URL path segment. */
const grocyFileNameFor = (productId: number) => {
  let fileName = `pantrywood-${productId}-${Date.now()}.png`;
  while (encodePictureName(fileName)?.includes("/")) fileName = `x${fileName}`;
  return fileName;
};

export const useSaveItemPicture = () => {
  const queryClient = useQueryClient();
  return async (productId: number, file: File, options: { removeBackground: boolean; saveToGrocy: boolean }) => {
    if (file.size > MAX_PICTURE_BYTES) throw new Error("That picture is over 2 MB. Try a smaller one.");
    const dataUrl = await preparePicture(file, options.removeBackground);
    await itemPictures.save(String(productId), { productId, dataUrl }).catch(() => {
      throw new Error("This browser's storage is full, so the picture wasn't kept.");
    });
    await queryClient.invalidateQueries({ queryKey: pictureKeys.all });
    if (!options.saveToGrocy) return;
    const fileName = grocyFileNameFor(productId);
    const encoded = encodePictureName(fileName) ?? "";
    await grocyUpload(`files/productpictures/${encoded}`, await (await fetch(dataUrl)).blob());
    await grocyPut(`objects/products/${productId}`, { picture_file_name: fileName });
    await queryClient.invalidateQueries({ queryKey: grocyKeys.all });
  };
};

export const useRemoveItemPicture = () => {
  const queryClient = useQueryClient();
  return async (productId: number) => {
    await itemPictures.remove(String(productId));
    await queryClient.invalidateQueries({ queryKey: pictureKeys.all });
  };
};
