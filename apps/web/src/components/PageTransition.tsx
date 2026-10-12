import { ViewTransition, type ReactNode } from "react";

const PAGE_ANIMATIONS = {
  "scan-open": "scan-open",
  "scan-close": "scan-close",
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  "scan-tab": "page-fade",
  default: "page-fade",
};

export const PageTransition = ({ children }: { children: ReactNode }) => (
  <ViewTransition enter={PAGE_ANIMATIONS} exit={PAGE_ANIMATIONS} default="none">
    {children}
  </ViewTransition>
);
