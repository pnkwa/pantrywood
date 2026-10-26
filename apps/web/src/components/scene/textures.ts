import {
  CanvasTexture,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import type { FloorSurface, WallSurface } from "./types";

const canvasTexture = (
  size: number,
  draw: (context: CanvasRenderingContext2D, size: number) => void,
  repeat: [number, number],
): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is not available.");
  draw(context, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 4;
  return texture;
};

/** One peg hole per tile, repeated across the board. */
export const pegboardTexture = (board: string, hole: string, [columns, rows]: [number, number]): Texture =>
  canvasTexture(
    32,
    (context, size) => {
      context.fillStyle = board;
      context.fillRect(0, 0, size, size);
      context.fillStyle = hole;
      context.beginPath();
      context.arc(size / 2, size / 2, size * 0.13, 0, Math.PI * 2);
      context.fill();
    },
    [columns, rows],
  );

const WALL_TILE_SIZE = 0.5;

export const wallTileTexture = (width: number, height: number): Texture =>
  canvasTexture(
    64,
    (context, size) => {
      context.fillStyle = "#DCE3DD";
      context.fillRect(0, 0, size, size);
      context.fillStyle = "#F5F6F0";
      const inset = size * 0.05;
      context.beginPath();
      context.roundRect(
        inset,
        inset,
        size - inset * 2,
        size - inset * 2,
        size * 0.1,
      );
      context.fill();
    },
    [width / WALL_TILE_SIZE, height / WALL_TILE_SIZE],
  );

export const ginghamTexture = (repeatX: number, repeatY: number, check = "rgba(143, 179, 204, 0.55)"): Texture => {
  const texture = canvasTexture(
    16,
    (context, size) => {
      const half = size / 2;
      context.fillStyle = "#FFFBF3";
      context.fillRect(0, 0, size, size);
      context.fillStyle = check;
      context.fillRect(0, 0, half, size);
      context.fillRect(0, 0, size, half);
    },
    [repeatX, repeatY],
  );
  texture.magFilter = NearestFilter;
  return texture;
};

/** Same dots on every render, so a cork floor doesn't shimmer when it re-draws. */
const seededRandom = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const WALL_PATTERN_SIZE = 0.6;

/** A wallpaper drawn as a repeating texture; "plain" and "wainscot" need none. */
export const wallpaperTexture = (surface: WallSurface, width: number, height: number): Texture | null => {
  const { base, line } = surface;
  const repeat: [number, number] = [width / WALL_PATTERN_SIZE, height / WALL_PATTERN_SIZE];
  switch (surface.pattern) {
    case "plain":
    case "wainscot":
      return null;
    case "shiplap":
      return canvasTexture(64, (context, size) => {
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        context.fillStyle = line;
        context.fillRect(0, size / 2 - 2, size, 3);
        context.fillRect(0, size - 3, size, 3);
      }, repeat);
    case "grid":
      return canvasTexture(64, (context, size) => {
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        context.fillStyle = line;
        context.fillRect(0, 0, size, 2);
        context.fillRect(0, 0, 2, size);
      }, repeat);
    case "dots":
      return canvasTexture(64, (context, size) => {
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        const daisy = (centerX: number, centerY: number) => {
          context.fillStyle = "#FFFBF3";
          for (let petal = 0; petal < 6; petal++) {
            const angle = (petal / 6) * Math.PI * 2;
            context.beginPath();
            context.arc(centerX + Math.cos(angle) * 5, centerY + Math.sin(angle) * 5, 3.5, 0, Math.PI * 2);
            context.fill();
          }
          context.fillStyle = line;
          context.beginPath();
          context.arc(centerX, centerY, 3, 0, Math.PI * 2);
          context.fill();
        };
        daisy(size * 0.25, size * 0.25);
        daisy(size * 0.75, size * 0.75);
      }, repeat);
    case "gingham":
      return canvasTexture(16, (context, size) => {
        const half = size / 2;
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        context.globalAlpha = 0.45;
        context.fillStyle = line;
        context.fillRect(0, 0, half, size);
        context.fillRect(0, 0, size, half);
      }, [repeat[0] * 2, repeat[1] * 2]);
  }
};

export const floorTexture = (surface: FloorSurface): Texture => {
  const { base, line } = surface;
  switch (surface.pattern) {
    case "checker":
      return canvasTexture(256, (context, size) => {
        const half = size / 2;
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        context.fillStyle = line;
        context.fillRect(0, 0, half, half);
        context.fillRect(half, half, half, half);
        context.strokeStyle = "rgba(122, 102, 84, 0.12)";
        context.lineWidth = 4;
        for (const offset of [0, half, size]) {
          context.beginPath();
          context.moveTo(offset, 0);
          context.lineTo(offset, size);
          context.moveTo(0, offset);
          context.lineTo(size, offset);
          context.stroke();
        }
      }, [5, 5]);
    case "planks":
      return canvasTexture(256, (context, size) => {
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        context.fillStyle = line;
        const row = size / 4;
        for (let index = 0; index < 4; index++) {
          context.fillRect(0, index * row, size, 3);
          context.fillRect(index % 2 === 0 ? size * 0.3 : size * 0.75, index * row, 3, row);
        }
      }, [2.5, 2.5]);
    case "tatami":
      return canvasTexture(256, (context, size) => {
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        context.strokeStyle = line;
        context.lineWidth = 8;
        context.strokeRect(4, 4, size - 8, size / 2 - 8);
        context.strokeRect(4, size / 2 + 4, size / 2 - 8, size / 2 - 8);
        context.strokeRect(size / 2 + 4, size / 2 + 4, size / 2 - 8, size / 2 - 8);
        context.globalAlpha = 0.25;
        context.lineWidth = 1;
        for (let x = 0; x < size; x += 6) {
          context.beginPath();
          context.moveTo(x, 0);
          context.lineTo(x, size);
          context.stroke();
        }
      }, [2.5, 2.5]);
    case "speckle":
      return canvasTexture(256, (context, size) => {
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        context.fillStyle = line;
        const random = seededRandom(7);
        for (let dot = 0; dot < 420; dot++) {
          context.beginPath();
          context.arc(random() * size, random() * size, 1 + random() * 2, 0, Math.PI * 2);
          context.fill();
        }
      }, [3, 3]);
    case "tile":
      return canvasTexture(128, (context, size) => {
        context.fillStyle = line;
        context.fillRect(0, 0, size, size);
        context.fillStyle = base;
        context.fillRect(3, 3, size - 6, size - 6);
      }, [10, 10]);
    case "herringbone":
      return canvasTexture(256, (context, size) => {
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);
        context.strokeStyle = line;
        context.lineWidth = 3;
        const step = size / 8;
        for (let index = -8; index < 16; index++) {
          context.beginPath();
          for (let zig = 0; zig <= 8; zig++) {
            const x = zig * step;
            const y = index * step + (zig % 2 === 0 ? 0 : step);
            if (zig === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          context.stroke();
        }
      }, [4, 4]);
  }
};
