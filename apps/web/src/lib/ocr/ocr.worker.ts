import * as ort from "onnxruntime-web/wasm";
import {
  boxesFromMap,
  ctcDecode,
  DETECT_MEAN,
  DETECT_STD,
  detectSize,
  RECOGNIZE_HEIGHT,
  RECOGNIZE_MEAN,
  RECOGNIZE_STD,
  recognizeWidth,
  toTensor,
} from "./ocr";
import { correctThai } from "@/lib/receipt/correct";
import { THAI_RECEIPT_WORDS } from "@/lib/receipt/thai-words";

// Below this the recognizer is guessing at smudges or logos.
const MIN_TEXT_SCORE = 0.5;

ort.env.wasm.wasmPaths = "/ocr/ort/";
// Threads need cross-origin isolation, which the app doesn't turn on.
ort.env.wasm.numThreads = 1;

type Models = { detect: ort.InferenceSession; recognize: ort.InferenceSession; dictionary: string[] };

let models: Promise<Models> | null = null;

const load = async (): Promise<Models> => {
  const options: ort.InferenceSession.SessionOptions = { executionProviders: ["wasm"] };
  const [detect, recognize, dictionaryText] = await Promise.all([
    ort.InferenceSession.create("/ocr/pp-ocrv5_mobile_det.onnx", options),
    ort.InferenceSession.create("/ocr/th_pp-ocrv5_mobile_rec.onnx", options),
    fetch("/ocr/ppocrv5_th_dict.txt").then((response) => response.text()),
  ]);
  const dictionary = dictionaryText.split("\n").map((line) => line.replace(/\r$/, ""));
  if (dictionary.at(-1) === "") dictionary.pop();
  return { detect, recognize, dictionary };
};

const pixelsOf = (bitmap: ImageBitmap, crop: { x: number; y: number; width: number; height: number }, width: number, height: number) => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D is not available.");
  context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
};

const read = async (bitmap: ImageBitmap, preferred: readonly string[], report: (done: number, total: number) => void) => {
  const { detect, recognize, dictionary } = await (models ??= load());
  const size = detectSize(bitmap.width, bitmap.height);
  const whole = { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
  const detectInput = new ort.Tensor("float32", toTensor(pixelsOf(bitmap, whole, size.width, size.height), size.width, size.height, DETECT_MEAN, DETECT_STD), [
    1,
    3,
    size.height,
    size.width,
  ]);
  const detected = await detect.run({ [detect.inputNames[0] ?? "x"]: detectInput });
  const map = detected[detect.outputNames[0] ?? ""];
  if (!map || !(map.data instanceof Float32Array)) throw new Error("The text finder gave nothing back.");
  const scaleX = bitmap.width / size.width;
  const scaleY = bitmap.height / size.height;

  const texts = [];
  const boxes = boxesFromMap(map.data, size.width, size.height);
  report(0, boxes.length);
  for (const [index, box] of boxes.entries()) {
    report(index, boxes.length);
    const crop = { x: box.x * scaleX, y: box.y * scaleY, width: box.width * scaleX, height: box.height * scaleY };
    const width = recognizeWidth(crop.width, crop.height);
    const input = new ort.Tensor("float32", toTensor(pixelsOf(bitmap, crop, width, RECOGNIZE_HEIGHT), width, RECOGNIZE_HEIGHT, RECOGNIZE_MEAN, RECOGNIZE_STD), [
      1,
      3,
      RECOGNIZE_HEIGHT,
      width,
    ]);
    const output = (await recognize.run({ [recognize.inputNames[0] ?? "x"]: input }))[recognize.outputNames[0] ?? ""];
    if (!output || !(output.data instanceof Float32Array)) continue;
    const [, steps = 0, classes = 0] = output.dims;
    const { text, alternatives, score } = ctcDecode(output.data, steps, classes, dictionary);
    if (text && score >= MIN_TEXT_SCORE) texts.push({ text: correctThai(text, THAI_RECEIPT_WORDS, { alternatives, preferred }), ...crop, score });
  }
  return texts;
};

self.addEventListener("message", async (event: MessageEvent) => {
  const { id, bitmap, preferred } = event.data ?? {};
  if (typeof id !== "string" || !(bitmap instanceof ImageBitmap)) return;
  const words = Array.isArray(preferred) ? preferred.filter((word): word is string => typeof word === "string") : [];
  try {
    self.postMessage({ id, texts: await read(bitmap, words, (done, total) => self.postMessage({ id, progress: { done, total } })) });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : "The receipt reader stopped." });
  } finally {
    bitmap.close();
  }
});
