// No "@/" imports: scripts/scene-pick.test.mjs runs this file directly with Node.

/** A shelf, the share along it, and (on a deep shelf) the row: 0 = front, 1 = back. */
export type ScenePick = { sectionId: string; x: number; row?: number };
type Picker = (clientX: number, clientY: number) => ScenePick | null;

// The open 3D inside view, if any: page drags (from the tray) ask it which shelf is under the pointer.
let picker: Picker | null = null;

export const setScenePicker = (next: Picker | null) => {
  picker = next;
};

/** The shelf, the share along it and the row under a point on the page; null when no 3D view is open or nothing is there. */
export const pickScene = (clientX: number, clientY: number) => picker?.(clientX, clientY) ?? null;
