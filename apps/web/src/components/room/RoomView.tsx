"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { OPEN_SCAN } from "@/lib/page-transitions";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownIcon,
  BarcodeIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  HouseSimpleIcon,
  type Icon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import type { CameraApi, CameraFocus, PanDirection } from "@/components/scene/CameraRig";
import { createSceneOverlay } from "@/components/scene/overlay";
import type { SceneStorage } from "@/components/scene/types";
import { SceneOverlayLayer } from "./SceneOverlayLayer";
import { FridgeDoor } from "@/components/pantry/FridgeDoor";
import type { Pantry } from "@/lib/pantry/model";
import { useUiStore } from "@/lib/store/ui-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const StorageRoomScene = dynamic(
  () =>
    import("@/components/scene/StorageRoomScene").then(
      (sceneModule) => sceneModule.StorageRoomScene,
    ),
  { ssr: false },
);

const FRIDGE_DOOR_ZOOM = 2.6;
const FRIDGE_FRONT_OFFSET = 0.9;
const FRIDGE_DOOR_HEIGHT = 2.4;
const DOOR_HOLD_MILLISECONDS = 250;

const PAN_KEYS: Record<string, PanDirection> = {
  ArrowUpIcon: "up",
  ArrowDownIcon: "down",
  ArrowLeftIcon: "left",
  ArrowRightIcon: "right",
};

const PAN_BUTTONS: { direction: PanDirection; label: string; icon: Icon; area: string }[] = [
  { direction: "up", label: "Look up", icon: ArrowUpIcon, area: "col-start-2 row-start-1" },
  { direction: "left", label: "Look left", icon: ArrowLeftIcon, area: "col-start-1 row-start-2" },
  { direction: "right", label: "Look right", icon: ArrowRightIcon, area: "col-start-3 row-start-2" },
  { direction: "down", label: "Look down", icon: ArrowDownIcon, area: "col-start-2 row-start-3" },
];

const ControlButton = ({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`flex size-11 items-center justify-center rounded-sm text-foreground transition-[background-color,transform] duration-150 ease-out hover:bg-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 ${className}`}
  >
    {children}
  </button>
);

const frontOf = (storage: SceneStorage): CameraFocus => {
  const [x, , z] = storage.position;
  return {
    target: [
      x + Math.sin(storage.rotationY) * FRIDGE_FRONT_OFFSET,
      FRIDGE_DOOR_HEIGHT,
      z + Math.cos(storage.rotationY) * FRIDGE_FRONT_OFFSET,
    ],
    zoomFactor: FRIDGE_DOOR_ZOOM,
  };
};

type RoomViewProps = {
  pantry: Pantry | null;
  storages: readonly SceneStorage[];
  loading: boolean;
  error: { message: string; retry: () => void } | null;
  onSelectStorage: (locationId: number) => void;
};

export const RoomView = ({ pantry, storages, loading, error, onSelectStorage }: RoomViewProps) => {
  const cameraRef = useRef<CameraApi>(null);
  const [overlay] = useState(createSceneOverlay);
  const selection = useUiStore((state) => state.selection);
  const hoveredLocationId = useUiStore((state) => state.hoveredLocationId);
  const view = useUiStore((state) => state.view);
  const fridgeLocationId = useUiStore((state) => state.fridgeLocationId);
  const selectItem = useUiStore((state) => state.selectItem);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const setHoveredLocation = useUiStore((state) => state.setHoveredLocation);
  const showFridgeDoor = useUiStore((state) => state.showFridgeDoor);
  const closeFridgeDoor = useUiStore((state) => state.closeFridgeDoor);

  const fridgeStorage = storages.find((storage) => storage.locationId === fridgeLocationId);
  const fridgeLocation = pantry?.locations.find((location) => location.id === fridgeLocationId);
  const focus = useMemo(
    () => (view !== "room" && fridgeStorage ? frontOf(fridgeStorage) : null),
    [view, fridgeStorage],
  );
  const reducedMotion = useReducedMotion();
  // Lets the open fridge be seen for a moment before the 2D door fades in.
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleFocusSettled = useCallback(() => {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(
      showFridgeDoor,
      reducedMotion ? 0 : DOOR_HOLD_MILLISECONDS,
    );
  }, [reducedMotion, showFridgeDoor]);
  // Without a fridge piece to glide to, the door view shows straight away.
  const doorVisible =
    view === "fridgeDoor" || (view === "enteringDoor" && !fridgeStorage);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      const direction = PAN_KEYS[event.key];
      if (direction) {
        event.preventDefault();
        cameraRef.current?.panBy(direction);
      }
      if (event.key === "+" || event.key === "=") cameraRef.current?.zoomIn();
      if (event.key === "-") cameraRef.current?.zoomOut();
    },
    [],
  );

  const description = pantry
    ? `Storage room with ${storages.map((storage) => `${storage.tag.name} (${storage.tag.itemCount} items)`).join(", ")}. Use the arrow keys to look around.`
    : "Storage room";

  return (
    <section
      aria-label="3D storage room"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl border-[1.5px] border-border bg-[radial-gradient(120%_90%_at_50%_35%,var(--scene-sky-top)_0%,var(--scene-sky-mid)_60%,var(--scene-sky-edge)_100%)] shadow-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-[560px]"
    >
      <div className="absolute inset-0">
        <StorageRoomScene
          storages={storages}
          cameraRef={cameraRef}
          overlay={overlay}
          label={description}
          hoveredLocationId={hoveredLocationId}
          selectedLocationId={selection?.locationId ?? null}
          openDoorLocationId={view === "room" ? null : fridgeLocationId}
          focus={focus}
          onFocusSettled={handleFocusSettled}
          onHoverChange={setHoveredLocation}
          onSelectStorage={onSelectStorage}
          onSelectItem={selectItem}
          onBackgroundClick={clearSelection}
        />
      </div>
      <SceneOverlayLayer
        overlay={overlay}
        storages={storages}
        hoveredLocationId={hoveredLocationId}
        selectedLocationId={selection?.locationId ?? null}
        openDoorLocationId={view === "room" ? null : fridgeLocationId}
      />

      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1 rounded-lg border-[1.5px] border-border bg-card p-1.5 shadow-paper">
        <ControlButton label="Zoom in" onClick={() => cameraRef.current?.zoomIn()}>
          <MagnifyingGlassPlusIcon size={20} weight="duotone" />
        </ControlButton>
        <ControlButton label="Zoom out" onClick={() => cameraRef.current?.zoomOut()}>
          <MagnifyingGlassMinusIcon size={20} weight="duotone" />
        </ControlButton>
        <ControlButton label="Back to whole room" onClick={() => cameraRef.current?.reset()}>
          <HouseSimpleIcon size={20} weight="duotone" />
        </ControlButton>
      </div>

      <div className="absolute bottom-4 left-4 z-30 hidden grid-cols-3 grid-rows-3 rounded-lg border-[1.5px] border-border bg-card/90 p-1 shadow-paper sm:grid">
        {PAN_BUTTONS.map((button) => {
          const ButtonIcon = button.icon;
          return (
            <ControlButton
              key={button.direction}
              label={button.label}
              className={button.area}
              onClick={() => cameraRef.current?.panBy(button.direction)}
            >
              <ButtonIcon size={18} weight="bold" />
            </ControlButton>
          );
        })}
      </div>

      <Link
        href="/scan"
        transitionTypes={OPEN_SCAN}
        aria-label="Scan a barcode"
        className="absolute right-5 bottom-5 z-30 hidden h-15 items-center gap-2.5 rounded-full bg-terracotta pr-5.5 pl-4.5 text-base font-semibold text-accent-foreground shadow-[0_3px_0_#9A4F37,0_14px_28px_-10px_rgba(154,79,55,.7)] transition-transform duration-150 ease-out active:translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring lg:flex"
      >
        <BarcodeIcon size={24} weight="duotone" aria-hidden />
        Scan
      </Link>

      <p className="pointer-events-none absolute right-36 bottom-6 z-30 hidden rounded-full bg-card/80 px-3 py-1.5 text-[13px] text-muted-foreground xl:block">
        Drag to look around · scroll to zoom · tap storage to peek inside
      </p>

      <nav aria-label="Storage pieces" className="sr-only">
        <ul>
          {storages.map((storage) => (
            <li key={storage.locationId}>
              <button type="button" onClick={() => onSelectStorage(storage.locationId)}>
                Inspect {storage.tag.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <AnimatePresence>
        {doorVisible && fridgeLocation && (
          <motion.div
            key="fridge-door"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 z-40"
          >
            <FridgeDoor
              location={fridgeLocation}
              onPickItem={(productId, itemKey) =>
                selectItem(fridgeLocation.id, productId, itemKey)
              }
              onClose={closeFridgeDoor}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <p
          role="status"
          className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border-[1.5px] border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-paper animate-in fade-in duration-300"
        >
          Opening the storage room…
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="absolute bottom-5 left-1/2 z-30 flex w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-lg border-[1.5px] border-border bg-card px-4 py-3 shadow-paper animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:slide-in-from-bottom-0"
        >
          <p className="flex-1 text-sm">
            <span className="font-semibold">Couldn&apos;t reach the pantry.</span>{" "}
            <span className="text-muted-foreground">{error.message}</span>
          </p>
          <button
            type="button"
            onClick={error.retry}
            className="h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_2px_0_var(--sage-deep)] transition-transform duration-150 ease-out active:translate-y-px"
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
};
