"use client";

import {
  BasketIcon,
  HourglassIcon,
  type Icon,
  PlantIcon,
  ReceiptIcon,
} from "@phosphor-icons/react";
import type { PantryStats } from "@/lib/pantry/model";
import { listNames } from "@/lib/pantry/format";
import { AnimatedNumber } from "./AnimatedNumber";

type StatCard = {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
  hint: string;
  icon: Icon;
  tint: string;
};

const cardsFor = (stats: PantryStats): StatCard[] => [
  {
    key: "use-soon",
    label: "Use soon",
    shortLabel: "Use soon",
    value: stats.useSoon.count,
    hint: stats.useSoon.count
      ? listNames(stats.useSoon.names)
      : "Nothing needs rushing",
    icon: HourglassIcon,
    tint: "bg-status-soon text-status-soon-foreground",
  },
  {
    key: "running-low",
    label: "Running low",
    shortLabel: "Low",
    value: stats.runningLow.count,
    hint: stats.runningLow.count
      ? listNames(stats.runningLow.names)
      : "All stocked up",
    icon: BasketIcon,
    tint: "bg-status-low text-status-low-foreground",
  },
  {
    key: "in-stock",
    label: "In stock",
    shortLabel: "In stock",
    value: stats.inStock.count,
    hint: `food & supplies · ${stats.inStock.spots} spots`,
    icon: PlantIcon,
    tint: "bg-status-fresh text-status-fresh-foreground",
  },
  {
    key: "added-this-week",
    label: "Added this week",
    shortLabel: "This week",
    value: stats.addedThisWeek.count,
    hint: stats.addedThisWeek.count
      ? listNames(stats.addedThisWeek.names)
      : "Nothing new yet",
    icon: ReceiptIcon,
    tint: "bg-status-opened text-status-opened-foreground",
  },
];

export const StatCards = ({ stats }: { stats: PantryStats | null }) => {
  if (!stats) {
    return (
      <div
        aria-hidden
        className="grid h-[68px] grid-cols-4 gap-2 lg:h-[88px] lg:gap-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const cards = cardsFor(stats);
  return (
    <section aria-label="Storage at a glance">
      <ul className="grid grid-cols-4 py-1 lg:hidden">
        {cards.map((card) => {
          const CardIcon = card.icon;
          return (
            <li
              key={card.key}
              className="flex min-w-0 flex-col items-center gap-1 px-1"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`flex size-7 items-center justify-center rounded-full ${card.tint}`}
                >
                  <CardIcon size={15} weight="duotone" aria-hidden />
                </span>
                <AnimatedNumber
                  value={card.value}
                  className="text-xl leading-none font-semibold tracking-[-0.02em]"
                />
              </span>
              <span className="w-full truncate text-center text-[11px] font-medium text-muted-foreground">
                {card.shortLabel}
              </span>
            </li>
          );
        })}
      </ul>
      <ul className="hidden grid-cols-4 gap-4 lg:grid">
        {cards.map((card, index) => {
          const CardIcon = card.icon;
          return (
            <li
              key={card.key}
              className="relative flex items-center gap-3.5 rounded-lg border-[1.5px] border-border bg-card px-5 py-[18px] shadow-paper"
            >
              {index === 0 && (
                <span
                  aria-hidden
                  className="absolute -top-2 left-5 h-4 w-14 -rotate-3 rounded-[2px] bg-honey/55"
                />
              )}
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-full ${card.tint}`}
              >
                <CardIcon size={24} weight="duotone" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </span>
                <AnimatedNumber
                  value={card.value}
                  className="text-[34px] leading-none font-semibold tracking-[-0.02em]"
                />
                <span className="truncate text-[13px] text-muted-foreground">
                  {card.hint}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
