import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/* Small procedural textures, drawn once on a canvas (no image downloads). */

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat: [number, number]): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 4;
  return texture;
}

/** Cream and pale-blue checkered floor, 10 × 10 tiles with soft grout. */
export function checkerFloorTexture(): Texture {
  return canvasTexture(
    256,
    (ctx, s) => {
      const half = s / 2;
      ctx.fillStyle = "#F3E7CF";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#D3E2E6";
      ctx.fillRect(0, 0, half, half);
      ctx.fillRect(half, half, half, half);
      ctx.strokeStyle = "#E6D8BC";
      ctx.lineWidth = 4;
      for (const p of [0, half, s]) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, s);
        ctx.moveTo(0, p);
        ctx.lineTo(s, p);
        ctx.stroke();
      }
    },
    [5, 5],
  );
}

/** Small square wall tiles for the wainscot (0.5-unit tiles). */
export function wallTileTexture(width: number, height: number): Texture {
  return canvasTexture(
    64,
    (ctx, s) => {
      ctx.fillStyle = "#DCE3DD";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#F5F6F0";
      const inset = s * 0.05;
      ctx.beginPath();
      ctx.roundRect(inset, inset, s - inset * 2, s - inset * 2, s * 0.1);
      ctx.fill();
    },
    [width / 0.5, height / 0.5],
  );
}

/** Blue gingham for the curtains. */
export function ginghamTexture(repeatX: number, repeatY: number): Texture {
  const texture = canvasTexture(
    16,
    (ctx, s) => {
      const half = s / 2;
      ctx.fillStyle = "#FFFBF3";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "rgba(143, 179, 204, 0.55)";
      ctx.fillRect(0, 0, half, s);
      ctx.fillRect(0, 0, s, half);
    },
    [repeatX, repeatY],
  );
  texture.magFilter = NearestFilter;
  return texture;
}
