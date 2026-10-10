import type { Transition } from "motion/react";

export const PANEL_SPRING: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
};

export const QUICK_FADE: Transition = { duration: 0.15, ease: "easeOut" };
