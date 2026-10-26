"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Inside } from "@/lib/inside/use-inside";
import { InsideItem } from "./InsideItem";

type SectionItemsProps = {
  inside: Inside;
  sectionId: string;
  /** The keys shown here; while dragging, the draft order rather than the saved one. */
  keys: readonly string[];
  look: "standing" | "lying";
  /** The dragged item would land here: dashed sage outline. */
  targeted: boolean;
  selectedItemKey: string | null;
  onPickItem: (productId: number, itemKey: string) => void;
  className?: string;
};

export const SectionItems = ({
  inside,
  sectionId,
  keys,
  look,
  targeted,
  selectedItemKey,
  onPickItem,
  className = "",
}: SectionItemsProps) => {
  const { setNodeRef } = useDroppable({ id: sectionId, data: { type: "section" } });
  return (
    <SortableContext
      id={sectionId}
      items={[...keys]}
      strategy={look === "standing" ? horizontalListSortingStrategy : rectSortingStrategy}
    >
      <div
        ref={setNodeRef}
        aria-label={inside.label(sectionId)}
        role="group"
        className={`rounded-[12px] outline-2 -outline-offset-2 transition-[background-color,outline-color] duration-150 ease-out ${
          targeted ? "bg-sage-deep/10 outline-dashed outline-sage-deep" : "outline-transparent"
        } ${className}`}
      >
        {keys.map((key) => {
          const item = inside.itemsByKey.get(key);
          return (
            item && (
              <InsideItem
                key={key}
                item={item}
                sectionId={sectionId}
                position={inside.positionOf(key)}
                selected={selectedItemKey === key}
                look={look}
                onPick={() => onPickItem(item.productId, key)}
              />
            )
          );
        })}
      </div>
    </SortableContext>
  );
};
