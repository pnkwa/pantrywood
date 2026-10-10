import { ViewTransition, type ReactNode } from "react";

const PAGE_ANIMATIONS = {
  "scan-open": "scan-open",
  "scan-close": "scan-close",
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "page-fade",
};

/** Animates a whole page in and out on navigation (DESIGN.md section 10). */
export const PageTransition = ({ children }: { children: ReactNode }) => (
  <ViewTransition enter={PAGE_ANIMATIONS} exit={PAGE_ANIMATIONS} default="none">
    {children}
  </ViewTransition>
);
