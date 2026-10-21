"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, WarningIcon } from "@phosphor-icons/react";
import { THAI_NAME_USERFIELD, toIsoDate, type ReceiptScan } from "@pantrywood/shared";
import {
  useCurrentStock,
  useProducts,
  useQuantityUnits,
  useShoppingLocations,
  useStockAction,
} from "@/lib/grocy";
import { NAV_FORWARD } from "@/lib/page-transitions";
import { formatDate, formatMoney } from "@/lib/pantry/format";
import { usePantry } from "@/lib/pantry/use-pantry";
import { shrinkImage, toDataUrl } from "@/lib/receipt/image";
import { matchReceiptLine, normalizeReceiptName } from "@/lib/receipt/match";
import { receiptMatches, receiptMemories, useRefreshReceipts, useRememberedMatches } from "@/lib/receipt/store";
import { LEAVES_PER_RECEIPT } from "@/lib/room/leaves";
import { useRoomStore } from "@/lib/room/room-store";
import { useUiStore } from "@/lib/store/ui-store";
import { AnimatedNumber } from "@/components/pantry/AnimatedNumber";
import { ReceiptScanHeader } from "./ReceiptScanHeader";
import { needsYou, ReceiptLineCard, type LineChoice, type ReviewProduct } from "./ReceiptLineCard";

const MEMORY_EDGE_PX = 900;
const MEMORY_QUALITY = 0.7;
const TOTAL_TOLERANCE = 0.01;
const ZOOM_STEP = 0.5;
const MAX_ZOOM = 3;

const isIsoDate = (value: string | null): value is string => value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);

const bestBeforeFor = (shelfLifeDays: number) => {
  if (shelfLifeDays <= 0) return undefined;
  const date = new Date();
  date.setDate(date.getDate() + shelfLifeDays);
  return toIsoDate(date);
};

type SummaryTileProps = {
  label: string;
  value: ReactNode;
  tone?: "plain" | "sage" | "honey";
};

const SummaryTile = ({ label, value, tone = "plain" }: SummaryTileProps) => (
  <span
    className={`inline-flex min-w-0 flex-col justify-center rounded-[14px] px-2.5 py-1.5 leading-tight lg:h-12 lg:px-3.5 lg:py-0 ${
      tone === "sage"
        ? "bg-status-fresh text-status-fresh-foreground"
        : tone === "honey"
          ? "border-[1.5px] border-honey bg-status-soon text-status-soon-foreground"
          : "border-[1.5px] border-border bg-card"
    }`}
  >
    <span className="truncate text-[11px] font-semibold opacity-80">{label}</span>
    <span className="tabular truncate text-[15px] font-semibold">{value}</span>
  </span>
);

type ReceiptReviewProps = {
  photo: Blob;
  photoUrl: string;
  scan: ReceiptScan;
  onRetake: () => void;
};

/** DESIGN.md section 19 "Receipt review": photo on one side, one card per line on the other. */
export const ReceiptReview = ({ photo, photoUrl, scan, onRetake }: ReceiptReviewProps) => {
  const router = useRouter();
  const products = useProducts();
  const units = useQuantityUnits();
  const stock = useCurrentStock();
  const shops = useShoppingLocations();
  const remembered = useRememberedMatches();
  const pantryState = usePantry();
  const places = pantryState.status === "ready" ? pantryState.pantry.places : [];
  const stockAction = useStockAction();
  const refreshReceipts = useRefreshReceipts();
  const showToast = useUiStore((state) => state.showToast);
  const earnLeaves = useRoomStore((state) => state.earn);

  const [choices, setChoices] = useState<LineChoice[] | null>(null);
  // Lines that needed you when the receipt was read come first, and keep their place once fixed.
  const [lineOrder, setLineOrder] = useState<number[]>([]);
  const [openLine, setOpenLine] = useState<number | null>(null);
  const [added, setAdded] = useState<ReadonlySet<number>>(new Set());
  const [filter, setFilter] = useState<"all" | "needsYou">("all");
  const [rememberMatches, setRememberMatches] = useState(true);
  // Zoom and pan the photo around its center: translate + scale, so it stays smooth and never re-lays out.
  const photoRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  // Phones and tablets: the lines sit in a sheet over the photo; lowering it shows the receipt.
  const [sheetOpen, setSheetOpen] = useState(true);

  const activeProducts = (products.data ?? []).filter((product) => product.active === 1);
  if (choices === null && products.data && remembered.data) {
    const matchable = activeProducts.map((product) => ({
      id: product.id,
      name: product.name,
      thaiName: product.userfields?.[THAI_NAME_USERFIELD] ?? "",
    }));
    const matched = scan.lines.map((line) => ({
      ...matchReceiptLine(line.name, line.name_en, matchable, remembered.data),
      amount: line.quantity,
    }));
    const order = matched
      .map((choice, index) => ({ index, first: needsYou(choice) }))
      .sort((first, second) => Number(second.first) - Number(first.first))
      .map((entry) => entry.index);
    setChoices(matched);
    setLineOrder(order);
    setOpenLine(order.find((index) => matched[index] && needsYou(matched[index])) ?? null);
  }

  const reviewProducts = new Map<number, ReviewProduct>(
    [...activeProducts]
      .sort((first, second) => first.name.localeCompare(second.name))
      .map((product) => {
        const unit = units.data?.find((candidate) => candidate.id === product.qu_id_stock);
        return [
          product.id,
          {
            id: product.id,
            name: product.name,
            thaiName: product.userfields?.[THAI_NAME_USERFIELD] ?? "",
            placeName: places.find((place) => place.id === product.location_id)?.name ?? "",
            stockAmount: stock.data?.find((row) => row.product_id === product.id)?.amount ?? 0,
            unitFor: (count: number) => (count === 1 ? unit?.name : (unit?.name_plural ?? unit?.name)) ?? "",
          },
        ];
      }),
  );

  const lineTotal = scan.lines.reduce((sum, line) => sum + line.line_total, 0);
  const totalMatches = scan.total === null || Math.abs(lineTotal - scan.total) < TOTAL_TOLERANCE;
  const rows = (choices ?? []).map((choice, index) => ({ choice, index, line: scan.lines[index] }));
  const needsYouCount = rows.filter((row) => needsYou(row.choice)).length;
  const toAdd = rows.filter((row) => row.choice.productId !== null && row.choice.how !== "skipped" && !added.has(row.index));
  const visibleRows = lineOrder
    .flatMap((index) => rows[index] ?? [])
    .filter((row) => filter === "all" || needsYou(row.choice));
  const shopId = shops.data?.find((shop) => shop.name.toLowerCase() === scan.store?.toLowerCase())?.id;

  const updateChoice = (index: number, choice: LineChoice) =>
    setChoices((current) => current?.map((existing, position) => (position === index ? choice : existing)) ?? null);

  // Keeps the photo's edges inside the panel at any zoom.
  const clampedView = (zoom: number, x: number, y: number) => {
    const photo = photoRef.current;
    if (!photo || zoom <= 1) return { zoom, x: 0, y: 0 };
    const maxX = (photo.offsetWidth * (zoom - 1)) / 2;
    const maxY = (photo.offsetHeight * (zoom - 1)) / 2;
    return { zoom, x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  // The point in the middle of the panel stays in the middle while zooming.
  const zoomTo = (zoom: number) =>
    setView((current) => clampedView(zoom, (current.x * zoom) / current.zoom, (current.y * zoom) / current.zoom));

  // When zoomed in, opening a line glides the photo to that line: panning without a drag.
  const openLineAt = (index: number | null) => {
    setOpenLine(index);
    const lineY = index === null ? null : scan.lines[index]?.y;
    const photo = photoRef.current;
    if (lineY === null || lineY === undefined || !photo) return;
    setView((current) =>
      current.zoom <= 1 ? current : clampedView(current.zoom, current.x, (0.5 - lineY) * photo.offsetHeight * current.zoom),
    );
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (view.zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, x: view.x, y: view.y };
    setDragging(true);
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const start = dragStart.current;
    setView(clampedView(view.zoom, start.x + event.clientX - start.pointerX, start.y + event.clientY - start.pointerY));
  };

  const keepMemory = async () => {
    const memory = {
      id: crypto.randomUUID(),
      store: scan.store,
      date: scan.date,
      total: scan.total ?? lineTotal,
      currency: scan.currency,
      lineCount: scan.lines.length,
      savedAt: new Date().toISOString(),
    };
    try {
      await receiptMemories.save(memory.id, {
        ...memory,
        image: await toDataUrl(await shrinkImage(photo, MEMORY_EDGE_PX, MEMORY_QUALITY)),
      });
    } catch {
      await receiptMemories.save(memory.id, { ...memory, image: null }).catch(() => undefined);
      showToast("Kept the receipt without its photo: this browser's storage is full", "error");
    }
  };

  // One line at a time, remembering what went in, so a retry after an error never adds a line twice.
  const addToStock = async () => {
    setSaving(true);
    const nowAdded = new Set(added);
    for (const { choice, index, line } of toAdd) {
      const product = activeProducts.find((candidate) => candidate.id === choice.productId);
      if (!product || !line) continue;
      try {
        await stockAction.mutateAsync({
          type: "add",
          productId: product.id,
          amount: choice.amount,
          locationId: product.location_id,
          bestBeforeDate: bestBeforeFor(product.default_best_before_days),
          price: choice.amount > 0 ? line.line_total / choice.amount : undefined,
          shoppingLocationId: shopId,
        });
        nowAdded.add(index);
        setAdded(new Set(nowAdded));
      } catch (error) {
        showToast(`Stopped at line ${index + 1}: ${error instanceof Error ? error.message : "Grocy said no"}`, "error");
        setSaving(false);
        return;
      }
    }
    if (rememberMatches) {
      for (const { choice, line } of rows) {
        if (choice.productId === null || !line) continue;
        const receiptName = normalizeReceiptName(line.name);
        await receiptMatches.save(receiptName, { receiptName, productId: choice.productId }).catch(() => undefined);
      }
    }
    await keepMemory();
    await refreshReceipts();
    showToast(`Added ${nowAdded.size} ${nowAdded.size === 1 ? "item" : "items"} to stock`);
    earnLeaves(LEAVES_PER_RECEIPT);
    showToast(`+${LEAVES_PER_RECEIPT} leaves for scanning a receipt`);
    router.push("/receipts", { transitionTypes: NAV_FORWARD });
  };

  return (
    <>
      <ReceiptScanHeader>
        <SummaryTile label="Lines" value={<AnimatedNumber value={scan.lines.length} />} />
        <SummaryTile label="Total" value={formatMoney(scan.total ?? lineTotal, scan.currency)} />
        <SummaryTile label="Matched" value={<AnimatedNumber value={rows.length - needsYouCount} />} tone="sage" />
        <SummaryTile label="Needs you" value={<AnimatedNumber value={needsYouCount} />} tone="honey" />
      </ReceiptScanHeader>

      <div className="animate-in fade-in duration-200 lg:mx-auto lg:flex lg:w-full lg:max-w-[1240px] lg:min-h-0 lg:flex-1 lg:gap-5">
        <section
          aria-label="Receipt photo"
          className="flex min-h-0 min-w-0 flex-col gap-3 max-lg:absolute max-lg:inset-0 max-lg:px-4 max-lg:pt-20 max-lg:pb-[calc(9.5rem+0.75rem)] lg:flex-[1_1_420px]"
        >
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:rounded-xl lg:bg-[#EFE6D3]">
          <div className="flex min-h-0 flex-1 overflow-hidden p-6">
            <div
              ref={photoRef}
              onPointerDown={startDrag}
              onPointerMove={drag}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
              className={`relative m-auto origin-center select-none motion-reduce:transition-none ${
                dragging ? "cursor-grabbing" : "transition-transform duration-300 ease-out"
              } ${view.zoom > 1 ? "touch-none cursor-grab" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimize */}
              <img
                src={photoUrl}
                alt={`Photo of the ${scan.store ?? ""} receipt`}
                draggable={false}
                className="block max-h-[calc(100dvh-20rem)] w-auto max-w-full rounded-md shadow-paper lg:max-h-[calc(100dvh-260px)]"
              />
              {rows.map(({ choice, index, line }) =>
                line?.y === null || line?.y === undefined ? null : (
                  <span
                    key={index}
                    aria-hidden
                    style={{ top: `${Math.min(Math.max(line.y, 0), 1) * 100}%` }}
                    className={`absolute -left-3 flex size-5.5 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-semibold text-primary-foreground shadow-paper ring-2 ring-[#3A322A] lg:ring-[#EFE6D3] ${
                      needsYou(choice) ? "bg-[#C8901F]" : "bg-sage-deep"
                    }`}
                  >
                    {index + 1}
                  </span>
                ),
              )}
            </div>
          </div>
          </div>
          <div className="flex items-center gap-1 rounded-full border-[1.5px] border-border bg-card p-1">
            <span className="flex-1 truncate pl-3.5 text-sm text-muted-foreground">
              {scan.lines.length} {scan.lines.length === 1 ? "line" : "lines"}
              <span className="max-sm:hidden"> read from this photo</span>
            </span>
            <button
              type="button"
              aria-label="Zoom out"
              disabled={view.zoom <= 1}
              onClick={() => zoomTo(Math.max(1, view.zoom - ZOOM_STEP))}
              className="size-11 rounded-full text-lg font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 disabled:opacity-40"
            >
              −
            </button>
            <span className="tabular w-11 text-center text-[13px] font-semibold text-muted-foreground">
              {Math.round(view.zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={view.zoom >= MAX_ZOOM}
              onClick={() => zoomTo(Math.min(MAX_ZOOM, view.zoom + ZOOM_STEP))}
              className="size-11 rounded-full text-lg font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 disabled:opacity-40"
            >
              +
            </button>
            <span aria-hidden className="mx-1 h-6 w-px bg-border" />
            <button
              type="button"
              onClick={onRetake}
              className="h-11 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-150 ease-out hover:bg-muted/40"
            >
              Retake
            </button>
          </div>
        </section>

        <section
          aria-label="Matched lines"
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden bg-card max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:h-[80dvh] max-lg:rounded-t-[28px] max-lg:shadow-[0_-12px_32px_-12px_rgba(0,0,0,.45)] max-lg:transition-transform max-lg:duration-300 max-lg:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none lg:flex-[1_1_480px] lg:rounded-xl lg:border-[1.5px] lg:border-border lg:shadow-paper ${
            sheetOpen ? "" : "max-lg:translate-y-[calc(80dvh-9.5rem)]"
          }`}
        >
          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? "Lower the list to see the photo" : "Raise the list"}
            className="group -my-1.5 flex h-11 shrink-0 items-center justify-center lg:hidden"
          >
            <span aria-hidden className="h-1.5 w-11 rounded-full bg-oat transition-colors duration-150 ease-out group-hover:bg-muted-foreground/40" />
          </button>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-2.5 lg:pt-3.5">
            <div className="flex min-w-0 flex-col leading-tight">
              <h2 className="truncate text-xl">
                {scan.store ?? "Receipt"}
                {isIsoDate(scan.date) && (
                  <span className="text-base font-medium text-muted-foreground"> · {formatDate(scan.date)}</span>
                )}
              </h2>
              <span className="text-[13px] text-muted-foreground">Tap a match to change it</span>
            </div>
            <div role="tablist" aria-label="Filter lines" className="ml-auto flex gap-1 rounded-full bg-muted p-1">
              {[
                { value: "all", label: `All ${rows.length}` },
                { value: "needsYou", label: `Needs you ${needsYouCount}` },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab.value}
                  onClick={() => setFilter(tab.value === "all" ? "all" : "needsYou")}
                  className={`h-9 rounded-full px-3.5 text-[13px] transition-colors duration-150 ease-out pointer-coarse:h-11 ${
                    filter === tab.value
                      ? "bg-card font-semibold shadow-[0_2px_6px_rgba(74,59,46,.12)]"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 px-4 pb-2.5 lg:hidden">
            <SummaryTile label="Total" value={formatMoney(scan.total ?? lineTotal, scan.currency)} />
            <SummaryTile label="Matched" value={<AnimatedNumber value={rows.length - needsYouCount} />} tone="sage" />
            <SummaryTile label="Needs you" value={<AnimatedNumber value={needsYouCount} />} tone="honey" />
          </div>

          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pt-1 pb-3">
            {choices === null && <li className="py-6 text-center text-sm text-muted-foreground">Matching lines…</li>}
            {choices !== null && visibleRows.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">Nothing needs you. Every line is matched.</li>
            )}
            {visibleRows.map(({ choice, index, line }) =>
              line ? (
                <ReceiptLineCard
                  key={index}
                  number={index + 1}
                  line={line}
                  choice={choice}
                  currency={scan.currency}
                  added={added.has(index)}
                  open={openLine === index}
                  products={reviewProducts}
                  places={places}
                  onToggle={() => openLineAt(openLine === index ? null : index)}
                  onChange={(next) => updateChoice(index, next)}
                />
              ) : null,
            )}
          </ul>

          <div className="flex flex-col gap-2.5 border-t-[1.5px] border-border px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2">
              {totalMatches ? (
                <span className="inline-flex items-center gap-2 text-sm text-status-fresh-foreground">
                  <CheckIcon size={18} weight="bold" aria-hidden />
                  Lines add up to <b className="tabular">{formatMoney(lineTotal, scan.currency)}</b>, same as the receipt
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-status-soon-foreground">
                  <WarningIcon size={18} weight="duotone" aria-hidden />
                  Lines add up to <b className="tabular">{formatMoney(lineTotal, scan.currency)}</b>, the receipt says{" "}
                  <b className="tabular">{formatMoney(scan.total ?? 0, scan.currency)}</b>
                </span>
              )}
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rememberMatches}
                  onChange={(event) => setRememberMatches(event.target.checked)}
                  className="size-4.5 accent-sage-deep"
                />
                Remember matches
              </label>
            </div>
            <button
              type="button"
              disabled={saving || toAdd.length === 0}
              onClick={addToStock}
              className="h-13 rounded-full bg-sage-deep text-base font-semibold text-primary-foreground shadow-[0_3px_0_#3F5236] transition-[transform,background-color] duration-150 ease-out hover:bg-sage-deep/85 active:translate-y-px disabled:opacity-60"
            >
              {saving ? "Adding…" : `Add ${toAdd.length} ${toAdd.length === 1 ? "item" : "items"} to stock`}
            </button>
          </div>
        </section>
      </div>
    </>
  );
};
