// No "@/" imports: scripts/inside-layout.test.mjs runs this file directly with Node.

const NEAR_WHITE = 232;

/**
 * Makes the white background of a photo transparent, in place. Only near-white pixels joined to the
 * edge are cleared (a flood fill from the border), so white parts inside the item, like a label, stay.
 */
export const removeWhiteBackground = (pixels: Uint8ClampedArray, width: number, height: number) => {
  const isNearWhite = (index: number) =>
    (pixels[index * 4] ?? 0) >= NEAR_WHITE &&
    (pixels[index * 4 + 1] ?? 0) >= NEAR_WHITE &&
    (pixels[index * 4 + 2] ?? 0) >= NEAR_WHITE;
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    if (seen[index] || !isNearWhite(index)) continue;
    seen[index] = 1;
    pixels[index * 4 + 3] = 0;
    const x = index % width;
    if (x > 0) stack.push(index - 1);
    if (x < width - 1) stack.push(index + 1);
    if (index >= width) stack.push(index - width);
    if (index < width * (height - 1)) stack.push(index + width);
  }
};
