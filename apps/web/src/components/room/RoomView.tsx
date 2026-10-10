"use client";

import { useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  HouseSimple,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react";
import type { CameraApi } from "@/components/scene/CameraRig";
import { useRoom } from "@/lib/room/use-room";

const StorageRoomScene = dynamic(
  () =>
    import("@/components/scene/StorageRoomScene").then(
      (sceneModule) => sceneModule.StorageRoomScene,
    ),
  { ssr: false },
);

type ControlButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
};

const ControlButton = ({ label, onClick, children }: ControlButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="flex size-11 items-center justify-center rounded-sm text-foreground transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95"
  >
    {children}
  </button>
);

export const RoomView = () => {
  const room = useRoom();
  const cameraRef = useRef<CameraApi>(null);
  const [tagLayer, setTagLayer] = useState<HTMLDivElement | null>(null);
  const storages = room.status === "ready" ? room.storages : [];
  const description =
    room.status === "ready"
      ? `Storage room with ${storages.map((storage) => `${storage.tag.name} (${storage.tag.itemCount} items)`).join(", ")}`
      : "Storage room";

  return (
    <section
      aria-label="3D storage room"
      className="relative min-h-140 flex-1 overflow-hidden rounded-xl border-[1.5px] border-border bg-[radial-gradient(120%_90%_at_50%_35%,var(--scene-sky-top)_0%,var(--scene-sky-mid)_60%,var(--scene-sky-edge)_100%)] shadow-paper"
    >
      <div className="absolute inset-0">
        {tagLayer && (
          <StorageRoomScene
            storages={storages}
            cameraRef={cameraRef}
            tagLayer={tagLayer}
            label={description}
          />
        )}
      </div>
      <div
        ref={setTagLayer}
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      />

      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1 rounded-lg border-[1.5px] border-border bg-card p-1.5 shadow-paper">
        <ControlButton
          label="Zoom in"
          onClick={() => cameraRef.current?.zoomIn()}
        >
          <MagnifyingGlassPlus size={20} weight="duotone" />
        </ControlButton>
        <ControlButton
          label="Zoom out"
          onClick={() => cameraRef.current?.zoomOut()}
        >
          <MagnifyingGlassMinus size={20} weight="duotone" />
        </ControlButton>
        <ControlButton
          label="Back to whole room"
          onClick={() => cameraRef.current?.reset()}
        >
          <HouseSimple size={20} weight="duotone" />
        </ControlButton>
      </div>

      {room.status === "loading" && (
        <p
          role="status"
          className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border-[1.5px] border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-paper animate-in fade-in duration-300"
        >
          Opening the storage room…
        </p>
      )}

      {room.status === "error" && (
        <div
          role="alert"
          className="absolute bottom-5 left-1/2 z-30 flex w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-lg border-[1.5px] border-border bg-card px-4 py-3 shadow-paper animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:slide-in-from-bottom-0"
        >
          <p className="flex-1 text-sm">
            <span className="font-semibold">
              Couldn&apos;t reach the pantry.
            </span>{" "}
            <span className="text-muted-foreground">{room.message}</span>
          </p>
          <button
            type="button"
            onClick={room.retry}
            className="h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_2px_0_var(--sage-deep)] transition-transform duration-150 ease-out active:translate-y-px"
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
};
