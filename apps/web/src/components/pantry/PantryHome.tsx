"use client";

import { useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { PANEL_SPRING } from "@/lib/motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { OPEN_SCAN } from "@/lib/page-transitions";
import { RoomView } from "@/components/room/RoomView";
import { usePantry } from "@/lib/pantry/use-pantry";
import { BoardPanel } from "@/components/board/BoardPanel";
import { BuyDialog } from "@/components/decorate/BuyDialog";

// Three.js stays out of the first page load; the studio is only needed once Decorate opens.
const ThumbnailStudio = dynamic(
  () => import("@/components/scene/ThumbnailStudio").then((studio) => studio.ThumbnailStudio),
  { ssr: false },
);
import { useDecorate } from "@/lib/room/use-decorate";
import { useRoom } from "@/lib/room/use-room";
import { useHardwareScanner } from "@/lib/scan/hardware-scanner";
import { useScanStore } from "@/lib/store/scan-store";
import { useUiStore } from "@/lib/store/ui-store";
import { BottomSheet } from "./BottomSheet";
import { InspectPanelContent } from "./InspectPanel";
import { MobileNav } from "./MobileNav";
import { StatCards } from "./StatCards";
import { Toasts } from "./Toasts";
import { TopBar } from "./TopBar";

export const PantryHome = () => {
  const router = useRouter();
  // A hardware scan anywhere in the room opens the scan screen with that code.
  const openScanWith = useCallback(
    (code: string) => {
      useScanStore.getState().showBarcode(code);
      router.push("/scan", { transitionTypes: OPEN_SCAN });
    },
    [router],
  );
  useHardwareScanner(openScanWith);
  const pantryState = usePantry();
  const pantry = pantryState.status === "ready" ? pantryState.pantry : null;
  const room = useRoom(pantry);
  // Put-away storage is out of the room but still a Grocy location, so panels and lists keep it.
  const storages = [...room.storages, ...room.storedAway];
  const decorate = useDecorate(
    room.context,
    pantry?.locations.map((location) => location.name) ?? [],
  );
  const decorating = useUiStore((state) => state.decorating);
  const boardOpen = useUiStore((state) => state.boardOpen);
  const reducedMotion = useReducedMotion();
  const sheetOpen = useUiStore((state) => state.sheetOpen);

  const selection = useUiStore((state) => state.selection);
  const view = useUiStore((state) => state.view);
  const selectStorage = useUiStore((state) => state.selectStorage);
  const selectItem = useUiStore((state) => state.selectItem);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const insideLocationId = useUiStore((state) => state.insideLocationId);
  const openInside = useUiStore((state) => state.openInside);
  const closeInside = useUiStore((state) => state.closeInside);

  const fridge = storages.find((storage) => storage.kind === "fridge");
  // On phones the inside view already shows the piece; the sheet comes back when an item is tapped.
  const doorShowsStorage = view !== "room" && selection?.type === "storage";

  // A second tap on the selected piece opens it.
  const handleSelectStorage = (locationId: number) => {
    const alreadySelected =
      selection?.type === "storage" && selection.locationId === locationId;
    if (alreadySelected) openInside(locationId);
    else selectStorage(locationId);
  };

  // Global key listener: no React event covers keys pressed anywhere on the page.
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const ui = useUiStore.getState();
      if (ui.boardOpen) {
        if (ui.boardPiece) ui.selectBoardPiece(null);
        else ui.closeBoard();
      } else if (ui.decorating) {
        if (ui.decorPiece) ui.selectDecorPiece(null);
        else ui.setDecorating(false);
      } else if (ui.decorPiece) ui.selectDecorPiece(null);
      else if (ui.view === "room") clearSelection();
      else closeInside();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [clearSelection, closeInside]);

  const selectedName =
    pantry?.locations.find((location) => location.id === selection?.locationId)
      ?.name ?? "Storage";

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1392px] flex-1 flex-col gap-4 px-4 pt-4 pb-28 lg:gap-5 lg:px-6 lg:pt-5 lg:pb-8">
        <TopBar pantry={pantry} onPickItem={selectItem} />
        {/* Decorate is about the room, so the stock numbers step aside and the room takes their space. */}
        <AnimatePresence initial={false} mode="popLayout">
          {!decorating && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: reducedMotion ? 0 : -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -12, transition: { duration: 0.15 } }}
              transition={reducedMotion ? { duration: 0.15 } : PANEL_SPRING}
            >
              <StatCards stats={pantry?.stats ?? null} />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          layout
          transition={reducedMotion ? { duration: 0 } : PANEL_SPRING}
          className={`flex flex-1 flex-col gap-5 lg:min-h-[480px] lg:flex-none lg:flex-row ${
            decorating ? "lg:h-[min(828px,calc(100dvh-172px))]" : "lg:h-[min(720px,calc(100dvh-280px))]"
          }`}
        >
          {/* Decorate gives the room the full width; the layout animation glides it there with transforms. */}
          <motion.div layout transition={reducedMotion ? { duration: 0 } : PANEL_SPRING} className="flex min-w-0 flex-1 flex-col">
          <RoomView
            pantry={pantry}
            storages={room.storages}
            room={room}
            decorate={decorate}
            loading={pantryState.status === "loading"}
            error={
              pantryState.status === "error"
                ? { message: pantryState.message, retry: pantryState.retry }
                : null
            }
            onSelectStorage={handleSelectStorage}
          />
          </motion.div>
          <AnimatePresence initial={false}>
          {!decorating && (
          <motion.aside
            key="panel"
            initial={{ opacity: 0, x: reducedMotion ? 0 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducedMotion ? 0 : 24, transition: { duration: 0.15 } }}
            transition={reducedMotion ? { duration: 0.15 } : PANEL_SPRING}
            aria-label={boardOpen ? "Pegboard" : `${selectedName} details`}
            className="relative hidden min-h-0 w-[380px] shrink-0 flex-col overflow-hidden rounded-xl border-[1.5px] border-border bg-card p-5 shadow-paper lg:flex"
          >
            {boardOpen ? (
              <BoardPanel pantry={pantry} decorate={decorate} />
            ) : (
              pantry && (
                <InspectPanelContent
                  pantry={pantry}
                  storages={storages}
                  layoutGroup="desktop-panel"
                />
              )
            )}
          </motion.aside>
          )}
          </AnimatePresence>
        </motion.div>
      </div>

      <BottomSheet
        // Decorate keeps its catalog in the room's build tray, so the sheet stays shut.
        open={decorating ? false : boardOpen ? sheetOpen : Boolean(pantry && selection) && !doorShowsStorage}
        label={boardOpen ? "Pegboard" : `${selectedName} details`}
        onClose={boardOpen ? () => useUiStore.getState().setSheetOpen(false) : clearSelection}
        size={boardOpen ? "short" : "tall"}
      >
        {boardOpen ? (
          <BoardPanel pantry={pantry} decorate={decorate} />
        ) : (
          pantry && (
            <InspectPanelContent
              pantry={pantry}
              storages={storages}
              layoutGroup="mobile-sheet"
            />
          )
        )}
      </BottomSheet>

      {(decorating || boardOpen) && <BuyDialog />}
      {decorating && <ThumbnailStudio />}

      <MobileNav
        current={view !== "room" && insideLocationId === fridge?.locationId ? "fridge" : "room"}
        onRoom={closeInside}
        onFridge={fridge ? () => openInside(fridge.locationId) : null}
      />
      <Toasts />
    </>
  );
};
