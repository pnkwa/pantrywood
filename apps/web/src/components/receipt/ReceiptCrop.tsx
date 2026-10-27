"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowCounterClockwiseIcon, ArrowLeftIcon, ScanIcon, SunIcon } from "@phosphor-icons/react";
import { isWholePhoto, moveCorner, WHOLE_PHOTO, type Corner, type CropRect } from "@/lib/receipt/crop";
import { BRIGHTEN_FILTER } from "@/lib/receipt/image";

const CORNERS: { corner: Corner; label: string; at: string }[] = [
  { corner: "topLeft", label: "Top-left corner", at: "left-0 top-0 -translate-x-1/2 -translate-y-1/2" },
  { corner: "topRight", label: "Top-right corner", at: "right-0 top-0 translate-x-1/2 -translate-y-1/2" },
  { corner: "bottomLeft", label: "Bottom-left corner", at: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2" },
  { corner: "bottomRight", label: "Bottom-right corner", at: "right-0 bottom-0 translate-x-1/2 translate-y-1/2" },
];

const KEY_STEPS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
const KEY_STEP = 0.01;
const BIG_KEY_STEP = 0.05;

const percent = (fraction: number) => `${fraction * 100}%`;

const toolButton =
  "flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";

type ReceiptCropProps = {
  photoUrl: string;
  onBack: () => void;
  onRead: (rect: CropRect, brighten: boolean) => void;
};

/** Frame the receipt yourself before it's read: outside the frame is ignored. The preview is what gets read. */
export const ReceiptCrop = ({ photoUrl, onBack, onRead }: ReceiptCropProps) => {
  const [rect, setRect] = useState<CropRect>(WHOLE_PHOTO);
  const [brighten, setBrighten] = useState(false);
  const photoRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ corner: Corner; x: number; y: number } | null>(null);

  const startDrag = (corner: Corner) => (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { corner, x: event.clientX, y: event.clientY };
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const photo = photoRef.current;
    const current = drag.current;
    if (!photo || !current) return;
    const dx = (event.clientX - current.x) / photo.offsetWidth;
    const dy = (event.clientY - current.y) / photo.offsetHeight;
    drag.current = { ...current, x: event.clientX, y: event.clientY };
    setRect((previous) => moveCorner(previous, current.corner, dx, dy));
  };
  const endDrag = () => {
    drag.current = null;
  };
  const nudge = (corner: Corner) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const size = event.shiftKey ? BIG_KEY_STEP : KEY_STEP;
    setRect((previous) => moveCorner(previous, corner, step[0] * size, step[1] * size));
  };
  const frame = { left: percent(rect.x), top: percent(rect.y), width: percent(rect.width), height: percent(rect.height) };

  return (
    <section
      aria-label="Frame the receipt"
      className="animate-in fade-in duration-200 flex flex-col items-center justify-center gap-4 overflow-hidden bg-[#3A322A] px-5 pt-24 pb-6 max-lg:absolute max-lg:inset-0 lg:relative lg:min-h-0 lg:flex-[1_1_420px] lg:rounded-xl lg:bg-[#EFE6D3] lg:p-5"
    >
      <p className="text-center text-sm text-[#F3EADB]/80 lg:text-muted-foreground">
        Drag the corners to the edges of the slip · a focused corner also moves with the arrow keys
      </p>
      <div ref={photoRef} className="relative min-h-0 touch-none select-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimize */}
        <img
          src={photoUrl}
          alt="Your receipt photo"
          draggable={false}
          style={{ filter: brighten ? BRIGHTEN_FILTER : undefined }}
          className="block max-h-[calc(100dvh-19rem)] w-auto max-w-full rounded-md shadow-paper lg:max-h-[calc(100dvh-340px)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
          <div className="absolute rounded-[4px] border-2 border-white shadow-[0_0_0_9999px_rgba(43,38,31,0.55)]" style={frame} />
        </div>
        <div className="pointer-events-none absolute" style={frame}>
          {CORNERS.map(({ corner, label, at }) => (
            <button
              key={corner}
              type="button"
              aria-label={label}
              onPointerDown={startDrag(corner)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={nudge(corner)}
              className={`pointer-events-auto absolute flex size-11 cursor-grab touch-none items-center justify-center active:cursor-grabbing focus-visible:outline-3 focus-visible:outline-ring ${at}`}
            >
              <span className="size-5 rounded-full border-[3px] border-white bg-sage-deep shadow-[0_2px_6px_rgba(0,0,0,0.4)]" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={onBack} className={`${toolButton} bg-card text-foreground hover:bg-muted`}>
          <ArrowLeftIcon size={18} weight="bold" aria-hidden />
          Another photo
        </button>
        <button
          type="button"
          onClick={() => setRect(WHOLE_PHOTO)}
          disabled={isWholePhoto(rect)}
          className={`${toolButton} bg-card text-foreground hover:bg-muted disabled:opacity-50`}
        >
          <ArrowCounterClockwiseIcon size={18} weight="bold" aria-hidden />
          Whole photo
        </button>
        <button
          type="button"
          aria-pressed={brighten}
          onClick={() => setBrighten((on) => !on)}
          className={`${toolButton} ${brighten ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-muted"}`}
        >
          <SunIcon size={18} weight="duotone" aria-hidden />
          Brighten
        </button>
        <button
          type="button"
          onClick={() => onRead(rect, brighten)}
          className={`${toolButton} bg-sage-deep text-primary-foreground shadow-[0_3px_0_#3F5236] hover:bg-sage-deep/85`}
        >
          <ScanIcon size={18} weight="bold" aria-hidden />
          Read receipt
        </button>
      </div>
    </section>
  );
};
