"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { TrayIcon } from "@phosphor-icons/react";
import { BottomSheet } from "@/components/pantry/BottomSheet";
import { InspectPanelContent } from "@/components/pantry/InspectPanel";
import { putAwayDestinations } from "@/components/pantry/ItemListPanel";
import { MobileNav } from "@/components/pantry/MobileNav";
import { Toasts } from "@/components/pantry/Toasts";
import { NAV_BACK, NAV_FORWARD } from "@/lib/page-transitions";
import type { GrocyPlace, Pantry } from "@/lib/pantry/model";
import { itemRows } from "@/lib/pantry/put-away";
import { usePantry } from "@/lib/pantry/use-pantry";
import { storageKindFor } from "@/lib/room/layout";
import { useRoom } from "@/lib/room/use-room";
import { useUiStore } from "@/lib/store/ui-store";
import { InsideView } from "./InsideView";

// Item pictures in the tray and on the shelves are drawn from it; three.js stays off the server.
const ThumbnailStudio = dynamic(
  () => import("@/components/scene/ThumbnailStudio").then((studio) => studio.ThumbnailStudio),
  { ssr: false },
);

// The open piece first (and its freezer, for the fridge), so "Put in…" starts with "here".
const destinationsFrom = (pantry: Pantry, openLocationId: number) => {
  const destinations = putAwayDestinations(pantry);
  const here = (place: GrocyPlace) =>
    place.id === openLocationId ||
    (place.isFreezer && pantry.locations.find((location) => location.id === openLocationId)?.items.some((item) => item.locationId === place.id));
  return [...destinations.filter(here), ...destinations.filter((place) => !here(place))];
};

/** Inside one storage piece, on its own page (`/storage/[id]`): its shelves, the Item tray and item details. */
export const StoragePage = ({ locationId }: { locationId: number }) => {
  const router = useRouter();
  const pantryState = usePantry();
  const pantry = pantryState.status === "ready" ? pantryState.pantry : null;
  const room = useRoom(pantry);
  const storages = [...room.storages, ...room.storedAway];
  const selection = useUiStore((state) => state.selection);
  const selectItem = useUiStore((state) => state.selectItem);
  const selectStorage = useUiStore((state) => state.selectStorage);

  // The URL says where you are, and the store follows it, so a refresh, a shared link or Back / Forward all land here.
  useEffect(() => {
    useUiStore.setState((state) => ({
      view: "inside",
      insideLocationId: locationId,
      selection: state.selection?.locationId === locationId ? state.selection : { type: "storage", locationId },
    }));
    return () => useUiStore.getState().closeInside();
  }, [locationId]);

  const leave = () => router.push("/", { transitionTypes: NAV_BACK });
  // Global key listener: Escape anywhere leaves the piece (the phone tray drawer handles its own Escape first).
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push("/", { transitionTypes: NAV_BACK });
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [router]);

  const location = pantry?.locations.find((candidate) => candidate.id === locationId);
  const storage = storages.find((candidate) => candidate.locationId === locationId);
  const kind = storage?.kind ?? (location ? storageKindFor(location) : undefined);
  const fridge = storages.find((candidate) => candidate.kind === "fridge");
  const itemSelected = selection?.type === "item";

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1392px] flex-1 flex-col gap-5 px-4 pt-4 pb-28 lg:h-dvh lg:flex-row lg:px-6 lg:py-5">
        <section
          aria-label={location ? `Inside the ${location.name}` : "Inside the storage"}
          className="relative h-[calc(100dvh-8rem)] min-w-0 overflow-hidden rounded-xl border-[1.5px] border-border bg-gingham shadow-paper lg:h-full lg:flex-1"
        >
          {pantry && location && kind ? (
            <InsideView
              location={location}
              kind={kind}
              palette={storage?.palette ?? null}
              selectedItemKey={itemSelected ? (selection.itemKey ?? `${selection.locationId}-${selection.productId}`) : null}
              onPickItem={(productId, itemKey) => selectItem(location.id, productId, itemKey)}
              onClose={leave}
              waiting={pantry.waiting}
              elsewhere={itemRows([], pantry.locations.filter((candidate) => candidate.id !== location.id))}
              destinations={destinationsFrom(pantry, location.id)}
            />
          ) : (
            <p role="status" className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {pantryState.status === "ready" ? "This storage isn't in Grocy any more" : "Opening…"}
            </p>
          )}
        </section>
        <aside
          aria-label={itemSelected ? "Item details" : "Item tray"}
          // Items dragged out of the 3D view can be dropped anywhere on it to go back in the Item tray.
          data-tray-drop
          className="group/tray relative hidden min-h-0 w-[380px] shrink-0 flex-col overflow-hidden rounded-xl border-[1.5px] border-border bg-card p-5 shadow-paper lg:flex"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-2 z-30 flex flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-sage-deep bg-card/90 text-sage-deep opacity-0 transition-opacity duration-150 ease-out group-data-[drop-over]/tray:opacity-100"
          >
            <TrayIcon size={32} weight="duotone" />
            <span className="text-sm font-semibold">Drop to put it back in the Item tray</span>
          </div>
          {pantry && <InspectPanelContent pantry={pantry} storages={storages} layoutGroup="desktop-panel" />}
        </aside>
      </div>

      {/* Phones: the tray is a drawer in the view; tapping an item brings its details up in the sheet. */}
      <BottomSheet open={Boolean(pantry && itemSelected)} label="Item details" onClose={() => selectStorage(locationId)} size="tall">
        {pantry && <InspectPanelContent pantry={pantry} storages={storages} layoutGroup="mobile-sheet" />}
      </BottomSheet>

      <ThumbnailStudio />
      <MobileNav
        current={fridge?.locationId === locationId ? "fridge" : "room"}
        onRoom={leave}
        onFridge={fridge ? () => router.push(`/storage/${fridge.locationId}`, { transitionTypes: NAV_FORWARD }) : null}
      />
      <Toasts />
    </>
  );
};
