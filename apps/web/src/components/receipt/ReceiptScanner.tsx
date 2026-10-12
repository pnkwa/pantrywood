"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import {
  CameraIcon,
  CaretRightIcon,
  FrameCornersIcon,
  HandPalmIcon,
  ImageIcon,
  ReceiptIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { ReceiptScanSchema, type ReceiptScan } from "@pantrywood/shared";
import { z } from "zod";
import { Toasts } from "@/components/pantry/Toasts";
import { useProductGroups } from "@/lib/grocy";
import { NAV_FORWARD } from "@/lib/page-transitions";
import { formatDate } from "@/lib/pantry/format";
import { shrinkImage, toDataUrl } from "@/lib/receipt/image";
import { useReceiptMemories } from "@/lib/receipt/store";
import { ReceiptPolaroid } from "./ReceiptPolaroid";
import { ReceiptScanHeader } from "./ReceiptScanHeader";
import { ReceiptReview } from "./ReceiptReview";

const UPLOAD_EDGE_PX = 2000;
const UPLOAD_QUALITY = 0.85;

type Stage =
  | { name: "pick"; problem: string | null }
  | { name: "reading"; photoUrl: string }
  | { name: "review"; photo: Blob; photoUrl: string; scan: ReceiptScan };

const ErrorBodySchema = z.object({ error_message: z.string() });

const readReceipt = async (photo: Blob, groupNames: string[]) => {
  const form = new FormData();
  form.append("image", photo, "receipt.jpg");
  for (const name of groupNames) form.append("group", name);
  const response = await fetch("/api/receipt", { method: "POST", body: form });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = ErrorBodySchema.safeParse(body);
    throw new Error(
      problem.success
        ? problem.data.error_message
        : `The receipt reader answered ${response.status}.`,
    );
  }
  return ReceiptScanSchema.parse(body);
};

const PICK_BUTTON_CLASS =
  "flex h-13 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-base sm:flex-1 font-semibold transition-[transform,background-color] duration-150 ease-out focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring active:translate-y-px";

const TIPS = [
  { icon: FrameCornersIcon, text: "Whole slip in view" },
  { icon: HandPalmIcon, text: "Flat, no folds" },
  { icon: SunIcon, text: "Good light" },
];

const SKETCH_LINES = [
  { y: 74, width: 74, price: "52.00" },
  { y: 96, width: 88, price: "89.00" },
  { y: 118, width: 70, price: "15.00" },
  { y: 140, width: 80, price: "189.00" },
];

const ReceiptSketch = () => (
  <svg
    viewBox="0 0 220 250"
    aria-hidden
    className="h-52 w-auto drop-shadow-[0_12px_18px_rgba(74,59,46,.18)] lg:h-64"
  >
    <g transform="rotate(-3 110 125)">
      <path
        d="M30,14 H190 V222 l-10,10 l-10,-10 l-10,10 l-10,-10 l-10,10 l-10,-10 l-10,10 l-10,-10 l-10,10 l-10,-10 l-10,10 l-10,-10 l-10,10 l-10,-10 l-10,10 l-10,-10 Z"
        fill="#FFFDF8"
      />
      <rect
        x="82"
        y="30"
        width="56"
        height="9"
        rx="4.5"
        fill="#4A3B2E"
        opacity=".75"
      />
      <rect
        x="92"
        y="46"
        width="36"
        height="5"
        rx="2.5"
        fill="#7A6654"
        opacity=".45"
      />
      {SKETCH_LINES.map((line) => (
        <g key={line.y}>
          <rect
            x="46"
            y={line.y}
            width={line.width}
            height="6"
            rx="3"
            fill="#7A6654"
            opacity=".35"
          />
          <text
            x="176"
            y={line.y + 6}
            textAnchor="end"
            fontSize="9"
            fontWeight="600"
            fill="#7A6654"
          >
            {line.price}
          </text>
        </g>
      ))}
      <path d="M46,164 H176" stroke="#C9B79A" strokeDasharray="4 4" />
      <rect
        x="46"
        y="174"
        width="30"
        height="7"
        rx="3.5"
        fill="#4A3B2E"
        opacity=".7"
      />
      <text
        x="176"
        y="181"
        textAnchor="end"
        fontSize="10"
        fontWeight="700"
        fill="#4A3B2E"
      >
        345.00
      </text>
    </g>
  </svg>
);

const THUMB_TILTS = ["-rotate-6", "rotate-0", "rotate-6"];

const PastReceiptsLink = () => {
  const memories = useReceiptMemories();
  const receipts = memories.data ?? [];
  const latest = receipts[0];
  if (!latest) return null;
  return (
    <Link
      href="/receipts"
      transitionTypes={NAV_FORWARD}
      className="flex w-full max-w-sm items-center gap-3 rounded-[20px] border-[1.5px] border-[#F3EADB]/15 bg-[#F3EADB]/8 py-2.5 pr-3 pl-4 text-left transition-colors duration-150 ease-out hover:bg-[#F3EADB]/15 active:bg-[#F3EADB]/20 lg:hidden"
    >
      <span aria-hidden className="flex shrink-0 items-center">
        {receipts.slice(0, 3).map((receipt, index) => (
          <span
            key={receipt.id}
            className={`${THUMB_TILTS[index]} ${index > 0 ? "-ml-4" : ""} block h-12 w-9 overflow-hidden rounded-[4px] bg-[#FFFDF8] p-0.5 shadow-[0_4px_10px_rgba(0,0,0,.3)]`}
          >
            {receipt.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- a stored data URL, nothing to optimize
              <img
                src={receipt.image}
                alt=""
                className="size-full rounded-[2px] object-cover object-top"
              />
            ) : (
              <span className="flex size-full items-center justify-center rounded-[2px] bg-muted text-muted-foreground">
                <ReceiptIcon size={16} weight="duotone" />
              </span>
            )}
          </span>
        ))}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold">Past receipts</span>
        <span className="truncate text-xs text-[#F3EADB]/70">
          {receipts.length} kept · last {latest.store ?? "a shop"}
          {latest.date && /^\d{4}-\d{2}-\d{2}$/.test(latest.date)
            ? `, ${formatDate(latest.date)}`
            : ""}
        </span>
      </span>
      <CaretRightIcon
        size={18}
        weight="bold"
        className="shrink-0 text-[#F3EADB]/70"
        aria-hidden
      />
    </Link>
  );
};

type PhotoPickerProps = {
  problem: string | null;
  onPhoto: (photo: File) => void;
};

const PhotoPicker = ({ problem, onPhoto }: PhotoPickerProps) => {
  const [dragging, setDragging] = useState(false);
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0];
    event.target.value = "";
    if (photo) onPhoto(photo);
  };
  const drop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    const photo = event.dataTransfer.files[0];
    if (photo) onPhoto(photo);
  };

  return (
    <section
      aria-label="Receipt photo"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      className={`animate-in fade-in duration-200 flex flex-col items-center justify-center gap-5 overflow-hidden bg-[#3A322A] px-5 pt-24 pb-8 text-center text-[#F3EADB] outline-3 -outline-offset-8 transition-[outline-color] duration-150 ease-out max-lg:absolute max-lg:inset-0 lg:relative lg:min-h-0 lg:flex-[1_1_420px] lg:rounded-xl lg:bg-[#EFE6D3] lg:py-8 lg:text-foreground ${
        dragging ? "outline-dashed outline-sage-deep" : "outline-transparent"
      }`}
    >
      <ReceiptSketch />
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 className="text-xl">
          {dragging ? "Drop the photo here" : "Snap your receipt"}
        </h2>
        <p className="text-sm text-[#F3EADB]/75 lg:text-muted-foreground">
          Thai, English or both. Every line is matched to your Grocy products,
          then you check it.
        </p>
      </div>
      <ul aria-label="Tips" className="flex flex-wrap justify-center gap-2">
        {TIPS.map((tip) => {
          const TipIcon = tip.icon;
          return (
            <li
              key={tip.text}
              className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1.5 text-[13px] font-medium text-foreground"
            >
              <TipIcon
                size={16}
                weight="duotone"
                className="text-sage-deep"
                aria-hidden
              />
              {tip.text}
            </li>
          );
        })}
      </ul>
      {problem && (
        <p
          role="alert"
          className="max-w-sm rounded-md bg-status-expired px-4 py-3 text-sm text-status-expired-foreground"
        >
          {problem}
        </p>
      )}
      <div className="flex w-full max-w-sm flex-col gap-2.5 sm:flex-row">
        <label
          className={`${PICK_BUTTON_CLASS} bg-sage-deep text-primary-foreground shadow-[0_3px_0_#3F5236] hover:bg-sage-deep/85`}
        >
          <CameraIcon size={22} weight="duotone" aria-hidden />
          Take a photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={choose}
            className="sr-only"
          />
        </label>
        <label
          className={`${PICK_BUTTON_CLASS} border-[1.5px] border-border bg-card text-foreground hover:bg-muted/40`}
        >
          <ImageIcon size={22} weight="duotone" aria-hidden />
          Choose a photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={choose}
            className="sr-only"
          />
        </label>
      </div>
      <p className="hidden text-xs text-muted-foreground lg:block">
        …or drop a photo anywhere on this panel
      </p>
      <PastReceiptsLink />
    </section>
  );
};

const ReadingReceipt = ({ photoUrl }: { photoUrl: string }) => (
  <section
    aria-label="Reading the receipt"
    className="animate-in fade-in duration-200 flex items-center justify-center overflow-hidden bg-[#3A322A] px-5 pt-24 pb-20 max-lg:absolute max-lg:inset-0 lg:relative lg:min-h-0 lg:flex-[1_1_420px] lg:rounded-xl lg:bg-[#EFE6D3] lg:p-5"
  >
    <div className="relative overflow-hidden rounded-md">
      {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimize */}
      <img
        src={photoUrl}
        alt="Your receipt"
        className="block max-h-[calc(100dvh-11rem)] w-auto max-w-full rounded-md shadow-paper lg:max-h-[calc(100dvh-200px)]"
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-md bg-[#2B261F]/10"
      />
      <span
        aria-hidden
        className="absolute inset-0 motion-safe:animate-[receipt-scan_2.2s_ease-in-out_infinite_alternate]"
      >
        <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-sage shadow-[0_0_12px_#8FA67A]" />
      </span>
    </div>
    <p
      role="status"
      className="absolute bottom-5 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/95 px-4 py-2 text-sm font-semibold shadow-paper"
    >
      <span
        aria-hidden
        className="size-2 rounded-full bg-sage motion-safe:animate-pulse"
      />
      Reading every line…
    </p>
  </section>
);

const STEPS = ["Snap the slip", "Check the matches", "Add it all to stock"];
const RECENT_COUNT = 3;

/** Recent receipts beside the scanner, so a new slip joins the pile you can see. */
const RecentReceipts = () => {
  const memories = useReceiptMemories();
  const recent = (memories.data ?? []).slice(0, RECENT_COUNT);
  return (
    <aside
      aria-label="Recent receipts"
      className="hidden min-h-0 flex-col gap-4 rounded-xl border-[1.5px] border-border bg-card p-5 shadow-paper lg:flex lg:flex-[1_1_480px]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl">Recent receipts</h2>
        {recent.length > 0 && (
          <Link
            href="/receipts"
            transitionTypes={NAV_FORWARD}
            className="flex min-h-11 items-center text-[13px] font-semibold transition-colors duration-150 ease-out hover:text-sage-deep"
          >
            See all {memories.data?.length}
          </Link>
        )}
      </div>
      {memories.isSuccess && recent.length === 0 ? (
        <p className="rounded-md border-[1.5px] border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No receipts yet. Each slip you scan is kept here as a little memory.
        </p>
      ) : (
        <ul className="grid min-h-0 grid-cols-3 content-start gap-x-4 gap-y-6 overflow-y-auto p-2">
          {recent.map((receipt, index) => (
            <ReceiptPolaroid key={receipt.id} receipt={receipt} order={index} />
          ))}
        </ul>
      )}
      <ol className="mt-auto flex flex-col gap-2 rounded-md bg-muted px-4 py-3.5">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-semibold">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </aside>
  );
};

/** /scan/receipt: pick a photo, let the vision model read it, then review the matches. */
export const ReceiptScanner = () => {
  const productGroups = useProductGroups();
  const [stage, setStage] = useState<Stage>({ name: "pick", problem: null });
  const attempt = useRef(0);

  const readPhoto = async (picked: File) => {
    const thisAttempt = ++attempt.current;
    try {
      const photo = await shrinkImage(picked, UPLOAD_EDGE_PX, UPLOAD_QUALITY);
      const photoUrl = await toDataUrl(photo);
      setStage({ name: "reading", photoUrl });
      const scan = await readReceipt(
        photo,
        (productGroups.data ?? []).map((group) => group.name),
      );
      if (thisAttempt !== attempt.current) return;
      setStage(
        scan.lines.length > 0
          ? { name: "review", photo, photoUrl, scan }
          : {
              name: "pick",
              problem:
                "No item lines found on that photo. Try again with the whole slip in view.",
            },
      );
    } catch (error) {
      if (thisAttempt !== attempt.current) return;
      setStage({
        name: "pick",
        problem:
          error instanceof Error ? error.message : "Couldn't read that photo.",
      });
    }
  };

  const retake = () => {
    attempt.current++;
    setStage({ name: "pick", problem: null });
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#3A322A] lg:gap-4 lg:bg-background lg:p-5">
      {stage.name === "review" ? (
        <ReceiptReview
          photo={stage.photo}
          photoUrl={stage.photoUrl}
          scan={stage.scan}
          onRetake={retake}
        />
      ) : (
        <>
          <ReceiptScanHeader />
          <div className="lg:mx-auto lg:flex lg:w-full lg:max-w-310 lg:min-h-0 lg:flex-1 lg:gap-5">
            {stage.name === "pick" ? (
              <PhotoPicker problem={stage.problem} onPhoto={readPhoto} />
            ) : (
              <ReadingReceipt photoUrl={stage.photoUrl} />
            )}
            <RecentReceipts />
          </div>
        </>
      )}
      <Toasts />
    </div>
  );
};
