import { ViewTransition, type ReactNode } from "react";

// Only a Barcode ↔ Receipt switch pins the header; opening or closing scan still moves it with the page.
const ON_TAB_SWITCH = { "scan-tab": "scan-header", default: "none" };
const PILL_ON_TAB_SWITCH = { "scan-tab": "scan-tab-pill", default: "none" };

/** Wraps the scan header so a tab switch leaves it in place. */
export const PinnedScanHeader = ({ children }: { children: ReactNode }) => (
  <ViewTransition name="scan-header" share={ON_TAB_SWITCH} default="none">
    {children}
  </ViewTransition>
);

/** The selected tab's pill slides to the other tab instead of jumping. */
export const SlidingTabPill = ({ children }: { children: ReactNode }) => (
  <ViewTransition name="scan-tab-pill" share={PILL_ON_TAB_SWITCH} default="none">
    {children}
  </ViewTransition>
);
