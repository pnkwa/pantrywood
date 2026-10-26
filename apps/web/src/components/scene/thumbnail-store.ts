"use client";

import { useCallback, useSyncExternalStore } from "react";

// Catalog thumbnails rendered from the real 3D models, one at a time by ThumbnailStudio, kept for the session.
const urls = new Map<string, string>();
const queue: string[] = [];
// How many tiles on screen want each picture; one nobody shows any more leaves the queue.
const wanted = new Map<string, number>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const thumbnailStore = {
  subscribe,
  /** The catalog id the studio should render next. */
  next: () => queue[0] ?? null,
  /** An empty url means the item has no 3D model; the 2D sketch stays. */
  save: (itemId: string, url: string) => {
    urls.set(itemId, url);
    queue.splice(queue.indexOf(itemId), 1);
    notify();
  },
};

/** The rendered picture for a catalog item, or null until the studio has drawn it. */
export const useModelThumbnail = (itemId: string) => {
  // Subscribing is what asks for the render, so no effect is needed to start it.
  const subscribeAndRequest = useCallback(
    (listener: () => void) => {
      const unsubscribe = subscribe(listener);
      wanted.set(itemId, (wanted.get(itemId) ?? 0) + 1);
      if (!urls.has(itemId) && !queue.includes(itemId)) {
        queue.push(itemId);
        notify();
      }
      return () => {
        unsubscribe();
        const left = (wanted.get(itemId) ?? 1) - 1;
        if (left > 0) {
          wanted.set(itemId, left);
          return;
        }
        wanted.delete(itemId);
        // The one being drawn right now finishes; the rest wait until a tile asks again.
        const index = queue.indexOf(itemId);
        if (index > 0) queue.splice(index, 1);
      };
    },
    [itemId],
  );
  return useSyncExternalStore(
    subscribeAndRequest,
    () => urls.get(itemId) || null,
    () => null,
  );
};
