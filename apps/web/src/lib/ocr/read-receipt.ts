"use client";

import { z } from "zod";
import type { ReceiptScan } from "@pantrywood/shared";
import { parseReceipt } from "@/lib/receipt/parse";

const ReplySchema = z.object({
  id: z.string(),
  texts: z.array(z.object({ text: z.string(), x: z.number(), y: z.number(), width: z.number(), height: z.number(), score: z.number() })).optional(),
  error: z.string().optional(),
  progress: z.object({ done: z.number(), total: z.number() }).optional(),
});

export type ReadProgress = { done: number; total: number };

let worker: Worker | null = null;

const getWorker = () => (worker ??= new Worker(new URL("./ocr.worker.ts", import.meta.url), { type: "module" }));

/** `preferred`: names the receipt most likely holds (your products, your earlier fixes). */
export const readReceiptOnDevice = async (
  photo: Blob,
  preferred: readonly string[] = [],
  onProgress: (progress: ReadProgress) => void = () => undefined,
): Promise<ReceiptScan> => {
  const bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Couldn't open that photo. Try a JPEG or PNG.");
  });
  const imageHeight = bitmap.height;
  const id = crypto.randomUUID();
  const reader = getWorker();
  const texts = await new Promise<NonNullable<z.infer<typeof ReplySchema>["texts"]>>((resolve, reject) => {
    const handle = (event: MessageEvent) => {
      const reply = ReplySchema.safeParse(event.data);
      if (!reply.success || reply.data.id !== id) return;
      if (reply.data.progress) {
        onProgress(reply.data.progress);
        return;
      }
      reader.removeEventListener("message", handle);
      if (reply.data.texts) resolve(reply.data.texts);
      else reject(new Error(reply.data.error ?? "The receipt reader stopped."));
    };
    reader.addEventListener("message", handle);
    reader.postMessage({ id, bitmap, preferred }, [bitmap]);
  });
  const scan = parseReceipt(texts, { imageHeight, currentYear: new Date().getFullYear() });
  if (scan.lines.length === 0) throw new Error("No item lines found. Try a sharper, flatter photo.");
  return scan;
};
