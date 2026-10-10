"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { PANEL_SPRING } from "@/lib/motion";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 600;

type BottomSheetProps = {
  open: boolean;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** Mobile inspect panel. Drag the handle down to close; the panel's close button does the same. */
export const BottomSheet = ({ open, label, onClose, children }: BottomSheetProps) => {
  const dragControls = useDragControls();
  return (
    <AnimatePresence>
      {open && (
        <motion.section
          aria-label={label}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0, transition: { duration: 0.2 } }}
          transition={PANEL_SPRING}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
              onClose();
            }
          }}
          className="fixed inset-x-0 bottom-0 z-40 flex max-h-[72dvh] flex-col rounded-t-xl border-[1.5px] border-b-0 border-border bg-card px-4 pb-[calc(96px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-12px_rgba(74,59,46,.35)] lg:hidden"
        >
          <div
            onPointerDown={(event) => dragControls.start(event)}
            className="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center"
          >
            <span aria-hidden className="h-1.5 w-12 rounded-full bg-oat" />
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};
