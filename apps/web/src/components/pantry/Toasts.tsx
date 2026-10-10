"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  PushPinIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { PANEL_SPRING } from "@/lib/motion";
import { useUiStore } from "@/lib/store/ui-store";

export const Toasts = () => {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(104px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const ToastIcon = toast.tone === "error" ? WarningIcon : PushPinIcon;
          return (
            <motion.button
              key={toast.id}
              type="button"
              layout
              onClick={() => dismissToast(toast.id)}
              initial={{ opacity: 0, y: 16, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: -1 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
              transition={PANEL_SPRING}
              className={`pointer-events-auto flex min-h-11 max-w-sm items-center gap-2.5 rounded-md border-[1.5px] px-4 py-2.5 text-left text-sm font-medium shadow-paper ${
                toast.tone === "error"
                  ? "border-status-expired bg-status-expired text-status-expired-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <ToastIcon
                size={18}
                weight="duotone"
                className={toast.tone === "error" ? "" : "text-terracotta"}
                aria-hidden
              />
              {toast.message}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
