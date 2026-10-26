/**
 * DOM drawn over the canvas (storage tags and outlines), keyed by location id.
 * It lives in the page's own React tree; the scene only writes screen positions into it each frame.
 */
export type SceneOverlay = {
  tags: Map<number, HTMLElement>;
  /** Keyed by piece: "storage:<location id>" or "decor:<placement id>". */
  outlines: Map<string, SVGGElement>;
  /** DOM placed next to the picked piece each frame, e.g. "toolbar" for Decorate's piece toolbar. */
  anchors: Map<string, HTMLElement>;
};

export const createSceneOverlay = (): SceneOverlay => ({
  tags: new Map(),
  outlines: new Map(),
  anchors: new Map(),
});

export const registerIn =
  <Key, T extends Element>(elements: Map<Key, T>, key: Key) =>
  (element: T | null) => {
    if (!element) return;
    elements.set(key, element);
    return () => {
      if (elements.get(key) === element) elements.delete(key);
    };
  };
