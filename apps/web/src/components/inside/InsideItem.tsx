"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PantryItem } from "@/lib/pantry/model";
import { formatAmount } from "@/lib/pantry/format";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { STATUS_STYLES } from "@/components/pantry/icons";
import { ItemPicture } from "./ItemPicture";

const MARKED = new Set(["soon", "expired", "low"]);

const SETTLE = { duration: 200, easing: "ease-out" };

const StatusBadge = ({ item }: { item: PantryItem }) => {
  if (!MARKED.has(item.status)) return null;
  const style = STATUS_STYLES[item.status];
  const StatusIcon = style.icon;
  return (
    <span
      aria-hidden
      title={style.label}
      className={`absolute -right-1.5 bottom-0 flex size-5 items-center justify-center rounded-full border-2 border-card ${style.className}`}
    >
      <StatusIcon size={11} weight="bold" />
    </span>
  );
};

export const describeItem = (item: PantryItem) =>
  [
    item.name,
    formatAmount(item),
    MARKED.has(item.status) ? STATUS_STYLES[item.status].label : null,
  ]
    .filter(Boolean)
    .join(", ");

type InsideItemProps = {
  item: PantryItem;
  sectionId: string;
  position: string;
  selected: boolean;
  look: "standing" | "lying";
  onPick: () => void;
};

export const InsideItem = ({
  item,
  sectionId,
  position,
  selected,
  look,
  onPick,
}: InsideItemProps) => {
  const reducedMotion = useReducedMotion();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.key,
    data: { type: "item", section: sectionId },
    transition: reducedMotion ? null : SETTLE,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onPick}
      aria-label={`${describeItem(item)}. ${position}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative flex shrink touch-none items-end justify-center rounded-[12px] outline-offset-2 transition-opacity duration-150 ease-out focus-visible:outline-3 focus-visible:outline-ring ${
        look === "standing" ? "h-full min-w-6 max-w-[24%]" : "size-16"
      } ${isDragging ? "opacity-30" : ""} ${selected ? "outline-3 outline-sage-deep" : ""}`}
    >
      <span className="relative flex h-full max-w-full items-end">
        <ItemPicture item={item} className="h-full w-auto max-w-full" />
        <StatusBadge item={item} />
      </span>
    </button>
  );
};

export const LiftedItem = ({
  item,
  landing,
}: {
  item: PantryItem;
  landing: string;
}) => (
  <div className="pointer-events-none relative flex h-24 flex-col items-center">
    <ItemPicture
      item={item}
      className="h-24 w-auto -rotate-6 drop-shadow-[0_12px_8px_rgba(74,59,46,0.3)]"
    />
    <span className="absolute top-1/2 left-full ml-2 rounded-[10px] bg-foreground px-2.5 py-1 text-xs font-medium whitespace-nowrap text-background">
      {item.name} → {landing}
    </span>
  </div>
);
