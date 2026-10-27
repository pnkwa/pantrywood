import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReceiptCorrectionSchema, ReceiptMatchSchema, ReceiptMemorySchema } from "@pantrywood/shared";
import { localStorageRepository } from "@/lib/repository/local-storage";

export const receiptMemories = localStorageRepository("receipts", ReceiptMemorySchema);
/** Keyed by the normalized printed name. */
export const receiptMatches = localStorageRepository("receipt-matches", ReceiptMatchSchema);
/** Keyed by the normalized OCR reading. */
export const receiptCorrections = localStorageRepository("receipt-corrections", ReceiptCorrectionSchema);

const receiptKeys = {
  memories: ["pantrywood", "receipts"],
  matches: ["pantrywood", "receipt-matches"],
  corrections: ["pantrywood", "receipt-corrections"],
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

export const useReceiptCorrections = () =>
  useQuery({
    queryKey: receiptKeys.corrections,
    queryFn: async () => new Map((await receiptCorrections.list()).map((correction) => [correction.read, correction.text])),
  });

export const useRefreshReceipts = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["pantrywood"] });
};
