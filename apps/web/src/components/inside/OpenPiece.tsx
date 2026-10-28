"use client";

import { useEffect } from "react";
import { useUiStore } from "@/lib/store/ui-store";

/**
 * `/storage/[id]`: opens that piece in the room around it (the camera glides in, then its inside view), and closes it
 * again when the URL moves on, so links, refresh and browser Back / Forward all just work.
 */
export const OpenPiece = ({ locationId }: { locationId: number }) => {
  // Syncs the URL into the UI store, an outside system as far as this route is concerned.
  useEffect(() => {
    const ui = useUiStore.getState();
    if (ui.view === "room" || ui.insideLocationId !== locationId) ui.openInside(locationId);
    return () => useUiStore.getState().closeInside();
  }, [locationId]);
  return null;
};
