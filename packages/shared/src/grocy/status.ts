import { NEVER_EXPIRES_DATE } from "./schemas";
import type { ProductKind } from "./classify";

/** DESIGN.md "Status colors": food is "use soon" at ≤ 3 days. */
export const USE_SOON_DAYS = 3;

export type FoodStatus = "fresh" | "soon" | "expired";

/** Local calendar date as "YYYY-MM-DD", the format Grocy uses for best-before dates. */
export function toIsoDate(date: Date): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("-");
}

/** Whole days from today until a "YYYY-MM-DD" date (negative = past). */
export function daysUntil(isoDate: string, today: Date): number {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - start) / 86_400_000);
}

export function foodStatus(bestBeforeDate: string, today: Date): FoodStatus {
  if (bestBeforeDate === NEVER_EXPIRES_DATE) return "fresh";
  const days = daysUntil(bestBeforeDate, today);
  if (days < 0) return "expired";
  if (days <= USE_SOON_DAYS) return "soon";
  return "fresh";
}

/** Running low = below the product's min stock amount (food and supplies). */
export function isRunningLow(amountInStock: number, minStockAmount: number): boolean {
  return minStockAmount > 0 && amountInStock < minStockAmount;
}

/** Supplies never show expiry: only "Stocked" or "Running low". */
export function showsExpiry(kind: ProductKind): boolean {
  return kind === "food";
}
