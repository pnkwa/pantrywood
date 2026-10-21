"use client";

import type { RefCallback } from "react";
import { CameraIcon } from "@phosphor-icons/react";
import type { CameraStatus } from "@/lib/scan/camera-scanner";

const STATUS_HINTS: Record<CameraStatus, string> = {
  idle: "Hold a barcode inside the frame",
  starting: "Starting the camera…",
  scanning: "Hold a barcode inside the frame",
  denied: "The camera is blocked. Allow it in the browser, or use your barcode scanner.",
  unavailable: "No camera here. Use your barcode scanner or type the numbers.",
};

type CameraViewProps = {
  videoRef: RefCallback<HTMLVideoElement>;
  status: CameraStatus;
  mirrored: boolean;
  flashKey: number;
  found: boolean;
};

export const CameraView = ({ videoRef, status, mirrored, flashKey, found }: CameraViewProps) => (
  <div className="absolute inset-0 overflow-hidden bg-[#3A322A] lg:relative lg:inset-auto lg:min-h-60 lg:flex-1 lg:rounded-xl">
    <video
      ref={videoRef}
      muted
      playsInline
      className={`absolute inset-0 size-full object-cover opacity-90 ${mirrored ? "-scale-x-100" : ""}`}
    />
    <div aria-hidden className="absolute inset-0 bg-[#2B261F]/25" />
    <div
      aria-hidden
      className={`absolute top-1/2 left-1/2 h-48 w-[min(300px,78%)] -translate-x-1/2 -translate-y-1/2 rounded-[22px] transition-colors duration-150 ${
        found ? "bg-sage/15 outline-3 outline-sage" : ""
      }`}
    >
      {["top-0 left-0 border-t-4 border-l-4 rounded-tl-[22px]", "top-0 right-0 border-t-4 border-r-4 rounded-tr-[22px]", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[22px]", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-[22px]"].map((corner) => (
        <span key={corner} className={`absolute size-10 border-[#F3EADB] ${corner}`} />
      ))}
      {status === "scanning" && !found && (
        <span className="absolute inset-x-5 top-4 h-0.5 rounded-full bg-sage shadow-[0_0_12px_#8FA67A] motion-safe:animate-[scan-line_2.4s_ease-in-out_infinite_alternate]" />
      )}
    </div>
    {flashKey > 0 && (
      <div
        key={flashKey}
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-sage/30 motion-safe:animate-[scan-flash_500ms_ease-out_forwards] motion-reduce:hidden"
      />
    )}
    <span className="absolute top-4 left-4 hidden items-center gap-1.5 rounded-full bg-[#2B261F]/60 px-3 py-1.5 text-[13px] font-medium text-[#F3EADB] lg:inline-flex">
      <CameraIcon size={16} weight="duotone" aria-hidden />
      Camera
    </span>
    <p
      role="status"
      className="absolute inset-x-6 top-[calc(50%+7rem)] text-center text-sm text-[#F3EADB] lg:top-auto lg:bottom-5"
    >
      {found ? "Found it · or use your barcode scanner" : STATUS_HINTS[status]}
    </p>
  </div>
);
