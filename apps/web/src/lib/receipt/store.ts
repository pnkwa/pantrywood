import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReceiptMatchSchema, ReceiptMemorySchema } from "@pantrywood/shared";
import { localStorageRepository } from "@/lib/repository/local-storage";

export const receiptMemories = localStorageRepository("receipts", ReceiptMemorySchema);
/** Keyed by the normalized printed name. */
export const receiptMatches = localStorageRepository("receipt-matches", ReceiptMatchSchema);

const receiptKeys = {
  memories: ["pantrywood", "receipts"],
  matches: ["pantrywood", "receipt-matches"],
};

export const useReceiptMemories = () =>
  useQuery({
    queryKey: receiptKeys.memories,
    queryFn: async () =>
      (await receiptMemories.list()).sort((first, second) => second.savedAt.localeCompare(first.savedAt)),
  });

export const useRememberedMatches = () =>
  useQuery({
    queryKey: receiptKeys.matches,
    queryFn: async () =>
      new Map((await receiptMatches.list()).map((match) => [match.receiptName, match.productId])),
  });

export const useRefreshReceipts = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["pantrywood"] });
};
