// No "@/" imports: scripts/ocr.test.mjs runs this file directly with Node.

// A receipt is often a small strip of a phone photo; below this its tight lines blur together.
export const DETECT_LIMIT = 1280;
export const RECOGNIZE_HEIGHT = 48;
// A receipt line is rarely wider than this at 48 px tall; wider crops are squeezed.
export const RECOGNIZE_MAX_WIDTH = 1280;

export type Box = { x: number; y: number; width: number; height: number; score: number };

// The detector needs each side to be a multiple of 32.
export const detectSize = (width: number, height: number, limit = DETECT_LIMIT) => {
  const scale = Math.min(1, limit / Math.max(width, height));
  const round = (side: number) => Math.max(32, Math.round((side * scale) / 32) * 32);
  return { width: round(width), height: round(height) };
};

export const recognizeWidth = (width: number, height: number) =>
  Math.min(RECOGNIZE_MAX_WIDTH, Math.max(RECOGNIZE_HEIGHT / 3, Math.round((RECOGNIZE_HEIGHT * width) / Math.max(1, height))));

// BGR channel order: PaddleOCR's models were trained on OpenCV images.
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

// Upright boxes only, since receipts are photographed roughly straight. Each box grows by `unclip`
// because the model marks a shrunk core of every text line.
export const boxesFromMap = (
  map: ArrayLike<number>,
  width: number,
  height: number,
  { threshold = 0.6, boxThreshold = 0.6, unclip = 1.5, minSide = 3 }: BoxOptions = {},
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

// Below this share of the best letter's score, another letter isn't a real alternative.
const ALTERNATIVE_RATIO = 0.08;
const MAX_ALTERNATIVES = 4;

// Greedy CTC: class 0 is blank, 1…N the dictionary's characters, N + 1 a space. Each kept letter also
// carries the other letters the model scored highly at that step, for the corrector to choose from.
export const ctcDecode = (scores: ArrayLike<number>, steps: number, classes: number, dictionary: readonly string[]) => {
  const letters: string[] = [];
  const alternatives: string[][] = [];
  let confidence = 0;
  let previous = -1;
  const letterOf = (index: number) => (index === dictionary.length + 1 ? " " : (dictionary[index - 1] ?? ""));
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
      const others: { letter: string; score: number }[] = [];
      for (let index = 1; index < classes; index++) {
        const score = scores[step * classes + index] ?? 0;
        if (index !== best && score >= bestScore * ALTERNATIVE_RATIO) others.push({ letter: letterOf(index), score });
      }
      letters.push(letterOf(best));
      alternatives.push(others.sort((first, second) => second.score - first.score).slice(0, MAX_ALTERNATIVES).map((other) => other.letter));
      confidence += bestScore;
    }
    previous = best;
  }
  const kept = letters.length;
  // Trim spaces from both ends, keeping each letter's alternatives in step with it.
  let start = 0;
  let end = kept;
  while (start < end && letters[start] === " ") start++;
  while (end > start && letters[end - 1] === " ") end--;
  return {
    text: letters.slice(start, end).join(""),
    alternatives: alternatives.slice(start, end),
    score: kept > 0 ? confidence / kept : 0,
  };
};
