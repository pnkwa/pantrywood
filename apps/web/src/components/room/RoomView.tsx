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
import { AnimatePresence, motion, type MotionProps } from "motion/react";
import {
  ArrowArcLeftIcon,
  ArrowDownIcon,
  BroomIcon,
  PackageIcon,
  BarcodeIcon,
  CubeIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  HouseSimpleIcon,
  type Icon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PaintBrushIcon,
  PushPinIcon,
  TrayIcon,
  ListBulletsIcon,
} from "@phosphor-icons/react";
import type { CameraApi, CameraFocus, PanDirection } from "@/components/scene/CameraRig";
import { createSceneOverlay, registerIn } from "@/components/scene/overlay";
import type { SceneDecor, SceneStorage } from "@/components/scene/types";
import { SceneOverlayLayer } from "./SceneOverlayLayer";
import { StorageListView } from "./StorageListView";
import { BuildTray } from "@/components/decorate/BuildTray";
import { ConfirmDialog } from "@/components/decorate/ConfirmDialog";
import { DecorateBar, PieceToolbar } from "@/components/decorate/DecorateControls";
import { catalogItem } from "@/data/catalog";
import { pieceInfo } from "@/lib/room/decorate";
import { tagRank } from "@/lib/room/declutter";
import { storageKindFor } from "@/lib/room/layout";
import { cellNear, wallCellNear, wallCenterY, worldCenter, type GridCell } from "@/lib/room/grid";
import { wallPose, type Room } from "@/lib/room/use-room";
import type { WallSide } from "@pantrywood/shared";
import type { useDecorate } from "@/lib/room/use-decorate";
import { BoardView } from "@/components/board/BoardView";
import { InsideView } from "@/components/inside/InsideView";
import type { GrocyPlace, Pantry } from "@/lib/pantry/model";
import { putAwayDestinations } from "@/components/pantry/ItemListPanel";
import { itemRows } from "@/lib/pantry/put-away";
import { useUiStore } from "@/lib/store/ui-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const StorageRoomScene = dynamic(
  () =>
    import("@/components/scene/StorageRoomScene").then(
      (sceneModule) => sceneModule.StorageRoomScene,
    ),
  { ssr: false },
);

const VIEW_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" },
} satisfies MotionProps;

const VIEW_OPTIONS: { label: string; short: string; list: boolean; icon: Icon }[] = [
  { label: "3D room", short: "3D", list: false, icon: CubeIcon },
  { label: "List", short: "List", list: true, icon: ListBulletsIcon },
];

const INSIDE_ZOOM = 2.6;
const FRONT_OFFSET = 0.9;
const FOCUS_HEIGHT = 2.4;
const DOOR_HOLD_MILLISECONDS = 250;
const LONG_PRESS_MILLISECONDS = 450;

const PAN_KEYS: Record<string, PanDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const NUDGE_KEYS: Record<string, GridCell> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/** A piece in hand: dragged, or following the pointer in Move mode, with the cell it would land on. */
type Carry = { key: string; cell: GridCell; dragging: boolean; wall: WallSide | null };

type Confirm = { kind: "putAway"; key: string } | { kind: "clear" };

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
    className={`flex size-11 items-center justify-center rounded-sm text-foreground transition-[background-color,transform] duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 ${className}`}
  >
    {children}
  </button>
);

const frontOf = (storage: SceneStorage): CameraFocus => {
  const [x, , z] = storage.position;
  return {
    target: [
      x + Math.sin(storage.rotationY) * FRONT_OFFSET,
      FOCUS_HEIGHT,
      z + Math.cos(storage.rotationY) * FRONT_OFFSET,
    ],
    zoomFactor: INSIDE_ZOOM,
  };
};

type RoomViewProps = {
  pantry: Pantry | null;
  storages: readonly SceneStorage[];
  loading: boolean;
  error: { message: string; retry: () => void } | null;
  onSelectStorage: (locationId: number) => void;
  room: Room;
  decorate: ReturnType<typeof useDecorate>;
};

const PutAwayChip = ({ count, className }: { count: number; className: string }) => (
  <button
    type="button"
    onClick={() => useUiStore.getState().openItemList()}
    className={`flex h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-honey bg-status-soon px-4 text-sm font-semibold text-status-soon-foreground shadow-paper transition-colors duration-150 ease-out hover:bg-status-soon/80 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
  >
    <TrayIcon size={18} weight="duotone" aria-hidden />
    <span className="tabular">{count} to put away</span>
  </button>
);

// The open piece first (and its freezer, for the fridge), so "Put in…" starts with "here".
const destinationsFrom = (pantry: Pantry, openLocationId: number) => {
  const destinations = putAwayDestinations(pantry);
  const here = (place: GrocyPlace) =>
    place.id === openLocationId ||
    (place.isFreezer && pantry.locations.find((location) => location.id === openLocationId)?.items.some((item) => item.locationId === place.id));
  return [...destinations.filter(here), ...destinations.filter((place) => !here(place))];
};

export const RoomView = ({ pantry, storages, loading, error, onSelectStorage, room, decorate }: RoomViewProps) => {
  const cameraRef = useRef<CameraApi>(null);
  const [overlay] = useState(createSceneOverlay);
  const selection = useUiStore((state) => state.selection);
  const hoveredLocationId = useUiStore((state) => state.hoveredLocationId);
  const view = useUiStore((state) => state.view);
  const insideLocationId = useUiStore((state) => state.insideLocationId);
  const selectItem = useUiStore((state) => state.selectItem);
  const clearSelection = useUiStore((state) => state.clearSelection);
  const setHoveredLocation = useUiStore((state) => state.setHoveredLocation);
  const showInside = useUiStore((state) => state.showInside);
  const closeInside = useUiStore((state) => state.closeInside);
  const listView = useUiStore((state) => state.listView);
  const decorating = useUiStore((state) => state.decorating);
  const decorPiece = useUiStore((state) => state.decorPiece);
  const moving = useUiStore((state) => state.moving);
  const setDecorating = useUiStore((state) => state.setDecorating);
  const selectDecorPiece = useUiStore((state) => state.selectDecorPiece);
  const setMoving = useUiStore((state) => state.setMoving);
  const setListView = useUiStore((state) => state.setListView);
  const boardOpen = useUiStore((state) => state.boardOpen);
  const openBoard = useUiStore((state) => state.openBoard);

  const openStorage = storages.find((storage) => storage.locationId === insideLocationId);
  const openLocation = pantry?.locations.find((location) => location.id === insideLocationId);
  const openKind =
    [...storages, ...room.storedAway].find((storage) => storage.locationId === insideLocationId)?.kind ??
    (openLocation ? storageKindFor(openLocation) : undefined);
  const focus = useMemo(
    () => (view !== "room" && openStorage ? frontOf(openStorage) : null),
    [view, openStorage],
  );
  const reducedMotion = useReducedMotion();
  // Lets the opened piece be seen for a moment before the inside view fades in.
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleFocusSettled = useCallback(() => {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(
      showInside,
      reducedMotion ? 0 : DOOR_HOLD_MILLISECONDS,
    );
  }, [reducedMotion, showInside]);
  // Without a 3D piece to glide to (list view, or put away), the inside view shows straight away.
  const insideVisible =
    view === "inside" || (view === "entering" && (!openStorage || listView));

  const piece = decorPiece ? pieceInfo(room.context, decorPiece) : undefined;
  const [trayHeight, setTrayHeight] = useState(0);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Decorate hotkeys work from the toolbar too: arrows nudge, R rotates, Delete puts away.
    // React bubbles keys out of portals too; the swap popover and confirm dialogs keep theirs.
    const fromPortal = !(event.target instanceof Node && event.currentTarget.contains(event.target));
    if (decorPiece && piece && !fromPortal) {
      const nudge = NUDGE_KEYS[event.key];
      if (nudge) {
        event.preventDefault();
        decorate.moveTo(decorPiece, [piece.cell[0] + nudge[0], piece.cell[1] + nudge[1]]);
        return;
      }
      if (event.key === "r" || event.key === "R") return decorate.rotate(decorPiece);
      if (event.key === "w" || event.key === "W") return decorate.switchWall(decorPiece);
      if (event.key === "Delete" || event.key === "Backspace") return requestPutAway(decorPiece);
    }
    if (event.target !== event.currentTarget) return;
    const direction = PAN_KEYS[event.key];
    if (direction) {
      event.preventDefault();
      cameraRef.current?.panBy(direction);
    }
    if (event.key === "+" || event.key === "=") cameraRef.current?.zoomIn();
    if (event.key === "-") cameraRef.current?.zoomOut();
  };

  const [carry, setCarry] = useState<Carry | null>(null);
  const activeCarry = carry && (carry.dragging || (moving && carry.key === decorPiece)) ? carry : null;
  const carried = activeCarry ? pieceInfo(room.context, activeCarry.key) : undefined;
  const carryWall = activeCarry?.wall ?? carried?.wall ?? null;
  const onWall = carryWall !== null;
  const carryRect =
    activeCarry && carried
      ? { x: activeCarry.cell[0], z: activeCarry.cell[1], width: carried.size[0], depth: carried.size[1] }
      : null;
  const carryMoved =
    carryRect !== null &&
    carried !== undefined &&
    (carryRect.x !== carried.cell[0] || carryRect.z !== carried.cell[1] || carryWall !== carried.wall);
  const [carryX, carryFloorZ] = carryRect ? worldCenter(carryRect) : [0, 0];
  // On the wall the second number is a height, not a depth into the room.
  const carryZ = carryRect && onWall ? wallCenterY(carryRect) : carryFloorZ;
  // No outline on the picked piece: the cells it stands on light up under it instead.
  const pickedRect =
    decorPiece && piece && decorate.canMove(decorPiece)
      ? { x: piece.cell[0], z: piece.cell[1], width: piece.size[0], depth: piece.size[1] }
      : null;
  const pickedFootprint =
    pickedRect && piece
      ? {
          ...pickedRect,
          x: worldCenter(pickedRect)[0],
          z: piece.wall ? wallCenterY(pickedRect) : worldCenter(pickedRect)[1],
          fits: true,
          wall: piece.wall,
          picked: true,
        }
      : null;
  const footprint =
    activeCarry && carryRect
      ? {
          ...carryRect,
          x: carryX,
          z: carryZ,
          fits: decorate.fits(activeCarry.key, activeCarry.cell, carryWall ?? undefined),
          wall: carryWall,
        }
      : pickedFootprint;
  const sceneStorages = storages.map(
    (storage): SceneStorage =>
      activeCarry?.key === `storage:${storage.locationId}` ? { ...storage, position: [carryX, 0, carryZ] } : storage,
  );
  const sceneDecor = room.decor.map(
    (decor): SceneDecor =>
      activeCarry?.key === decor.id
        ? {
            ...decor,
            ...(carryWall ? wallPose(carryWall, carryX, carryZ) : { position: [carryX, decor.position[1], carryZ] }),
          }
        : decor,
  );

  // Outside Decorate, holding a piece lifts it for a quick edit; the page layout stays as it is.
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The release that drops a piece also lands as a click on it; that click must not open the piece.
  const lastDropAt = useRef(0);
  const droppedJustNow = () => carry?.dragging === true || performance.now() - lastDropAt.current < 300;
  const cancelLongPress = () => clearTimeout(pressTimer.current);
  const handlePiecePointerDown = (key: string) => {
    const info = pieceInfo(room.context, key);
    if (!info || !decorate.canMove(key)) return;
    if (decorating) {
      // In Move mode only the moving piece can be dragged; a press elsewhere is a tap to place it.
      if (moving && key !== decorPiece) return;
      const keepCarry = moving && carry?.key === key;
      setCarry({ key, cell: keepCarry ? carry.cell : info.cell, wall: keepCarry ? carry.wall : info.wall, dragging: true });
      return;
    }
    cancelLongPress();
    pressTimer.current = setTimeout(() => {
      setCarry({ key, cell: info.cell, wall: info.wall, dragging: true });
    }, LONG_PRESS_MILLISECONDS);
  };
  const handleFloorPointerMove = (floorX: number, floorZ: number, wall: WallSide, wallAlong: number, wallY: number) => {
    const key = carry?.dragging ? carry.key : moving ? decorPiece : null;
    const info = key ? pieceInfo(room.context, key) : undefined;
    if (!key || !info) return;
    // A wall piece follows the pointer onto whichever wall it's over.
    const onWallNow = info.wall !== null;
    const cell = onWallNow ? wallCellNear(wallAlong, wallY, info.size) : cellNear(floorX, floorZ, info.size);
    const nextWall = onWallNow ? wall : null;
    if (carry?.key === key && carry.cell[0] === cell[0] && carry.cell[1] === cell[1] && carry.wall === nextWall) return;
    setCarry({ key, cell, wall: nextWall, dragging: carry?.key === key && carry.dragging });
  };
  const handleCarryEnd = (drop: boolean, tapped: boolean) => {
    cancelLongPress();
    if (!carry) return;
    if (carry.dragging) {
      setCarry(null);
      lastDropAt.current = performance.now();
      // A blocked spot shows a toast and the piece goes back where it was.
      // A release that barely moved is a hold, not a drag: the piece stays where it stood.
      const moved = drop && !tapped && carryMoved && decorate.moveTo(carry.key, carry.cell, carryWall ?? undefined);
      // Outside Decorate this is a quick edit: the piece stays picked with Rotate · Move · Put away.
      if (moved || !decorating) selectDecorPiece(carry.key);
      return;
    }
    // Move mode lands on the cell the footprint showed, wherever the tap hit (floor, wall or another piece).
    if (moving && decorPiece && activeCarry && drop && tapped) {
      if (!carryMoved || decorate.moveTo(decorPiece, activeCarry.cell, carryWall ?? undefined)) setMoving(false);
    }
  };
  const handleFloorClick = () => {
    if (!moving) selectDecorPiece(null);
  };

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const stash = (key: string) => {
    decorate.putAway(key);
    if (!decorating) useUiStore.getState().showToast("Put away. Place it again from Inventory in Decorate");
  };
  const requestPutAway = (key: string) => {
    if (key.startsWith("storage:")) setConfirm({ kind: "putAway", key });
    else stash(key);
  };
  const totalItems = [...storages, ...room.storedAway].reduce((total, storage) => total + storage.tag.itemCount, 0);
  const confirmStorage =
    confirm?.kind === "putAway" ? storages.find((storage) => `storage:${storage.locationId}` === confirm.key) : undefined;
  const pieceName = (() => {
    if (!decorPiece) return "";
    const item = catalogItem(piece?.itemId ?? null);
    if (item) return item.name;
    const locationId = Number(decorPiece.slice("storage:".length));
    return storages.find((storage) => storage.locationId === locationId)?.tag.name ?? "Piece";
  })();
  const pieceToolbar = decorPiece && piece && (
    <PieceToolbar
      key={decorPiece}
      name={pieceName}
      // Restyling needs the catalog, so it stays in Decorate.
      isStorage={decorating && decorPiece.startsWith("storage:")}
      swapOptions={decorating ? decorate.swapOptions(decorPiece) : []}
      currentItemId={piece.itemId}
      owned={room.context.layout.owned}
      canMove={decorate.canMove(decorPiece)}
      onWall={piece.wall !== null}
      moving={moving}
      onSwap={(itemId) => decorate.swap(decorPiece, itemId)}
      onRotate={() => decorate.rotate(decorPiece)}
      onSwitchWall={() => decorate.switchWall(decorPiece)}
      onToggleMove={() => setMoving(!moving)}
      onNudge={([deltaX, deltaZ]) => decorate.moveTo(decorPiece, [piece.cell[0] + deltaX, piece.cell[1] + deltaZ])}
      onPutAway={() => requestPutAway(decorPiece)}
      anchorRef={registerIn(overlay.anchors, "toolbar")}
    />
  );

  const description = pantry
    ? `Storage room with ${storages.map((storage) => `${storage.tag.name} (${storage.tag.itemCount} items)`).join(", ")}. Use the arrow keys to look around.`
    : "Storage room";

  return (
    <section
      aria-label={listView ? "Storage list" : "3D storage room"}
      tabIndex={listView ? undefined : 0}
      onKeyDown={listView ? undefined : handleKeyDown}
      className={`relative flex-1 overflow-hidden ${insideVisible ? "min-h-[calc(100dvh-200px)]" : "min-h-[420px]"} rounded-xl border-[1.5px] border-border bg-[radial-gradient(120%_90%_at_50%_35%,var(--scene-sky-top)_0%,var(--scene-sky-mid)_60%,var(--scene-sky-edge)_100%)] shadow-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-[480px]`}
    >
      <AnimatePresence initial={false}>
        {listView ? (
          <motion.div key="list" {...VIEW_FADE} className="absolute inset-0 z-20 bg-background/70">
            <StorageListView
              storages={[...storages, ...room.storedAway]}
              selectedLocationId={selection?.locationId ?? null}
              onSelectStorage={onSelectStorage}
            />
          </motion.div>
        ) : (
          <motion.div key="room" {...VIEW_FADE} className="absolute inset-0">
          <div className="absolute inset-0">
            <StorageRoomScene
              storages={sceneStorages}
              cameraRef={cameraRef}
              overlay={overlay}
              label={description}
              hoveredLocationId={hoveredLocationId}
              selectedLocationId={selection?.locationId ?? null}
              openDoorLocationId={view === "room" ? null : insideLocationId}
              focus={focus}
              onFocusSettled={handleFocusSettled}
              onHoverChange={setHoveredLocation}
              onSelectStorage={(locationId) => {
                if (droppedJustNow()) return;
                // A tap elsewhere ends a quick edit instead of opening another piece.
                if (decorPiece) {
                  if (!moving) selectDecorPiece(null);
                  return;
                }
                onSelectStorage(locationId);
              }}
              onSelectItem={(locationId, productId) => !droppedJustNow() && selectItem(locationId, productId)}
              onBackgroundClick={decorating || decorPiece ? () => !moving && selectDecorPiece(null) : clearSelection}
              wall={room.wall}
              floor={room.floor}
              decor={sceneDecor}
              editing={decorating}
              selectedPieceKey={decorPiece}
              onSelectPiece={(key) => !moving && selectDecorPiece(key)}
              onFloorClick={handleFloorClick}
              carrying={activeCarry?.dragging ?? false}
              bottomInset={decorating ? trayHeight : 0}
              footprint={footprint}
              onPiecePointerDown={handlePiecePointerDown}
              onFloorPointerMove={handleFloorPointerMove}
              onCarryEnd={handleCarryEnd}
              onPointerDrift={cancelLongPress}
              onOpenBoard={openBoard}
              carriedKey={activeCarry?.key ?? null}
              tagRanks={
                new Map(
                  storages.map((storage) => [
                    storage.locationId,
                    // The piece you're pointing at or have picked always keeps its full tag.
                    storage.locationId === hoveredLocationId || storage.locationId === selection?.locationId
                      ? Number.MAX_SAFE_INTEGER
                      : tagRank(storage.tag),
                  ]),
                )
              }
            />
          </div>
          <SceneOverlayLayer
            overlay={overlay}
            storages={storages}
            selectedLocationId={selection?.locationId ?? null}
            editing={decorating}
          />
          <div className={`absolute right-4 z-30 flex flex-col gap-1 rounded-lg border-[1.5px] border-border bg-card p-1.5 shadow-paper transition-[transform,opacity,visibility] duration-200 ease-out ${decorating ? "top-4 translate-y-16 max-lg:invisible max-lg:opacity-0" : "top-4"}`}>
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

          <div className={`absolute bottom-4 left-4 z-30 hidden grid-cols-3 grid-rows-3 rounded-lg border-[1.5px] border-border bg-card/90 p-1 shadow-paper transition-opacity duration-200 ease-out sm:grid ${decorating ? "invisible opacity-0" : ""}`}>
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
      {decorating ? (
        <motion.div key="decorate" {...VIEW_FADE}>
        <DecorateBar
          canUndo={decorate.canUndo}
          onUndo={decorate.undo}
          canClear={storages.length + room.decor.length > 0}
          onClear={() => setConfirm({ kind: "clear" })}
          onDone={() => setDecorating(false)}
        />
        </motion.div>
      ) : (
        <motion.div key="view" {...VIEW_FADE} className="absolute top-4 left-4 z-30 flex gap-2">
        <div
          role="radiogroup"
          aria-label="Room view"
          className="flex gap-1 rounded-full border-[1.5px] border-border bg-card p-1 shadow-paper max-lg:rounded-[18px]"
        >
          {VIEW_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            const selected = option.list === listView;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setListView(option.list)}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-full text-sm transition-colors max-lg:h-auto max-lg:min-h-12 max-lg:min-w-12 max-lg:flex-col max-lg:gap-0.5 max-lg:rounded-[14px] max-lg:px-2 max-lg:py-1 max-lg:text-[11px] lg:px-3.5 duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  selected ? "bg-sage-deep font-semibold text-primary-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                <OptionIcon size={18} weight="duotone" aria-hidden />
                <span className="lg:hidden">{option.short}</span>
                <span className="max-lg:hidden">{option.label}</span>
              </button>
            );
          })}
        </div>
          {pantry && pantry.waiting.length > 0 && <PutAwayChip count={pantry.waiting.length} className="max-lg:hidden" />}
          {!listView && (
            <button
              type="button"
              onClick={() => setDecorating(true)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-border bg-card text-sm font-semibold shadow-paper transition-colors duration-150 ease-out hover:bg-muted/40 max-lg:h-auto max-lg:min-h-12 max-lg:min-w-12 max-lg:flex-col max-lg:gap-0.5 max-lg:rounded-[14px] max-lg:px-2 max-lg:py-1 max-lg:text-[11px] lg:px-4"
            >
              <PaintBrushIcon size={18} weight="duotone" aria-hidden />
              <span>Decorate</span>
            </button>
          )}
          <button
            type="button"
            onClick={openBoard}
            className="flex h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-border bg-card text-sm font-semibold shadow-paper transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring max-lg:h-auto max-lg:min-h-12 max-lg:min-w-12 max-lg:flex-col max-lg:gap-0.5 max-lg:rounded-[14px] max-lg:px-2 max-lg:py-1 max-lg:text-[11px] lg:px-4"
          >
            <PushPinIcon size={18} weight="duotone" aria-hidden />
            <span className="lg:hidden">Board</span>
            <span className="max-lg:hidden">Open board</span>
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {pieceToolbar && (
          <motion.div key={decorPiece} {...VIEW_FADE}>
            {pieceToolbar}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {decorating && (
          <BuildTray
            key="build-tray"
            room={room.context}
            decorate={decorate}
            selectedPieceKey={decorPiece}
            storages={storages}
            storedAway={room.storedAway}
            onHeightChange={setTrayHeight}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirm?.kind === "putAway"}
        title={`Put away the ${confirmStorage?.tag.name ?? "storage"}?`}
        confirmLabel="Put it away"
        onConfirm={() => confirm?.kind === "putAway" && stash(confirm.key)}
        onClose={() => setConfirm(null)}
      >
        <p>
          It leaves the room, but it&apos;s still a Grocy location: its {confirmStorage?.tag.itemCount ?? 0} items stay in
          your item list and search, just not on show here.
        </p>
        <p>To see them in the room again, tap Put back on it in the catalog&apos;s My things.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm?.kind === "clear"}
        title="Start with an empty room?"
        confirmLabel="Empty the room"
        onConfirm={decorate.clearRoom}
        onClose={() => setConfirm(null)}
      >
        <ul className="flex flex-col gap-2.5">
          {[
            {
              icon: BroomIcon,
              text: `${storages.length} storage ${storages.length === 1 ? "piece" : "pieces"} and ${room.decor.length} ${
                room.decor.length === 1 ? "decoration" : "decorations"
              } leave the room, the window, clock and cat included. Wallpaper and floor stay.`,
            },
            {
              icon: PackageIcon,
              text: "Everything waits in your Inventory, still yours and free to place again.",
            },
            { icon: ListBulletsIcon, text: `Grocy doesn't change: all ${totalItems} items stay in your list and search.` },
            { icon: ArrowArcLeftIcon, text: "Changed your mind? Undo brings everything back." },
          ].map((line) => {
            const LineIcon = line.icon;
            return (
              <li key={line.text} className="flex gap-2.5">
                <LineIcon size={18} weight="duotone" aria-hidden className="mt-px shrink-0 text-foreground" />
                <span>{line.text}</span>
              </li>
            );
          })}
        </ul>
      </ConfirmDialog>

      <Link
        href="/scan"
        transitionTypes={OPEN_SCAN}
        aria-label="Scan a barcode"
        className={`absolute right-5 bottom-5 z-30 hidden h-15 items-center gap-2.5 rounded-full bg-terracotta transition-[transform,background-color,opacity] ${decorating ? "invisible opacity-0" : ""} pr-5.5 pl-4.5 text-base font-semibold text-accent-foreground shadow-[0_3px_0_#9A4F37,0_14px_28px_-10px_rgba(154,79,55,.7)] transition-[transform,background-color] duration-150 ease-out hover:bg-terracotta/85 active:translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring lg:flex`}
      >
        <BarcodeIcon size={24} weight="duotone" aria-hidden />
        Scan
      </Link>

      {!listView && !decorating && (
      <p className="pointer-events-none absolute right-36 bottom-6 z-30 hidden rounded-full bg-card/80 px-3 py-1.5 text-[13px] text-muted-foreground xl:block">
        Drag to look around · scroll to zoom · tap storage to peek inside · hold a piece to edit it
      </p>
      )}

      {!listView && (
      <nav aria-label="Storage pieces" className="sr-only">
        <ul>
          {storages.map((storage) => (
            <li key={storage.locationId}>
              <button
                type="button"
                onClick={() =>
                  decorating ? selectDecorPiece(`storage:${storage.locationId}`) : onSelectStorage(storage.locationId)
                }
              >
                {decorating ? "Decorate" : "Inspect"} {storage.tag.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      )}

      <AnimatePresence>
        {boardOpen && (
          <motion.div
            key="board"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 z-40 bg-[radial-gradient(120%_90%_at_50%_35%,var(--scene-sky-top)_0%,var(--scene-sky-edge)_100%)]"
          >
            <BoardView />
          </motion.div>
        )}
        {insideVisible && openLocation && openKind && (
          <motion.div
            key={`inside-${openLocation.id}`}
            // Grows into place as the camera arrives, so opening a piece reads as one zoom; a fade with reduced motion.
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.92 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 z-40 bg-gingham"
          >
            <InsideView
              location={openLocation}
              kind={openKind}
              palette={[...storages, ...room.storedAway].find((storage) => storage.locationId === insideLocationId)?.palette ?? null}
              selectedItemKey={selection?.type === "item" ? (selection.itemKey ?? `${selection.locationId}-${selection.productId}`) : null}
              onPickItem={(productId, itemKey) => selectItem(openLocation.id, productId, itemKey)}
              onClose={closeInside}
              waiting={pantry?.waiting ?? []}
              elsewhere={pantry ? itemRows([], pantry.locations.filter((location) => location.id !== openLocation.id)) : []}
              destinations={pantry ? destinationsFrom(pantry, openLocation.id) : []}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phones have no room for it in the top row, so it waits at the bottom of the room instead. */}
      {pantry && pantry.waiting.length > 0 && !decorating && view === "room" && (
        <PutAwayChip count={pantry.waiting.length} className="absolute bottom-4 left-4 z-30 lg:hidden" />
      )}

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
            className="h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_2px_0_var(--sage-deep)] transition-[transform,background-color] duration-150 ease-out hover:bg-primary/85 active:translate-y-px"
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
};
