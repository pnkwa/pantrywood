"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OPEN_SCAN } from "@/lib/page-transitions";
import { RoomView } from "@/components/room/RoomView";
import { usePantry } from "@/lib/pantry/use-pantry";
import { useRoomStorages } from "@/lib/room/use-room";
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
  const storages = useRoomStorages(pantry);

  const selection = useUiStore((state) => state.selection);
  const view = useUiStore((state) => state.view);
  const selectStorage = useUiStore((state) => state.selectStorage);
  const selectItem = useUiStore((state) => state.selectItem);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const openFridgeDoor = useUiStore((state) => state.openFridgeDoor);
  const closeFridgeDoor = useUiStore((state) => state.closeFridgeDoor);

  const fridge = storages.find((storage) => storage.kind === "fridge");
  // On phones the open door already shows the fridge; the sheet comes back when a note is tapped.
  const doorShowsStorage = view !== "room" && selection?.type === "storage";

  // A second tap on the selected fridge opens its door.
  const handleSelectStorage = (locationId: number) => {
    const tappedFridge = fridge?.locationId === locationId;
    const alreadySelected =
      selection?.type === "storage" && selection.locationId === locationId;
    if (tappedFridge && alreadySelected) openFridgeDoor(locationId);
    else selectStorage(locationId);
  };

  // Global key listener: no React event covers keys pressed anywhere on the page.
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (useUiStore.getState().view === "room") clearSelection();
      else closeFridgeDoor();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [clearSelection, closeFridgeDoor]);

  const selectedName =
    pantry?.locations.find((location) => location.id === selection?.locationId)
      ?.name ?? "Storage";

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1392px] flex-1 flex-col gap-4 px-4 pt-4 pb-28 lg:gap-5 lg:px-6 lg:pt-5 lg:pb-8">
        <TopBar pantry={pantry} onPickItem={selectItem} />
        <StatCards stats={pantry?.stats ?? null} />
        <div className="flex flex-1 flex-col gap-5 lg:h-[min(720px,calc(100dvh-240px))] lg:min-h-[560px] lg:flex-none lg:flex-row">
          <RoomView
            pantry={pantry}
            storages={storages}
            loading={pantryState.status === "loading"}
            error={
              pantryState.status === "error"
                ? { message: pantryState.message, retry: pantryState.retry }
                : null
            }
            onSelectStorage={handleSelectStorage}
          />
          <aside
            aria-label={`${selectedName} details`}
            className="relative hidden min-h-0 w-[380px] shrink-0 flex-col rounded-xl border-[1.5px] border-border bg-card p-5 shadow-paper lg:flex"
          >
            {pantry && (
              <InspectPanelContent
                pantry={pantry}
                storages={storages}
                layoutGroup="desktop-panel"
              />
            )}
          </aside>
        </div>
      </div>

      <BottomSheet
        open={Boolean(pantry && selection) && !doorShowsStorage}
        label={`${selectedName} details`}
        onClose={clearSelection}
      >
        {pantry && (
          <InspectPanelContent
            pantry={pantry}
            storages={storages}
            layoutGroup="mobile-sheet"
          />
        )}
      </BottomSheet>

      <MobileNav
        current={view === "room" ? "room" : "fridgeDoor"}
        onRoom={closeFridgeDoor}
        onFridgeDoor={fridge ? () => openFridgeDoor(fridge.locationId) : null}
      />
      <Toasts />
    </>
  );
};
