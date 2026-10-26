"use client";

import { motion } from "motion/react";
import { XIcon } from "@phosphor-icons/react";
import type { InsideSection } from "@pantrywood/shared";
import { isRemovable, sectionsInTab, type InsideTab } from "@/lib/inside/layout";
import type { Inside } from "@/lib/inside/use-inside";
import { PANEL_SPRING } from "@/lib/motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { SectionItems } from "./SectionItems";

// Each part's look from above: the crate's wood, the wicker, a net bag, a wire basket, the frosty floor.
const PART_LOOKS: Partial<Record<InsideSection["type"], string>> = {
  compartment: "bg-[#EADBC0] border-[#C9A77C]",
  loose: "bg-[#E2C99F] border-[#B98B57] bg-[repeating-linear-gradient(45deg,transparent_0_10px,rgba(154,112,67,0.12)_10px_12px)]",
  bag: "bg-[#F1E7D4]/70 border-dashed border-[#A47551] bg-[radial-gradient(rgba(164,117,81,0.25)_1px,transparent_1.5px)] bg-[length:8px_8px]",
  wireBasket: "bg-white/70 border-[#B5CBD1] bg-[repeating-linear-gradient(90deg,transparent_0_14px,#C9DDE6_14px_16px)]",
  floor: "bg-[#EEF5F7] border-[#C9DDE6]",
};

const FRAME_LOOKS: Record<string, string> = {
  dividers: "bg-[#C9A77C] border-[#A88A60]",
  bags: "bg-[#D9B98C] border-[#9A7043]",
  baskets: "bg-[#DDEBEE] border-[#A9C4C9]",
};

type TopDownViewProps = {
  inside: Inside;
  tab: InsideTab;
  editing: boolean;
  keysFor: (sectionId: string) => readonly string[];
  targetSectionId: string | null;
  selectedItemKey: string | null;
  onPickItem: (productId: number, itemKey: string) => void;
};

export const TopDownView = ({ inside, tab, editing, keysFor, targetSectionId, selectedItemKey, onPickItem }: TopDownViewProps) => {
  const reducedMotion = useReducedMotion();
  const sections = sectionsInTab(inside.layout, tab.id);
  // Bags and baskets sit in a row; the loose pile and the freezer floor fill the rest.
  const big = sections.filter((section) => section.type === "loose" || section.type === "floor");
  const row = sections.filter((section) => !big.includes(section));

  const part = (section: InsideSection) => (
    <motion.div
      key={section.id}
      layout
      transition={reducedMotion ? { duration: 0 } : PANEL_SPRING}
      className={`relative flex min-h-0 min-w-0 flex-col rounded-[16px] border-2 p-2 flex-1 ${PART_LOOKS[section.type] ?? ""}`}
    >
      <span className="text-xs font-semibold text-foreground/70">{inside.label(section.id)}</span>
      <SectionItems
        inside={inside}
        sectionId={section.id}
        keys={keysFor(section.id)}
        look="lying"
        targeted={targetSectionId === section.id}
        selectedItemKey={selectedItemKey}
        onPickItem={onPickItem}
        className="flex min-h-16 flex-1 flex-wrap content-start gap-2 overflow-y-auto p-1"
      />
      {editing && isRemovable(section, inside.layout) && (
        <button
          type="button"
          aria-label={`Remove ${inside.label(section.id)}`}
          onClick={() => inside.removeSection(section.id)}
          className="absolute -top-3 -right-3 flex size-11 items-center justify-center rounded-full border-2 border-[#C8901F] bg-card text-destructive shadow-paper transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <XIcon size={16} weight="bold" aria-hidden />
        </button>
      )}
    </motion.div>
  );

  return (
    <div className="flex min-h-0 flex-1 items-stretch justify-center p-1">
      <div className={`flex w-full max-w-3xl flex-col gap-3 rounded-[28px] border-[3px] p-3 shadow-paper ${FRAME_LOOKS[inside.spec.editWord] ?? ""}`}>
        {row.length > 0 && <div className={`flex min-h-0 gap-3 ${big.length > 0 ? "flex-[0_1_45%]" : "flex-1"}`}>{row.map(part)}</div>}
        {big.map(part)}
      </div>
    </div>
  );
};
