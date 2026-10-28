/**
 * The Item tray under a point on the page, if any: the desktop side panel or the phone drawer, both marked
 * `data-tray-drop`. Checked before any shelf, because the drawer covers shelves that are still on the page under it.
 */
export const trayAt = (clientX: number, clientY: number) =>
  document
    .elementsFromPoint(clientX, clientY)
    .map((element) => element.closest<HTMLElement>("[data-tray-drop]"))
    .find((element) => element !== null) ?? null;
