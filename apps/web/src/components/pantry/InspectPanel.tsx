"use client";

import { useState, type Ref } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Variants,
} from "motion/react";
import type { SceneStorage, StorageKind } from "@/components/scene/types";
import { useStockAction } from "@/lib/grocy";
import { findItem, type Pantry, type PantryLocation } from "@/lib/pantry/model";
import { useUiStore } from "@/lib/store/ui-store";
import { PANEL_SPRING } from "@/lib/motion";
import { FadeIn } from "./FadeIn";
import { PANEL_PUSH_DISTANCE, type PanelDirection } from "./PanelDirection";
import { STORAGE_ICONS } from "./icons";
import { ItemPanel } from "./ItemPanel";
import { ItemSpot } from "@/components/inside/ItemSpot";
import { storageKindFor } from "@/lib/room/layout";
import { StoragePanel } from "./StoragePanel";
import { useInsideNavigation } from "@/lib/inside/navigation";
import { ItemListPanel } from "./ItemListPanel";
import { ListBulletsIcon } from "@phosphor-icons/react";

type InspectPanelProps = {
  pantry: Pantry;
  storages: readonly SceneStorage[];
  layoutGroup: string;
};

const kindFor = (
  storages: readonly SceneStorage[],
  location: PantryLocation,
): StorageKind =>
  storages.find((storage) => storage.locationId === location.id)?.kind ??
  storageKindFor(location);

// AnimatePresence's popLayout needs the ref to lift the leaving panel out of the flow.
/**
 * Push / pop: the arriving panel slides in from the side you're heading to while the
 * leaving one slides away and fades. The arriving panel only moves (its sections fade on
 * their own), so the flying item icon stays fully visible.
 */
const panelVariants = {
  enter: (direction: PanelDirection) => ({
    x: direction * PANEL_PUSH_DISTANCE,
  }),
  center: { x: 0, transition: PANEL_SPRING },
  exit: (direction: PanelDirection) => ({
    opacity: 0,
    x: -direction * PANEL_PUSH_DISTANCE,
    transition: { duration: 0.22, ease: "easeOut" },
  }),
} satisfies Variants;

const PanelMotion = ({
  children,
  direction,
  ref,
}: {
  children: React.ReactNode;
  direction: PanelDirection;
  ref?: Ref<HTMLDivElement>;
}) => (
  <motion.div
    ref={ref}
    variants={panelVariants}
    custom={direction}
    initial="enter"
    animate="center"
    exit="exit"
    className="flex h-full min-h-0 w-full flex-col"
  >
    {children}
  </motion.div>
);

const depthOf = (contentKey: string) => {
  if (contentKey.startsWith("item-")) return 2;
  if (contentKey.startsWith("storage-")) return 1;
  return 0;
};

const StorageList = ({
  pantry,
  storages,
}: {
  pantry: Pantry;
  storages: readonly SceneStorage[];
}) => {
  const selectStorage = useUiStore((state) => state.selectStorage);
  const openItemList = useUiStore((state) => state.openItemList);
  return (
    <div className="flex h-full flex-col gap-4">
      <FadeIn>
        <h2 className="text-[22px]">Peek inside</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a storage piece in the room, or pick one here.
        </p>
      </FadeIn>
      <FadeIn order={1} className="flex min-h-0 flex-col">
      <ul className="flex flex-col gap-2 overflow-y-auto">
        <li>
          <button
            type="button"
            onClick={openItemList}
            className="flex min-h-14 w-full items-center gap-3 rounded-md border-[1.5px] border-border px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="flex size-10 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
              <ListBulletsIcon size={22} weight="duotone" aria-hidden />
            </span>
            <span className="flex-1 font-semibold">All items</span>
            {pantry.waiting.length > 0 && (
              <span className="tabular rounded-full bg-status-soon px-2 py-0.5 text-xs font-semibold text-status-soon-foreground">
                {pantry.waiting.length} to put away
              </span>
            )}
          </button>
        </li>
        {pantry.locations.map((location) => {
          const StorageIcon = STORAGE_ICONS[kindFor(storages, location)];
          return (
            <li key={location.id}>
              <button
                type="button"
                onClick={() => selectStorage(location.id)}
                className="flex min-h-14 w-full items-center gap-3 rounded-md border-[1.5px] border-border px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex size-10 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
                  <StorageIcon size={22} weight="duotone" aria-hidden />
                </span>
                <span className="flex-1 font-semibold">{location.name}</span>
                <span className="tabular text-sm text-muted-foreground">
                  {location.counts.itemCount} items
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      </FadeIn>
    </div>
  );
};

export const InspectPanelContent = ({
  pantry,
  storages,
  layoutGroup,
}: InspectPanelProps) => {
  const selection = useUiStore((state) => state.selection);
  const selectStorage = useUiStore((state) => state.selectStorage);
  const selectItem = useUiStore((state) => state.selectItem);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const { openInside, closeInside } = useInsideNavigation();
  const view = useUiStore((state) => state.view);
  const insideLocationId = useUiStore((state) => state.insideLocationId);
  const showToast = useUiStore((state) => state.showToast);
  const itemListOpen = useUiStore((state) => state.itemListOpen);
  const stockAction = useStockAction();
  const [navigation, setNavigation] = useState<{
    key: string | null;
    direction: PanelDirection;
  }>({ key: null, direction: 1 });

  const location = selection
    ? pantry.locations.find((candidate) => candidate.id === selection.locationId)
    : undefined;
  const item =
    selection?.type === "item"
      ? findItem(
          pantry,
          selection.locationId,
          selection.productId,
          selection.itemKey,
        )
      : undefined;

  // Open inside the piece, the panel always shows something of it: an item's ✕ goes back to its list, the list's ✕ leaves.
  const insideThis = view !== "room" && insideLocationId === location?.id;
  const content = (() => {
    if (!location && itemListOpen) return { key: "items", node: <ItemListPanel pantry={pantry} /> };
    if (!location) {
      return {
        key: "list",
        node: <StorageList pantry={pantry} storages={storages} />,
      };
    }
    if (item) {
      return {
        key: `item-${item.key}`,
        node: (
          <ItemPanel
            item={item}
            locationName={location.name}
            destinations={pantry.places
              .filter((place) => place.id !== item.locationId)
              .map((place) => ({ id: place.id, name: place.name }))}
            spot={
              insideThis ? (
                <ItemSpot item={item} location={location} kind={kindFor(storages, location)} />
              ) : undefined
            }
            onBack={() => selectStorage(location.id)}
            onClose={insideThis ? () => selectStorage(location.id) : clearSelection}
          />
        ),
      };
    }
    const lowItems = location.items.filter((candidate) => candidate.isRunningLow);
    return {
      key: `storage-${location.id}`,
      node: (
        <StoragePanel
          location={location}
          storageKind={kindFor(storages, location)}
          busy={stockAction.isPending}
          onClose={insideThis ? closeInside : clearSelection}
          onPickItem={(productId, itemKey) =>
            selectItem(location.id, productId, itemKey)
          }
          onOpenInside={insideThis ? undefined : () => openInside(location.id)}
          onAddLowToShoppingList={() =>
            stockAction.mutate(
              {
                type: "addItemsToShoppingList",
                items: lowItems.map((candidate) => ({
                  productId: candidate.productId,
                  amount: Math.max(1, candidate.minStock - candidate.totalAmount),
                })),
              },
              {
                onSuccess: () =>
                  showToast(
                    `${lowItems.length} low ${lowItems.length === 1 ? "item" : "items"} added to the shopping list`,
                  ),
                onError: (error) => showToast(error.message, "error"),
              },
            )
          }
        />
      ),
    };
  })();

  if (content.key !== navigation.key) {
    setNavigation({
      key: content.key,
      direction:
        depthOf(content.key) >= depthOf(navigation.key ?? content.key)
          ? 1
          : -1,
    });
  }

  return (
    <LayoutGroup id={layoutGroup}>
      <AnimatePresence
        mode="popLayout"
        initial={false}
        custom={navigation.direction}
      >
        <PanelMotion key={content.key} direction={navigation.direction}>
          {content.node}
        </PanelMotion>
      </AnimatePresence>
    </LayoutGroup>
  );
};
