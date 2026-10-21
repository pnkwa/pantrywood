/** "editing": the piece picked in Decorate mode (dashed honey outline). */
export type Highlight = "none" | "hover" | "selected" | "editing";

/** Pixels a pointer may move and still count as a click, not a drag. */
export const CLICK_DRAG_TOLERANCE = 6;

export const highlightFor = (
  locationId: number,
  hoveredLocationId: number | null,
  selectedLocationId: number | null,
): Highlight => {
  if (locationId === selectedLocationId) return "selected";
  if (locationId === hoveredLocationId) return "hover";
  return "none";
};
