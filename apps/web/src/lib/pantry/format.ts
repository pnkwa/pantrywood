import type { PantryItem } from "./model";

export const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

export const unitFor = (item: PantryItem, amount: number) =>
  amount === 1 ? item.unitName : item.unitPlural;

export const formatAmount = (item: PantryItem, amount = item.amount) =>
  `${formatNumber(amount)} ${unitFor(item, amount)}`.trim();

export const formatDaysLeft = (daysLeft: number) => {
  if (daysLeft < -1) return `${-daysLeft} days ago`;
  if (daysLeft === -1) return "yesterday";
  if (daysLeft === 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  return `in ${daysLeft} days`;
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

export const formatDate = (isoDate: string) => {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  return DATE_FORMAT.format(new Date(year, month - 1, day));
};

export const listNames = (names: readonly string[], shown = 3) =>
  names.length <= shown
    ? names.join(", ")
    : `${names.slice(0, shown).join(", ")} +${names.length - shown}`;

const MONEY_FORMATS = new Map<string, Intl.NumberFormat>();

/** "฿189.00"; falls back to "189.00 XYZ" for a code the browser doesn't know. */
export const formatMoney = (value: number, currency: string) => {
  try {
    const format =
      MONEY_FORMATS.get(currency) ??
      new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "narrowSymbol" });
    MONEY_FORMATS.set(currency, format);
    return format.format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};
