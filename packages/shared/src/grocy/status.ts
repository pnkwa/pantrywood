import { NEVER_EXPIRES_DATE } from "./schemas";
import type { ProductKind } from "./classify";

export const USE_SOON_DAYS = 3;

export type FoodStatus = "fresh" | "soon" | "expired";

const MILLISECONDS_PER_DAY = 86_400_000;

export const toIsoDate = (date: Date): string =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

export const daysUntil = (isoDate: string, today: Date): number => {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  const start = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.round((target - start) / MILLISECONDS_PER_DAY);
};

export const foodStatus = (bestBeforeDate: string, today: Date): FoodStatus => {
  if (bestBeforeDate === NEVER_EXPIRES_DATE) return "fresh";
  const days = daysUntil(bestBeforeDate, today);
  if (days < 0) return "expired";
  if (days <= USE_SOON_DAYS) return "soon";
  return "fresh";
};

export const isRunningLow = (
  amountInStock: number,
  minStockAmount: number,
): boolean => minStockAmount > 0 && amountInStock < minStockAmount;

/** Supplies only ever show "Stocked" or "Running low", never expiry. */
export const showsExpiry = (kind: ProductKind): boolean => kind === "food";
