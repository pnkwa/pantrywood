import type { PantryItem } from "@/lib/pantry/model";
import { SnowflakeIcon } from "@phosphor-icons/react";
import { STATUS_STYLES } from "./icons";

const soonDetail = (daysLeft: number | null) => {
  if (daysLeft === null) return "";
  if (daysLeft <= 0) return " · today";
  return daysLeft === 1 ? " · 1 day" : ` · ${daysLeft} days`;
};

export const StatusChip = ({ item }: { item: PantryItem }) => {
  const style = STATUS_STYLES[item.status];
  const StatusIcon = style.icon;
  const detail = item.status === "soon" ? soonDetail(item.daysLeft) : "";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}
    >
      <StatusIcon size={13} weight="duotone" aria-hidden />
      {style.label}
      {detail}
    </span>
  );
};

/** Shown on items stocked in a freezer (the fridge's top compartment). */
export const FreezerTag = ({ compact = false }: { compact?: boolean }) =>
  compact ? (
    <span className="inline-flex items-center gap-0.5 font-semibold text-status-frozen-foreground">
      <SnowflakeIcon size={12} weight="bold" aria-hidden />
      Freezer
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-frozen px-2.5 py-1 text-xs font-semibold text-status-frozen-foreground">
      <SnowflakeIcon size={13} weight="duotone" aria-hidden />
      Freezer
    </span>
  );
