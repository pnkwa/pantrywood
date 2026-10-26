"use client";

import { motion } from "motion/react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CaretDownIcon, CaretUpIcon, DotsSixVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import type { InsideSection, SectionType } from "@pantrywood/shared";
import { Combobox } from "@/components/ui/combobox";
import { isRemovable, sectionsInTab, shelfBands, type InsideTab } from "@/lib/inside/layout";
import { SHELF_TYPE_NAMES, type Inside } from "@/lib/inside/use-inside";
import { PANEL_SPRING } from "@/lib/motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { SectionItems } from "./SectionItems";

const RAILS_TOP = 0.09;
const RAILS_BOTTOM_WITH_CRISPERS = 0.27;
const RAILS_BOTTOM = 0.05;

const percent = (fraction: number) => `${fraction * 100}%`;

/** What the shelf itself looks like under the items. */
const ShelfPlank = ({ type }: { type: SectionType }) => {
  if (type === "board") return <div className="h-3 rounded-[3px] bg-[#C9A77C] shadow-[0_2px_0_#A88A60]" />;
  if (type === "glass") return <div className="h-2 rounded-full border border-white bg-white/50 shadow-[0_2px_4px_rgba(74,59,46,0.12)]" />;
  if (type === "drawer" || type === "doorBin") return <div className="h-1.5 rounded-full bg-[#DCD6CA]" />;
  return (
    <div className="h-2.5 rounded-full border-[1.5px] border-[#DCD6CA] bg-white bg-[repeating-linear-gradient(90deg,transparent_0_18px,#DCD6CA_18px_20px)]" />
  );
};

/** Drawers and door bins have a front lip the items stand behind. */
const FrontLip = ({ type }: { type: SectionType }) => {
  if (type === "drawer")
    return <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-1.5 h-[55%] rounded-[10px] border-2 border-[#DCD6CA] bg-white/55" />;
  if (type === "doorBin")
    return <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-1.5 h-[35%] rounded-b-[12px] border-2 border-t-0 border-[#C9DDE6] bg-[#E8F2F4]/70" />;
  return null;
};

const NotchTarget = ({ notch, top, active }: { notch: number; top: number; active: boolean }) => {
  const { setNodeRef } = useDroppable({ id: `notch:${notch}`, data: { type: "notch", notch } });
  return (
    <div
      ref={setNodeRef}
      style={{ top: percent(top) }}
      className="absolute inset-x-0 h-8 -translate-y-1/2"
    >
      {active && (
        <div className="absolute inset-x-[3%] top-1/2 h-8 -translate-y-1/2 rounded-[10px] border-[2.5px] border-dashed border-[#C8901F] bg-honey/10" />
      )}
    </div>
  );
};

const ShelfHandle = ({ section, name }: { section: InsideSection; name: string }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shelf:${section.id}`,
    data: { type: "shelf", section: section.id },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Drag ${name} to another notch`}
      className={`absolute top-full -left-[11%] flex h-11 w-[7%] min-w-8 -translate-y-full touch-none items-center justify-center rounded-[12px] border-2 border-[#C8901F] bg-card text-muted-foreground shadow-paper transition-opacity duration-150 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <DotsSixVerticalIcon size={18} weight="bold" aria-hidden />
    </button>
  );
};

const toolButton =
  "flex size-11 items-center justify-center rounded-[10px] transition-colors duration-150 ease-out hover:bg-muted disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";

const ShelfToolbar = ({ inside, tab, section }: { inside: Inside; tab: InsideTab; section: InsideSection }) => {
  const notch = section.notch ?? 0;
  return (
    <div
      role="toolbar"
      aria-label={inside.label(section.id)}
      className="flex items-center gap-1 rounded-[16px] border-[1.5px] border-border bg-card p-1.5 whitespace-nowrap shadow-[0_12px_24px_-12px_rgba(74,59,46,0.5)] animate-in fade-in zoom-in-95 duration-150 motion-reduce:zoom-in-100"
    >
      <span className="px-2 text-[13px] font-semibold">{inside.label(section.id)}</span>
      <button type="button" aria-label="Move up one notch" disabled={notch === 0} onClick={() => inside.moveShelf(section.id, notch - 1)} className={toolButton}>
        <CaretUpIcon size={16} weight="bold" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Move down one notch"
        disabled={notch === tab.notches - 1}
        onClick={() => inside.moveShelf(section.id, notch + 1)}
        className={toolButton}
      >
        <CaretDownIcon size={16} weight="bold" aria-hidden />
      </button>
      <Combobox
        value={section.type}
        options={tab.shelfTypes.map((type) => ({ value: type, label: SHELF_TYPE_NAMES[type] }))}
        onChange={(type) => {
          const chosen = tab.shelfTypes.find((candidate) => candidate === type);
          if (chosen) inside.setType(section.id, chosen);
        }}
        className="h-11 w-32"
      />
      <button
        type="button"
        aria-label={`Remove ${inside.label(section.id)}`}
        disabled={!isRemovable(section, inside.layout)}
        onClick={() => inside.removeSection(section.id)}
        className={`${toolButton} text-destructive`}
      >
        <TrashIcon size={16} weight="duotone" aria-hidden />
      </button>
    </div>
  );
};

type FrontViewProps = {
  inside: Inside;
  tab: InsideTab;
  editing: boolean;
  keysFor: (sectionId: string) => readonly string[];
  targetSectionId: string | null;
  targetNotch: number | null;
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  selectedItemKey: string | null;
  onPickItem: (productId: number, itemKey: string) => void;
  withVent: boolean;
};

export const FrontView = ({
  inside,
  tab,
  editing,
  keysFor,
  targetSectionId,
  targetNotch,
  selectedSectionId,
  onSelectSection,
  selectedItemKey,
  onPickItem,
  withVent,
}: FrontViewProps) => {
  const reducedMotion = useReducedMotion();
  const sections = sectionsInTab(inside.layout, tab.id);
  const notched = sections.filter((section) => section.notch !== null);
  const crispers = sections.filter((section) => section.type === "crisper");
  const bands = shelfBands(notched, tab.notches);
  const railsBottom = crispers.length > 0 ? RAILS_BOTTOM_WITH_CRISPERS : RAILS_BOTTOM;
  const lineAt = (notch: number) => (notch + 1) / tab.notches;
  const selected = notched.find((section) => section.id === selectedSectionId);
  const selectedBand = bands.find((band) => band.id === selectedSectionId);

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center [container-type:size]">
      <div className="relative aspect-[9/8]" style={{ width: "min(100cqw, 112.5cqh)" }}>
        <div className="absolute inset-0 rounded-[34px] bg-[#F3EADB] p-[2.8%] shadow-paper dark:bg-[#4A4238]">
          <div className="relative h-full rounded-[22px] bg-[linear-gradient(180deg,#FDFBF7,#F1ECE2)] shadow-[inset_0_0_0_12px_#ECE7DC]">
            {withVent && (
              <div aria-hidden className="absolute top-[2.5%] left-1/2 h-[3.5%] w-[20%] -translate-x-1/2 rounded-[7px] bg-[#E6E1D6] bg-[radial-gradient(#CFC8BA_1.2px,transparent_1.6px)] bg-[length:10px_8px]" />
            )}
            <div className="absolute inset-x-0" style={{ top: percent(RAILS_TOP), bottom: percent(railsBottom) }}>
              {Array.from({ length: tab.notches }, (_, notch) => (
                <div key={notch} aria-hidden style={{ top: percent(lineAt(notch)) }} className="absolute inset-x-[1.2%] flex -translate-y-1/2 justify-between">
                  <span className="h-1.5 w-[6%] rounded-full bg-[#E2DCCF]" />
                  <span className="h-1.5 w-[6%] rounded-full bg-[#E2DCCF]" />
                </div>
              ))}
              {editing &&
                Array.from({ length: tab.notches }, (_, notch) => (
                  <NotchTarget key={notch} notch={notch} top={lineAt(notch)} active={targetNotch === notch} />
                ))}
              {bands.map((band) => {
                const section = notched.find((candidate) => candidate.id === band.id);
                if (!section) return null;
                const isSelected = editing && section.id === selectedSectionId;
                return (
                  <motion.div
                    key={section.id}
                    layout
                    transition={reducedMotion ? { duration: 0 } : PANEL_SPRING}
                    style={{ top: percent(band.top), height: percent(band.bottom - band.top) }}
                    className={`absolute flex flex-col justify-end ${section.type === "half" ? "right-[52%] left-[9%]" : "inset-x-[9%]"}`}
                    onClick={editing ? () => onSelectSection(section.id) : undefined}
                  >
                    <SectionItems
                      inside={inside}
                      sectionId={section.id}
                      keys={keysFor(section.id)}
                      look="standing"
                      targeted={targetSectionId === section.id}
                      selectedItemKey={selectedItemKey}
                      onPickItem={onPickItem}
                      className="flex min-h-0 flex-1 items-end justify-center gap-[2%] px-[2%] pt-[6%]"
                    />
                    <FrontLip type={section.type} />
                    <ShelfPlank type={section.type} />
                    {isSelected && (
                      <div aria-hidden className="pointer-events-none absolute -inset-x-[3%] -bottom-2 h-[calc(100%+8px)] rounded-[12px] border-[2.5px] border-dashed border-[#C8901F] bg-honey/5" />
                    )}
                    {editing && <ShelfHandle section={section} name={inside.label(section.id)} />}
                  </motion.div>
                );
              })}
            </div>
            {crispers.length > 0 && (
              <div className="absolute inset-x-[4%] bottom-[3%] flex gap-[4%]" style={{ height: percent(railsBottom - 0.06) }}>
                {crispers.map((section) => (
                  <div key={section.id} className="relative flex-1 rounded-[16px] border-2 border-[#DCD6CA] bg-white/55">
                    <SectionItems
                      inside={inside}
                      sectionId={section.id}
                      keys={keysFor(section.id)}
                      look="standing"
                      targeted={targetSectionId === section.id}
                      selectedItemKey={selectedItemKey}
                      onPickItem={onPickItem}
                      className="flex h-full items-end justify-center gap-[3%] px-[4%] pt-[10%] pb-[8%]"
                    />
                    <span aria-hidden className="absolute bottom-[6%] left-1/2 h-1.5 w-[18%] -translate-x-1/2 rounded-full bg-[#DCD6CA]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {editing && selected && selectedBand && (
          <div
            className="absolute left-1/2 z-10 -translate-x-1/2"
            style={{ top: `calc(${percent(RAILS_TOP + selectedBand.bottom * (1 - RAILS_TOP - railsBottom))} + 14px)` }}
          >
            <ShelfToolbar inside={inside} tab={tab} section={selected} />
          </div>
        )}
      </div>
    </div>
  );
};
