/**
 * The Item tray under a point on the page, if any: the inventory hotbar or the desktop side panel, both marked
 * `data-tray-drop`. Checked before any shelf, so a drop on the tray never falls through to a shelf near it.
 */
export const trayAt = (clientX: number, clientY: number) =>
  document
    .elementsFromPoint(clientX, clientY)
    .map((element) => element.closest<HTMLElement>("[data-tray-drop]"))
    .find((element) => element !== null) ?? null;
