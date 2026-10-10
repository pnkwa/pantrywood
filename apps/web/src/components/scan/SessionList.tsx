"use client";

import { motion } from "motion/react";
import { useStockAction } from "@/lib/grocy";
import { PANEL_SPRING } from "@/lib/motion";
import { useScanStore } from "@/lib/store/scan-store";
import { useUiStore } from "@/lib/store/ui-store";

const AVATAR_TINTS = ["#F3E7CF", "#EADFC9", "#F3EEE4", "#E1ECEE"];

/** The same product always gets the same soft tint. */
const tintFor = (productName: string) => {
  const charSum = [...productName].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_TINTS[charSum % AVATAR_TINTS.length];
};

export const SessionList = () => {
  const session = useScanStore((state) => state.session);
  const markUndone = useScanStore((state) => state.markUndone);
  const stockAction = useStockAction();
  const showToast = useUiStore((state) => state.showToast);

  if (session.length === 0) {
    return (
      <div className="min-h-0 flex-1">
        <p className="rounded-md border-[1.5px] border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing scanned yet. Point the camera at a barcode, or just scan with your USB scanner.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      {session.map((row) => (
        <motion.li
          key={row.id}
          layout
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: row.undone ? 0.5 : 1, y: 0 }}
          transition={PANEL_SPRING}
          className="flex items-center gap-3 rounded-md border-[1.5px] border-border bg-[#FFFDF8] px-3 py-2.5 dark:bg-card"
        >
          <span
            style={{ backgroundColor: tintFor(row.productName) }}
            className="flex size-10 shrink-0 items-center justify-center rounded-[12px] text-[15px] font-semibold text-[#4A3B2E]"
          >
            {row.productName.slice(0, 1)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate text-[15px] font-semibold ${row.undone ? "line-through" : ""}`}>
              {row.productName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {row.undone ? "Undone" : row.detail}
            </span>
          </span>
          <span className="tabular shrink-0 text-[15px] font-semibold text-status-fresh-foreground">
            {row.amountText}
          </span>
          {row.transactionId && !row.undone && (
            <button
              type="button"
              disabled={stockAction.isPending}
              onClick={() => {
                const transactionId = row.transactionId;
                if (!transactionId) return;
                stockAction.mutate(
                  { type: "undo", transactionId },
                  {
                    onSuccess: () => markUndone(row.id),
                    onError: (error) => showToast(error.message, "error"),
                  },
                );
              }}
              className="h-11 shrink-0 rounded-full px-3 text-[13px] font-semibold text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted"
            >
              Undo
            </button>
          )}
        </motion.li>
      ))}
    </ul>
  );
};
