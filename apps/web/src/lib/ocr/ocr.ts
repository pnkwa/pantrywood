// No "@/" imports: scripts/ocr.test.mjs runs this file directly with Node.

// The math around PaddleOCR's two models (PP-OCRv5 mobile detection, Thai+English recognition), kept free
// of the DOM and of ONNX Runtime so it can be tested: image → tensor, probability map → text boxes, and
// recognizer output → text. The worker in ./ocr.worker.ts does the resizing, cropping and model runs.

/** Detection sees the photo with its longer side at most this many pixels, in multiples of 32. */
export const DETECT_LIMIT = 960;
export const RECOGNIZE_HEIGHT = 48;
/** Wider crops are squeezed; a receipt line is rarely longer than this at 48 px tall. */
export const RECOGNIZE_MAX_WIDTH = 1280;

export type Box = { x: number; y: number; width: number; height: number; score: number };

/** The detection input size for a photo: scaled down to the limit, each side a multiple of 32. */
export const detectSize = (width: number, height: number, limit = DETECT_LIMIT) => {
  const scale = Math.min(1, limit / Math.max(width, height));
  const round = (side: number) => Math.max(32, Math.round((side * scale) / 32) * 32);
  return { width: round(width), height: round(height) };
};

/** A crop's width at the recognizer's fixed height, keeping its shape. */
export const recognizeWidth = (width: number, height: number) =>
  Math.min(RECOGNIZE_MAX_WIDTH, Math.max(RECOGNIZE_HEIGHT / 3, Math.round((RECOGNIZE_HEIGHT * width) / Math.max(1, height))));

/**
 * RGBA pixels → a [3, height, width] tensor, channels in BGR order like PaddleOCR's OpenCV training,
 * each scaled to 0–1 then normalized: (value - mean) / std.
 */
export const toTensor = (
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  mean: readonly [number, number, number],
  std: readonly [number, number, number],
) => {
  const plane = width * height;
  const tensor = new Float32Array(plane * 3);
  for (let pixel = 0; pixel < plane; pixel++) {
    const red = (rgba[pixel * 4] ?? 0) / 255;
    const green = (rgba[pixel * 4 + 1] ?? 0) / 255;
    const blue = (rgba[pixel * 4 + 2] ?? 0) / 255;
    tensor[pixel] = (blue - mean[0]) / std[0];
    tensor[plane + pixel] = (green - mean[1]) / std[1];
    tensor[plane * 2 + pixel] = (red - mean[2]) / std[2];
  }
  return tensor;
};

export const DETECT_MEAN = [0.485, 0.456, 0.406] as const;
export const DETECT_STD = [0.229, 0.224, 0.225] as const;
export const RECOGNIZE_MEAN = [0.5, 0.5, 0.5] as const;
export const RECOGNIZE_STD = [0.5, 0.5, 0.5] as const;

type BoxOptions = { threshold?: number; boxThreshold?: number; unclip?: number; minSide?: number };

/**
 * Text boxes from the detector's probability map (DB post-processing, kept to upright rectangles since
 * receipts are photographed roughly straight): pixels over `threshold` are joined into regions, weak regions
 * are dropped, and each one grows by `unclip` because the model marks a shrunk core of each text line.
 */
export const boxesFromMap = (
  map: ArrayLike<number>,
  width: number,
  height: number,
  { threshold = 0.3, boxThreshold = 0.6, unclip = 1.6, minSide = 3 }: BoxOptions = {},
): Box[] => {
  const seen = new Uint8Array(width * height);
  const boxes: Box[] = [];
  const stack: number[] = [];
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || (map[start] ?? 0) <= threshold) continue;
    let [left, top, right, bottom] = [width, height, -1, -1];
    let sum = 0;
    let count = 0;
    seen[start] = 1;
    stack.push(start);
    while (stack.length > 0) {
      const index = stack.pop() ?? 0;
      const x = index % width;
      const y = (index - x) / width;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      sum += map[index] ?? 0;
      count++;
      const neighbours = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
      for (const next of neighbours) {
        if (next < 0 || seen[next] || (map[next] ?? 0) <= threshold) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }
    const boxWidth = right - left + 1;
    const boxHeight = bottom - top + 1;
    const score = sum / count;
    if (Math.min(boxWidth, boxHeight) < minSide || score < boxThreshold) continue;
    const grow = (boxWidth * boxHeight * unclip) / (2 * (boxWidth + boxHeight));
    const x = Math.max(0, left - grow);
    const y = Math.max(0, top - grow);
    boxes.push({
      x,
      y,
      width: Math.min(width, right + 1 + grow) - x,
      height: Math.min(height, bottom + 1 + grow) - y,
      score,
    });
  }
  return boxes;
};

/**
 * The recognizer's per-step class scores → text (greedy CTC): class 0 is "blank", classes 1…N are the
 * dictionary's characters in order, and the one after them is a space. Repeats collapse unless a blank
 * separates them. The score is the mean confidence of the characters kept.
 */
export const ctcDecode = (scores: ArrayLike<number>, steps: number, classes: number, dictionary: readonly string[]) => {
  let text = "";
  let confidence = 0;
  let kept = 0;
  let previous = -1;
  for (let step = 0; step < steps; step++) {
    let best = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < classes; index++) {
      const score = scores[step * classes + index] ?? -Infinity;
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    }
    if (best !== 0 && best !== previous) {
      text += best === dictionary.length + 1 ? " " : (dictionary[best - 1] ?? "");
      confidence += bestScore;
      kept++;
    }
    previous = best;
  }
  return { text: text.trim(), score: kept > 0 ? confidence / kept : 0 };
};
