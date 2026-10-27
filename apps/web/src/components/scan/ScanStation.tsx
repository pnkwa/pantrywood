"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { CLOSE_SCAN, NAV_FORWARD, SCAN_TAB } from "@/lib/page-transitions";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeftIcon, KeyboardIcon, PrinterIcon, XIcon } from "@phosphor-icons/react";
import { useBarcodeLookup } from "@/lib/grocy";
import { PANEL_SPRING } from "@/lib/motion";
import { usePantry } from "@/lib/pantry/use-pantry";
import { useCameraScanner } from "@/lib/scan/camera-scanner";
import { useHardwareScanner } from "@/lib/scan/hardware-scanner";
import { useScanStore, type ScanMode } from "@/lib/store/scan-store";
import { Toasts } from "@/components/pantry/Toasts";
import { CameraView } from "./CameraView";
import { NewBarcodeCard } from "./NewBarcodeCard";
import { PinnedScanHeader, SlidingTabPill } from "./PinnedScanHeader";
import { ScanResultCard } from "./ScanResultCard";
import { SessionList } from "./SessionList";

// The camera sees the same code many times a second; ignore repeats for a moment.
const REPEAT_DETECTION_MS = 2500;

const MODES: { mode: ScanMode; label: string; shortLabel: string }[] = [
  { mode: "add", label: "Add to stock", shortLabel: "Add" },
  { mode: "eat", label: "Eat / use", shortLabel: "Eat" },
  { mode: "check", label: "Check stock", shortLabel: "Check" },
];

const ModeSwitch = () => {
  const mode = useScanStore((state) => state.mode);
  const setMode = useScanStore((state) => state.setMode);
  return (
    <div
      role="radiogroup"
      aria-label="What happens after a scan"
      className="flex gap-1 rounded-full bg-[#2B261F]/60 p-1 lg:ml-auto lg:bg-muted"
    >
      {MODES.map((option) => {
        const selected = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setMode(option.mode)}
            className={`h-11 rounded-full px-4 text-sm transition-colors duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring lg:h-10 lg:pointer-coarse:h-11 ${
              selected
                ? "bg-sage-deep font-semibold text-primary-foreground"
                : "font-medium text-[#F3EADB] hover:bg-[#F3EADB]/10 lg:text-foreground lg:hover:bg-card/70"
            }`}
          >
            <span className="lg:hidden">{option.shortLabel}</span>
            <span className="hidden lg:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const KIND_TAB_CLASS = "flex h-10 flex-1 items-center justify-center rounded-full px-4 text-sm pointer-coarse:h-11 lg:flex-none";
const KIND_TAB_SELECTED =
  "bg-card font-semibold text-foreground shadow-[0_2px_6px_rgba(74,59,46,.12)]";
const KIND_TAB_IDLE = "font-medium text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground";

type ScanKindTabsProps = {
  current: "barcode" | "receipt";
  /** Over the phone camera the switch sits on a dark tint. */
  overCamera?: boolean;
};

export const ScanKindTabs = ({ current, overCamera = false }: ScanKindTabsProps) => (
  <div
    role="tablist"
    aria-label="What to scan"
    className={`flex flex-1 gap-1 rounded-full p-1 lg:flex-none ${
      overCamera ? "bg-[#2B261F]/60 lg:bg-muted [&>a]:max-lg:text-[#F3EADB]" : "bg-muted"
    }`}
  >
    {[
      { kind: "barcode", label: "Barcode", href: "/scan" },
      { kind: "receipt", label: "Receipt", href: "/scan/receipt" },
    ].map((tab) =>
      tab.kind === current ? (
        <SlidingTabPill key={tab.kind}>
          <span role="tab" aria-selected className={`${KIND_TAB_CLASS} ${KIND_TAB_SELECTED}`}>
            {tab.label}
          </span>
        </SlidingTabPill>
      ) : (
        <Link
          key={tab.kind}
          href={tab.href}
          transitionTypes={SCAN_TAB}
          role="tab"
          aria-selected={false}
          className={`${KIND_TAB_CLASS} ${KIND_TAB_IDLE}`}
        >
          {tab.label}
        </Link>
      ),
    )}
  </div>
);

const UsbReady = () => (
  <div className="flex items-center gap-3 rounded-lg bg-status-fresh px-4 py-3.5 text-status-fresh-foreground">
    <span aria-hidden className="relative size-3.5 shrink-0">
      <span className="absolute -inset-1.5 rounded-full bg-sage opacity-30 motion-safe:animate-ping" />
      <span className="absolute inset-0 rounded-full bg-sage-deep" />
    </span>
    <span className="flex flex-col">
      <span className="text-[15px] font-semibold">USB scanner ready</span>
      <span className="text-[13px]">Just scan, no need to click anything first</span>
    </span>
  </div>
);

const TypedBarcode = ({ onSubmit }: { onSubmit: (code: string) => void }) => {
  const [typed, setTyped] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!typed.trim()) return;
        onSubmit(typed);
        setTyped("");
      }}
      className="flex h-12 items-center gap-2.5 rounded-full border-[1.5px] border-border bg-card px-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring"
    >
      <KeyboardIcon size={18} className="text-muted-foreground" aria-hidden />
      <label className="sr-only" htmlFor="typed-barcode">
        Type a barcode
      </label>
      <input
        id="typed-barcode"
        inputMode="numeric"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        placeholder="Or type the barcode numbers"
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
};

export const ScanStation = () => {
  const router = useRouter();
  const pantryState = usePantry();
  const places = pantryState.status === "ready" ? pantryState.pantry.places : [];
  const mode = useScanStore((state) => state.mode);
  const currentBarcode = useScanStore((state) => state.currentBarcode);
  const scanCount = useScanStore((state) => state.scanCount);
  const keepScanning = useScanStore((state) => state.keepScanning);
  const session = useScanStore((state) => state.session);
  const showBarcode = useScanStore((state) => state.showBarcode);
  const clearBarcode = useScanStore((state) => state.clearBarcode);
  const clearSession = useScanStore((state) => state.clearSession);
  const lookup = useBarcodeLookup(currentBarcode);
  const lastDetection = useRef({ code: "", at: 0 });

  const handleCameraDetect = useCallback((code: string) => {
    const state = useScanStore.getState();
    if (state.currentBarcode) return;
    const now = performance.now();
    const repeat =
      code === lastDetection.current.code &&
      now - lastDetection.current.at < REPEAT_DETECTION_MS;
    lastDetection.current = { code, at: now };
    if (repeat) return;
    if (typeof navigator.vibrate === "function") navigator.vibrate(30);
    state.showBarcode(code);
  }, []);

  const handleHardwareScan = useCallback(
    (code: string) => useScanStore.getState().showBarcode(code),
    [],
  );
  useHardwareScanner(handleHardwareScan);
  const camera = useCameraScanner({ enabled: true, onDetect: handleCameraDetect });

  const leave = () => {
    clearBarcode();
    clearSession();
    router.push("/", { transitionTypes: CLOSE_SCAN });
  };

  const finishItem = () => {
    if (keepScanning) clearBarcode();
    else leave();
  };

  const addedCount = session.filter((row) => !row.undone && row.mode === "add").length;
  const found = lookup.data?.status === "found";
  const needsYou = Boolean(currentBarcode) && lookup.data?.status === "new";

  const result = (() => {
    if (!currentBarcode) return null;
    if (lookup.isPending) {
      return (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Looking up {currentBarcode}…
        </p>
      );
    }
    if (lookup.isError) {
      return (
        <div role="alert" className="flex items-center gap-3 rounded-md bg-status-expired px-4 py-3 text-sm text-status-expired-foreground">
          <span className="flex-1">Couldn&apos;t reach Grocy. {lookup.error.message}</span>
          <button type="button" onClick={() => lookup.refetch()} className="h-11 font-semibold underline-offset-4 hover:underline">
            Try again
          </button>
        </div>
      );
    }
    if (lookup.data?.status === "found") {
      return (
        <ScanResultCard
          key={`${currentBarcode}-${lookup.data.details.product.id}-${mode}`}
          barcode={currentBarcode}
          details={lookup.data.details}
          mode={mode}
          places={places}
          onDone={finishItem}
        />
      );
    }
    return (
      <NewBarcodeCard
        key={currentBarcode}
        barcode={currentBarcode}
      />
    );
  })();

  return (
    <div className="relative h-dvh overflow-hidden bg-[#2B261F] lg:flex lg:flex-col lg:gap-4 lg:bg-background lg:p-5">
      <PinnedScanHeader>
        <header className="absolute inset-x-4 top-4 z-20 flex flex-col gap-3 lg:static lg:mx-auto lg:w-full lg:max-w-[1240px] lg:flex-row lg:flex-wrap lg:items-center lg:rounded-[22px] lg:border-[1.5px] lg:border-border lg:bg-card lg:px-4 lg:py-3 lg:shadow-paper">
          <div className="flex items-center gap-2 lg:gap-3">
            <button
              type="button"
              onClick={leave}
              aria-label="Back to the storage room"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#2B261F]/60 text-[#F3EADB] transition-colors duration-150 ease-out hover:bg-[#2B261F]/80 lg:border-[1.5px] lg:border-border lg:bg-card lg:text-foreground lg:hover:bg-muted/40"
            >
              <XIcon size={18} weight="bold" className="lg:hidden" aria-hidden />
              <ArrowLeftIcon size={18} weight="bold" className="hidden lg:block" aria-hidden />
            </button>
            <h1 className="hidden text-2xl lg:block">Scan</h1>
            <ScanKindTabs current="barcode" overCamera />
          </div>
          <div className="self-center lg:ml-auto lg:self-auto">
            <ModeSwitch />
          </div>
        </header>
      </PinnedScanHeader>

      <div className="lg:mx-auto lg:flex lg:min-h-0 lg:w-full lg:max-w-[1240px] lg:flex-1 lg:gap-5">
        <section aria-label="Scanner" className="lg:flex lg:min-h-0 lg:flex-[1_1_420px] lg:flex-col lg:gap-3">
          <CameraView
            videoRef={camera.videoRef}
            status={camera.status}
            mirrored={camera.mirrored}
            flashKey={scanCount}
            found={Boolean(currentBarcode) && found}
          />
          <span className="absolute top-[calc(50%+11rem)] left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#2B261F]/60 px-3 py-1.5 text-xs font-medium text-[#F3EADB] lg:hidden">
            <span aria-hidden className="size-2 rounded-full bg-[#A9D18E]" />
            USB scanner ready
          </span>
          <div className="hidden lg:block">
            <UsbReady />
          </div>
          <div className="hidden lg:block">
            <TypedBarcode onSubmit={showBarcode} />
          </div>
        </section>

        <section
          aria-label="This session"
          className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[78dvh] flex-col gap-3.5 overflow-y-auto rounded-t-[28px] bg-card px-4 pt-2.5 pb-6 lg:static lg:flex lg:max-h-none lg:min-h-0 lg:flex-[1_1_480px] lg:gap-3 lg:overflow-hidden lg:rounded-xl lg:border-[1.5px] lg:border-border lg:p-[18px] lg:shadow-paper ${
            result ? "" : "max-lg:hidden"
          }`}
        >
          <span aria-hidden className="mx-auto block h-1.5 w-11 shrink-0 rounded-full bg-oat lg:hidden" />
          <div className="hidden items-baseline justify-between lg:flex">
            <h2 className="text-xl">This session</h2>
            <span className="text-[13px] text-muted-foreground">
              {addedCount} added{needsYou && " · 1 needs you"}
            </span>
          </div>
          {result && (
            <motion.div
              key={`${currentBarcode}-${scanCount}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={PANEL_SPRING}
            >
              {result}
            </motion.div>
          )}
          <div className="hidden min-h-0 flex-1 flex-col gap-3 lg:flex">
            <SessionList />
            <div className="flex items-center gap-3 rounded-md bg-muted px-3.5 py-3">
              <PrinterIcon size={22} weight="duotone" className="shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-[13px]">
                Market goods without a barcode? Print a Pantrywood label once, then scan it next time.
              </span>
              <Link
                href="/scan/labels"
                transitionTypes={NAV_FORWARD}
                className="flex h-11 shrink-0 items-center rounded-full bg-card px-3.5 text-[13px] font-semibold transition-colors duration-150 ease-out hover:bg-oat/25"
              >
                Print labels
              </Link>
            </div>
            <button
              type="button"
              onClick={leave}
              className="h-12 shrink-0 rounded-full bg-sage-deep text-base font-semibold text-primary-foreground shadow-[0_3px_0_#3F5236] transition-[transform,background-color] duration-150 ease-out hover:bg-sage-deep/85 active:translate-y-px"
            >
              Done · {addedCount} {addedCount === 1 ? "item" : "items"} added
            </button>
          </div>
        </section>
      </div>
      <Toasts />
    </div>
  );
};
