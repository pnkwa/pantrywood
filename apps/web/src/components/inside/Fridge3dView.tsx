"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { registerIn } from "@/components/scene/overlay";
import { Canvas, useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { MathUtils, Raycaster, Vector2, Vector3, type Group, type Mesh } from "three";
import { ArrowArcLeftIcon, ArrowArcRightIcon, ArrowCounterClockwiseIcon, ArrowClockwiseIcon, ArrowsDownUpIcon, MinusIcon, PlusIcon, TrayIcon } from "@phosphor-icons/react";
import { ItemModelMeshes } from "@/components/scene/items/ItemModelMeshes";
import { groupWidth, ITEM_SIZES } from "@/components/scene/items/sizes";
import { DOOR_OPEN_ANGLE, OpenFridge } from "@/components/scene/storage/OpenFridge";
import { HINGE_X, SEAM_Z, WIDTH } from "@/components/scene/storage/Fridge";
import { fridgeSurfaces, pickHeightFor, type FridgeSurface } from "@/lib/inside/fridge-surfaces";
import { pickScene, setScenePicker, type ScenePick } from "@/lib/inside/scene-pick";
import { BACK, FRONT, MAX_SIZE, MIN_SIZE, SIZE_STEP, type ShelfSpot } from "@/lib/inside/shelf-place";
import type { PantryItem } from "@/lib/pantry/model";
import { sceneItemFor } from "@/lib/room/items";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { FrontView, type FrontViewProps } from "./FrontView";
import { describeItem } from "./InsideItem";

// Nearly face-on, like looking into a real open fridge: 18° to the front-right and 14° down. The view turns ±35°.
const AZIMUTH = MathUtils.degToRad(18);
const POLAR = MathUtils.degToRad(76);
const TURN_RANGE = MathUtils.degToRad(35);
const VIEW_TURN_STEP = MathUtils.degToRad(15);
const CAMERA_DISTANCE = 30;
// Scene units the whole open fridge (door included) needs on screen.
const FRIDGE_SPAN = { width: 4.9, height: 5.2 };
const DRAG_START_PIXELS = 6;
const LIFT = 0.12;
/** How far behind the front row the back row stands. */
const ROW_DEPTH = 0.5;
const depthOf = (row: number | undefined) => (row ?? FRONT) * ROW_DEPTH;
// The camera looks in nearly level, so a shelf's depth is a thin strip on screen: the upper part of the space over
// a shelf picks its back row (where back items show, peeking over the front ones), the lower part its front row.
const BACK_ROW_FROM = 0.17;

/** Where the open door's middle is, in the fridge's space: its bins are framed around it. */
const DOOR_CENTER: [number, number, number] = [
  HINGE_X + Math.cos(DOOR_OPEN_ANGLE) * (WIDTH / 2),
  2.35,
  SEAM_Z - Math.sin(DOOR_OPEN_ANGLE) * (WIDTH / 2),
];

/** What each tab looks at, and how far in from the whole fridge. */
const FRAMING: Record<string, { target: [number, number, number]; zoom: number }> = {
  main: { target: [-0.8, 2.35, 0.3], zoom: 1 },
  freezer: { target: [0, 3.85, 0], zoom: 2 },
  door: { target: DOOR_CENTER, zoom: 1.5 },
};

/**
 * Less fill and a stronger key than the room's lights, shining in from the front-left past the open door, so items
 * get real shading and drop shadows on the shelves instead of fading into the cream and frost inside. The shadows
 * are blurred variance maps (the canvas's `shadows="variance"`): soft, diffused edges like light through a window.
 */
const FridgeLights = () => (
  <>
    <hemisphereLight args={["#FFF3DE", "#B89A74", 1.45]} />
    <ambientLight intensity={0.25} color="#FFF8EC" />
    <directionalLight
      position={[-5, 10, 12]}
      intensity={3.3}
      color="#FFE9C9"
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-radius={12}
      shadow-blurSamples={24}
      shadow-camera-left={-6}
      shadow-camera-right={6}
      shadow-camera-top={8}
      shadow-camera-bottom={-2}
      shadow-camera-near={1}
      shadow-camera-far={40}
      shadow-bias={-0.0006}
      shadow-normalBias={0.02}
    />
  </>
);

type DropBox = { mesh: Mesh; surface: FridgeSurface; height: number };

/**
 * `pick` is the last allowed spot the pointer was over: over a gap it stays put, so what you see is where it lands.
 * `tray` is the Item tray under the pointer: let go there and it comes off its shelf.
 */
type Drag = { key: string; startX: number; startY: number; moved: boolean; pick: ScenePick | null; tray: HTMLElement | null };

/** The right-side panel under a point on the page, if any: dropping there puts an item back in the Item tray. */
const trayAt = (clientX: number, clientY: number) =>
  document.elementsFromPoint(clientX, clientY).map((element) => element.closest<HTMLElement>("[data-tray-drop]")).find((element) => element !== null) ?? null;

/** A spring's pull and how quickly it calms down (1 = no overshoot, lower = bouncier). */
type Spring = { stiffness: number; damping: number };
// Only the item you're handling bounces; the ones making room for it glide aside without overshooting.
const ACTIVE_SPRING: Spring = { stiffness: 240, damping: 0.42 };
const CALM_SPRING: Spring = { stiffness: 240, damping: 1 };
const CARRY_SPRING: Spring = { stiffness: 520, damping: 0.55 };
/** How hard an item hops when you pick it, and how much of its fall it keeps when it bounces off the shelf. */
const HOP_SPEED = 1.7;
const SHELF_BOUNCE = 0.35;
const SPRING_STEP = 1 / 120;

type GlideProps = Omit<ThreeElements["group"], "position" | "ref"> & {
  target: [number, number, number];
  /** How far above (or below) its target it starts: a dropped item falls into place, a lifted one springs up. */
  dropFrom?: number;
  spring?: Spring;
  /** It stands on a shelf: it bounces off it instead of sinking through when it lands. */
  standing?: boolean;
  /** Hops once each time this turns true (when you pick it). */
  hop?: boolean;
  instant: boolean;
  groupRef?: (group: Group) => (() => void) | void;
};

/** A group that springs to its target instead of jumping, so neighbours slide aside with a little overshoot and drops bounce. */
const Glide = ({ target, dropFrom = 0, spring = CALM_SPRING, standing = false, hop = false, instant, groupRef, children, ...props }: GlideProps) => {
  const [x, y, z] = target;
  const group = useRef<Group | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  const [start] = useState<[number, number, number]>(() => [x, y + (instant ? 0 : dropFrom), z]);
  // Working state for the spring, changed every frame outside React.
  const motion = useRef({ goal: new Vector3(), velocity: new Vector3(), pull: new Vector3() });
  useEffect(() => invalidate(), [invalidate, x, y, z]);
  useEffect(() => {
    if (!hop || instant) return;
    motion.current.velocity.y = HOP_SPEED;
    invalidate();
  }, [hop, instant, invalidate]);
  useFrame((_, delta) => {
    const current = group.current;
    if (!current) return;
    const { goal, velocity, pull } = motion.current;
    goal.set(x, y, z);
    const resting = current.position.distanceToSquared(goal) < 1e-7 && velocity.lengthSq() < 1e-6;
    if (instant || resting) {
      current.position.copy(goal);
      velocity.set(0, 0, 0);
      return;
    }
    const friction = 2 * spring.damping * Math.sqrt(spring.stiffness);
    // Small fixed steps keep a stiff spring steady when a frame runs long.
    for (let left = Math.min(delta, 0.1); left > 0; left -= SPRING_STEP) {
      const step = Math.min(left, SPRING_STEP);
      pull.subVectors(goal, current.position).multiplyScalar(spring.stiffness).addScaledVector(velocity, -friction);
      velocity.addScaledVector(pull, step);
      current.position.addScaledVector(velocity, step);
      if (standing && current.position.y < goal.y && velocity.y < 0) {
        current.position.y = goal.y;
        velocity.y *= -SHELF_BOUNCE;
      }
    }
    invalidate();
  });
  return (
    <group
      {...props}
      position={start}
      ref={(node) => {
        group.current = node;
        return node ? groupRef?.(node) : undefined;
      }}
    >
      {children}
    </group>
  );
};

/**
 * The view's camera controls, listening on the same element as the scene's pointer events (and after them), so
 * pressing an item can switch turning off before the camera starts to move.
 */
const Controls = ({ controls, reducedMotion }: { controls: RefObject<CameraControls | null>; reducedMotion: boolean }) => {
  const target = useThree((state) => state.events.connected);
  return (
    <CameraControls
      ref={controls}
      makeDefault
      domElement={target instanceof HTMLElement ? target : undefined}
      minAzimuthAngle={AZIMUTH - TURN_RANGE}
      maxAzimuthAngle={AZIMUTH + TURN_RANGE}
      minPolarAngle={POLAR - MathUtils.degToRad(20)}
      maxPolarAngle={POLAR + MathUtils.degToRad(6)}
      minZoom={30}
      maxZoom={600}
      smoothTime={reducedMotion ? 0 : 0.25}
    />
  );
};

/** Keeps the camera on the tab's part of the fridge; moves glide unless motion is reduced. */
const Rig = ({ controls, tabId, reducedMotion }: { controls: RefObject<CameraControls | null>; tabId: string; reducedMotion: boolean }) => {
  const size = useThree((state) => state.size);
  useEffect(() => {
    const camera = controls.current;
    if (!camera) return;
    const framing = FRAMING[tabId] ?? FRAMING.main;
    if (!framing) return;
    const [x, y, z] = framing.target;
    const fit = Math.min(size.width / FRIDGE_SPAN.width, size.height / FRIDGE_SPAN.height);
    void camera.moveTo(x, y, z, !reducedMotion);
    void camera.zoomTo(fit * framing.zoom, !reducedMotion);
  }, [controls, tabId, size.width, size.height, reducedMotion]);
  return null;
};

/** Lets page drags (the tray) and the scene's own drags ask which shelf is under a point, by raycasting the drop boxes. */
const PickerBridge = ({ dropBoxes }: { dropBoxes: Map<string, DropBox> }) => {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    setScenePicker((clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const boxes = [...dropBoxes.values()];
      const [hit] = raycaster.intersectObjects(boxes.map((box) => box.mesh), false);
      const box = boxes.find((candidate) => candidate.mesh === hit?.object);
      if (!hit || !box) return null;
      const local = box.mesh.worldToLocal(hit.point.clone());
      const back = box.surface.rows > 1 && local.y + box.height / 2 > Math.min(BACK_ROW_FROM, box.height / 2);
      return { sectionId: box.surface.sectionId, x: Math.min(1, Math.max(0, 0.5 + local.x / box.surface.width)), row: back ? BACK : FRONT };
    });
    return () => setScenePicker(null);
  }, [camera, canvas, dropBoxes]);
  return null;
};

/** Places page elements (the selected item's controls) over their items, every frame the scene draws. */
const ScreenTags = ({ objects, tags }: { objects: Map<string, Group>; tags: Map<string, HTMLElement> }) => {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const point = new Vector3();
  const scale = new Vector3();
  useFrame(() => {
    for (const key of tags.keys()) {
      const element = tags.get(key);
      if (!element) continue;
      const object = objects.get(key.replace(/^[a-z]+:/, ""));
      if (!object) continue;
      // Over the item's top (its height, in world units, is kept on the group), plus the tag's own gap.
      const top = Number(object.userData.height ?? 0) * object.getWorldScale(scale).y + Number(element.dataset.lift ?? 0);
      object.getWorldPosition(point).add(new Vector3(0, top, 0)).project(camera);
      element.style.transform = `translate(${((point.x + 1) / 2) * size.width}px, ${((1 - point.y) / 2) * size.height}px) translate(-50%, -100%)`;
    }
  });
  return null;
};

type SectionItemsProps = {
  surface: FridgeSurface;
  /** How tall its invisible drop box is: up to the shelf above, so shelves never share one. */
  pickHeight: number;
  spots: readonly ShelfSpot[];
  itemsByKey: ReadonlyMap<string, PantryItem>;
  widthOf: (key: string) => number;
  turnOf: (key: string) => number;
  /** The spot shown as a landing outline (honey when the shelf is full), and the lifted item standing in it. */
  ghostKey: string | null;
  full: boolean;
  selectedKey: string | null;
  droppedKey: string | null;
  instant: boolean;
  objects: Map<string, Group>;
  dropBoxes: Map<string, DropBox>;
  onItemPointerDown: (key: string, clientX: number, clientY: number) => void;
};

/** One shelf's (or crisper's, or door bin's) items standing at their spots, plus its invisible drop box. */
const SectionItems = ({ surface, pickHeight, spots, itemsByKey, widthOf, turnOf, ghostKey, full, selectedKey, droppedKey, instant, objects, dropBoxes, onItemPointerDown }: SectionItemsProps) => (
  <group>
    <mesh
      ref={(mesh) => {
        if (!mesh) return;
        dropBoxes.set(surface.sectionId, { mesh, surface, height: pickHeight });
        return () => {
          dropBoxes.delete(surface.sectionId);
        };
      }}
      position={[surface.x + surface.width / 2, surface.y + pickHeight / 2, surface.z - 0.3]}
    >
      <boxGeometry args={[surface.width + 0.1, pickHeight, 0.9]} />
      <meshBasicMaterial colorWrite={false} depthWrite={false} />
    </mesh>
    {spots.map((spot) => {
      const width = widthOf(spot.key) * surface.width;
      const x = surface.x + spot.x * surface.width;
      if (spot.key === ghostKey) {
        return (
          <mesh key={spot.key} position={[x, surface.y + 0.006, surface.z - 0.1 - depthOf(spot.row)]}>
            <boxGeometry args={[width, 0.012, 0.3]} />
            <meshBasicMaterial color={full ? "#C8901F" : "#6F8A5E"} transparent opacity={0.45} depthWrite={false} />
          </mesh>
        );
      }
      const item = itemsByKey.get(spot.key);
      if (!item) return null;
      const model = sceneItemFor(item);
      const scale = width / groupWidth(model.shape, model.copies);
      return (
        <Glide
          key={spot.key}
          groupRef={(group) => {
            objects.set(spot.key, group);
            return () => {
              if (objects.get(spot.key) === group) objects.delete(spot.key);
            };
          }}
          target={[x, surface.y, surface.z - depthOf(spot.row)]}
          dropFrom={spot.key === droppedKey ? LIFT * 2 : 0}
          spring={spot.key === selectedKey || spot.key === droppedKey ? ACTIVE_SPRING : CALM_SPRING}
          standing
          hop={selectedKey === spot.key}
          instant={instant}
          rotation={[0, MathUtils.degToRad(turnOf(spot.key)), 0]}
          scale={scale}
          userData={{ height: ITEM_SIZES[model.shape].height }}
          onPointerDown={(event) => {
            event.stopPropagation();
            onItemPointerDown(spot.key, event.nativeEvent.clientX, event.nativeEvent.clientY);
          }}
        >
          <ItemModelMeshes model={model} outlined={selectedKey === spot.key} />
        </Glide>
      );
    })}
  </group>
);

/** The item being carried, lifted and following the pointer along the shelf; the landing outline shows where it goes. */
const CarriedItem = ({ item, surface, x, row, width, turn, instant }: { item: PantryItem; surface: FridgeSurface; x: number; row?: number; width: number; turn: number; instant: boolean }) => {
  const model = sceneItemFor(item);
  const scale = (width * surface.width) / groupWidth(model.shape, model.copies);
  return (
    <Glide
      target={[surface.x + x * surface.width, surface.y + LIFT, surface.z - depthOf(row)]}
      dropFrom={-LIFT}
      spring={CARRY_SPRING}
      instant={instant}
      rotation={[0, MathUtils.degToRad(turn), 0]}
      scale={scale * 1.06}
      raycast={() => null}
    >
      <ItemModelMeshes model={model} outlined />
    </Glide>
  );
};

const roundButton =
  "flex size-11 items-center justify-center rounded-full transition-colors duration-150 ease-out hover:bg-muted disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-ring";

const FridgeScene = (props: FrontViewProps) => {
  const { inside, tab, spotsFor, ghostKey, ghostItem, fullSectionId, targetSectionId, selectedItemKey, onPickItem, palette } = props;
  const reducedMotion = useReducedMotion();
  const controls = useRef<CameraControls | null>(null);
  // Filled by the scene and the page as things mount; the scene writes the page's tag positions each frame.
  const [objects] = useState(() => new Map<string, Group>());
  const [tags] = useState(() => new Map<string, HTMLElement>());
  const [dropBoxes] = useState(() => new Map<string, DropBox>());
  // The drag lives in a ref for the window listeners and is copied to state to draw it.
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [droppedKey, setDroppedKey] = useState<string | null>(null);
  const updateDrag = (next: Drag | null) => {
    // The tray lives in another part of the page, so it's lit up directly rather than through React.
    const previousTray = dragRef.current?.tray;
    if (previousTray && previousTray !== next?.tray) delete previousTray.dataset.dropOver;
    if (next?.tray) next.tray.dataset.dropOver = "";
    dragRef.current = next;
    setDrag(next);
  };
  const toTray = inside.unplace;
  const surfaces = fridgeSurfaces(inside.layout.sections);
  const carried = drag?.moved ? drag : null;
  const carriedItem = carried ? inside.itemsByKey.get(carried.key) : undefined;
  const allowedFor = (item: PantryItem | undefined) => new Set(item ? inside.destinationsFor(item).map((destination) => destination.id) : []);

  // The spots each section shows: today's, or, while something is carried over it, with the neighbours slid aside.
  const shownSpots = (sectionId: string) => {
    if (!carried) return spotsFor(sectionId);
    const others = spotsFor(sectionId).filter((spot) => spot.key !== carried.key);
    if (carried.pick?.sectionId !== sectionId) return others;
    return inside.previewAt(carried.key, sectionId, carried.pick.x, undefined, carried.pick.row) ?? others;
  };
  const carriedFull = Boolean(carried?.pick && !inside.previewAt(carried.key, carried.pick.sectionId, carried.pick.x, undefined, carried.pick.row));

  const handleItemPointerDown = (key: string, clientX: number, clientY: number) => {
    // Synchronously, so the camera doesn't start turning under the item.
    if (controls.current) controls.current.enabled = false;
    setDroppedKey(null);
    updateDrag({ key, startX: clientX, startY: clientY, moved: false, pick: null, tray: null });
    const handleMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_START_PIXELS;
      if (!moved) return;
      const tray = trayAt(event.clientX, event.clientY);
      const pick = tray ? null : (pickAllowed(current.key, event.clientX, event.clientY) ?? current.pick);
      updateDrag({ ...current, moved, pick, tray });
    };
    const stop = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", stop);
      updateDrag(null);
      if (controls.current) controls.current.enabled = true;
    };
    const handleUp = () => {
      const current = dragRef.current;
      stop();
      if (!current) return;
      if (current.moved && current.tray) {
        toTray(current.key);
        return;
      }
      if (current.moved) setDroppedKey(current.key);
      const placed = current.moved && current.pick && inside.placeAt(current.key, current.pick.sectionId, current.pick.x, undefined, current.pick.row);
      const item = inside.itemsByKey.get(current.key);
      // A tap picks it; so does a drop, so the item you just moved is the one the panel shows.
      if (item && (!current.moved || placed)) onPickItem(item.productId, current.key);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", stop);
  };

  const pickAllowed = (key: string, clientX: number, clientY: number): ScenePick | null => {
    const pick = pickScene(clientX, clientY);
    return pick && allowedFor(inside.itemsByKey.get(key)).has(pick.sectionId) ? pick : null;
  };

  const sectionItems = (surface: FridgeSurface) => {
    const carriedHere = carried?.pick?.sectionId === surface.sectionId;
    return (
      <SectionItems
        key={surface.sectionId}
        surface={surface}
        pickHeight={pickHeightFor(surfaces, surface)}
        spots={shownSpots(surface.sectionId)}
        itemsByKey={inside.itemsByKey}
        widthOf={inside.widthsOn(surface.sectionId)}
        turnOf={inside.turnOf}
        ghostKey={carriedHere ? (carried?.key ?? null) : targetSectionId === surface.sectionId ? ghostKey : null}
        full={carriedHere ? carriedFull : fullSectionId === surface.sectionId}
        selectedKey={selectedItemKey}
        droppedKey={droppedKey}
        instant={reducedMotion}
        objects={objects}
        dropBoxes={dropBoxes}
        onItemPointerDown={handleItemPointerDown}
      />
    );
  };
  const carriedSurface = carried?.pick ? surfaces.find((surface) => surface.sectionId === carried.pick?.sectionId) : undefined;
  const carriedModel =
    carriedItem && carriedSurface && carried?.pick && !carried.tray ? (
      <CarriedItem
        item={carriedItem}
        surface={carriedSurface}
        x={carried.pick.x}
        row={carried.pick.row}
        width={inside.widthsOn(carriedSurface.sectionId)(carriedItem.key)}
        turn={inside.turnOf(carriedItem.key)}
        instant={reducedMotion}
      />
    ) : null;
  // Something dragged in from the Item tray: its 3D model, lifted over the spot it would land on.
  const incomingSurface = !carried && ghostKey && ghostItem ? surfaces.find((surface) => surface.sectionId === targetSectionId) : undefined;
  const incomingSpot = incomingSurface ? spotsFor(incomingSurface.sectionId).find((spot) => spot.key === ghostKey) : undefined;
  const incomingModel =
    incomingSurface && incomingSpot && ghostKey && ghostItem ? (
      <CarriedItem
        item={ghostItem}
        surface={incomingSurface}
        x={incomingSpot.x}
        row={incomingSpot.row}
        width={inside.widthsOn(incomingSurface.sectionId, { key: ghostKey, item: ghostItem })(ghostKey)}
        turn={0}
        instant={reducedMotion}
      />
    ) : null;
  const inDoor = (carriedSurface ?? incomingSurface)?.part === "door";

  const selected = selectedItemKey ? inside.itemsByKey.get(selectedItemKey) : undefined;
  const selectedSpot = selectedItemKey ? spotsFor(inside.sectionOf(selectedItemKey)).find((spot) => spot.key === selectedItemKey) : undefined;
  const selectedDeep = (surfaces.find((surface) => surface.sectionId === inside.sectionOf(selectedItemKey ?? ""))?.rows ?? 1) > 1;
  const turnView = (direction: 1 | -1) => void controls.current?.rotate(direction * VIEW_TURN_STEP, 0, !reducedMotion);

  return (
    <div className="relative min-h-0 flex-1 touch-none overflow-hidden">
      <Canvas
        orthographic
        shadows="variance"
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{
          position: [
            Math.sin(POLAR) * Math.sin(AZIMUTH) * CAMERA_DISTANCE,
            Math.cos(POLAR) * CAMERA_DISTANCE,
            Math.sin(POLAR) * Math.cos(AZIMUTH) * CAMERA_DISTANCE,
          ],
          near: 0.1,
          far: 200,
          zoom: 80,
        }}
      >
        <FridgeLights />
        <Controls controls={controls} reducedMotion={reducedMotion} />
        <Rig controls={controls} tabId={tab.id} reducedMotion={reducedMotion} />
        <PickerBridge dropBoxes={dropBoxes} />
        <ScreenTags objects={objects} tags={tags} />
        <OpenFridge
          palette={palette ?? undefined}
          surfaces={surfaces}
          cavity={
            <>
              {surfaces.filter((surface) => surface.part !== "door").map(sectionItems)}
              {!inDoor && (carriedModel ?? incomingModel)}
            </>
          }
          door={
            <>
              {surfaces.filter((surface) => surface.part === "door").map(sectionItems)}
              {inDoor && (carriedModel ?? incomingModel)}
            </>
          }
        />
      </Canvas>

      {selected && selectedItemKey && selectedSpot && !carried && (
        <div
          ref={registerIn(tags, `selected:${selectedItemKey}`)}
          data-lift={0.12}
          role="group"
          aria-label={`${selected.name}: size and turn`}
          className="absolute top-0 left-0 z-10 flex items-center rounded-full border-[1.5px] border-border bg-card p-0.5 whitespace-nowrap shadow-paper"
        >
          <button type="button" aria-label="Smaller" disabled={inside.sizeOf(selectedItemKey) <= MIN_SIZE} onClick={() => inside.resize(selectedItemKey, inside.sizeOf(selectedItemKey) - SIZE_STEP)} className={roundButton}>
            <MinusIcon size={14} weight="bold" aria-hidden />
          </button>
          <span className="tabular w-11 text-center text-xs font-semibold">{Math.round(inside.sizeOf(selectedItemKey) * 100)}%</span>
          <button type="button" aria-label="Bigger" disabled={inside.sizeOf(selectedItemKey) >= MAX_SIZE} onClick={() => inside.resize(selectedItemKey, inside.sizeOf(selectedItemKey) + SIZE_STEP)} className={roundButton}>
            <PlusIcon size={14} weight="bold" aria-hidden />
          </button>
          <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
          <button type="button" aria-label={`Turn ${selected.name} left`} onClick={() => inside.turn(selectedItemKey, "left")} className={roundButton}>
            <ArrowCounterClockwiseIcon size={16} weight="bold" aria-hidden />
          </button>
          <button type="button" aria-label={`Turn ${selected.name} right`} onClick={() => inside.turn(selectedItemKey, "right")} className={roundButton}>
            <ArrowClockwiseIcon size={16} weight="bold" aria-hidden />
          </button>
          <button type="button" aria-label={`Put ${selected.name} back in the Item tray`} onClick={() => toTray(selectedItemKey)} className={roundButton}>
            <TrayIcon size={16} weight="bold" aria-hidden />
          </button>
          {selectedDeep && (
            <>
              <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
              <button
                type="button"
                onClick={() => inside.switchRow(selectedItemKey)}
                className="flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-3 focus-visible:outline-ring"
              >
                <ArrowsDownUpIcon size={16} weight="bold" aria-hidden />
                {selectedSpot?.row === BACK ? "To front" : "To back"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="absolute right-3 bottom-3 flex items-center rounded-full border-[1.5px] border-border bg-card/90 p-0.5 shadow-paper">
        <button type="button" aria-label="Turn the view left" onClick={() => turnView(-1)} className={roundButton}>
          <ArrowArcLeftIcon size={18} weight="bold" aria-hidden />
        </button>
        <button type="button" aria-label="Turn the view right" onClick={() => turnView(1)} className={roundButton}>
          <ArrowArcRightIcon size={18} weight="bold" aria-hidden />
        </button>
      </div>

      {/* The same items for keyboards and screen readers: pick one, then use its panel to move it. */}
      <ul className="sr-only">
        {surfaces.flatMap((surface) =>
          spotsFor(surface.sectionId).map((spot) => {
            const item = inside.itemsByKey.get(spot.key);
            return item ? (
              <li key={spot.key}>
                <button type="button" onClick={() => onPickItem(item.productId, spot.key)}>
                  {`${describeItem(item)}. ${inside.label(surface.sectionId)}${spot.row === BACK ? ", at the back" : ""}`}
                </button>
              </li>
            ) : null;
          }),
        )}
      </ul>
    </div>
  );
};

/** The fridge's inside in live 3D: the open fridge and its items as real models. Shelf editing uses the flat front view. */
export const Fridge3dView = (props: FrontViewProps) => (props.editing ? <FrontView {...props} /> : <FridgeScene {...props} />);
