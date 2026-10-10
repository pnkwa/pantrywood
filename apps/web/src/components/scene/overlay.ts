/**
 * DOM drawn over the canvas (storage tags and outlines), keyed by location id.
 * It lives in the page's own React tree; the scene only writes screen positions into it each frame.
 */
export type SceneOverlay = {
  tags: Map<number, HTMLElement>;
  outlines: Map<number, SVGGElement>;
};

export const createSceneOverlay = (): SceneOverlay => ({
  tags: new Map(),
  outlines: new Map(),
});

export const registerIn =
  <T extends Element>(elements: Map<number, T>, locationId: number) =>
  (element: T | null) => {
    if (!element) return;
    elements.set(locationId, element);
    return () => {
      if (elements.get(locationId) === element) elements.delete(locationId);
    };
  };
