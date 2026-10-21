import { toIsoDate } from "@pantrywood/shared";
import type { StockAction, StockResult } from "@/lib/grocy/actions";
import { useUiStore } from "@/lib/store/ui-store";
import { leavesForUsing } from "./leaves";
import { useRoomStore } from "./room-store";

// shortcut: kept in memory, so undoing an action from before a reload keeps its leaves; move to apps/api with XP.
const earnedByTransaction = new Map<string, number>();

/** Leaves for a finished stock action: using something up in time earns them, and its Undo takes them back. */
export const rewardLeaves = (action: StockAction, result: StockResult) => {
  const { earn } = useRoomStore.getState();
  const { showToast } = useUiStore.getState();
  if (action.type === "consume" && result.transactionId) {
    const leaves = leavesForUsing(result.bestBeforeDate, toIsoDate(new Date()));
    if (leaves === 0) return;
    earn(leaves);
    earnedByTransaction.set(result.transactionId, leaves);
    showToast(`+${leaves} leaves for using it before its date`);
  }
  if (action.type === "undo") {
    const leaves = earnedByTransaction.get(action.transactionId);
    if (!leaves) return;
    earn(-leaves);
    earnedByTransaction.delete(action.transactionId);
    showToast(`${leaves} leaves taken back with the undo`);
  }
};
