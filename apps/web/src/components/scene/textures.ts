import {
  CanvasTexture,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

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

export const checkerFloorTexture = (): Texture =>
  canvasTexture(
    256,
    (context, size) => {
      const half = size / 2;
      context.fillStyle = "#F3E7CF";
      context.fillRect(0, 0, size, size);
      context.fillStyle = "#D3E2E6";
      context.fillRect(0, 0, half, half);
      context.fillRect(half, half, half, half);
      context.strokeStyle = "#E6D8BC";
      context.lineWidth = 4;
      for (const offset of [0, half, size]) {
        context.beginPath();
        context.moveTo(offset, 0);
        context.lineTo(offset, size);
        context.moveTo(0, offset);
        context.lineTo(size, offset);
        context.stroke();
      }
    },
    [5, 5],
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

export const ginghamTexture = (repeatX: number, repeatY: number): Texture => {
  const texture = canvasTexture(
    16,
    (context, size) => {
      const half = size / 2;
      context.fillStyle = "#FFFBF3";
      context.fillRect(0, 0, size, size);
      context.fillStyle = "rgba(143, 179, 204, 0.55)";
      context.fillRect(0, 0, half, size);
      context.fillRect(0, 0, size, half);
    },
    [repeatX, repeatY],
  );
  texture.magFilter = NearestFilter;
  return texture;
};
