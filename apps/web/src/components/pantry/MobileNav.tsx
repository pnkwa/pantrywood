"use client";

import Link from "next/link";
import { OPEN_SCAN } from "@/lib/page-transitions";
import { BarcodeIcon, DoorIcon, HouseSimpleIcon } from "@phosphor-icons/react";

type MobileNavProps = {
  onFridgeDoor: (() => void) | null;
  onRoom: () => void;
  current: "room" | "fridgeDoor";
};

const navButtonClass = (active: boolean) =>
  `flex min-h-11 min-w-16 flex-col items-center gap-0.5 rounded-md px-3 text-[11px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
    active ? "font-semibold text-sage-deep" : "font-medium text-muted-foreground"
  }`;

export const MobileNav = ({ onFridgeDoor, onRoom, current }: MobileNavProps) => (
  <nav
    aria-label="Main"
    className="fixed inset-x-3 bottom-[calc(14px+env(safe-area-inset-bottom))] z-50 flex h-[68px] items-center justify-around rounded-[26px] border-[1.5px] border-border bg-card px-1.5 shadow-[0_14px_30px_-14px_rgba(74,59,46,.45)] lg:hidden"
  >
    <button
      type="button"
      onClick={onRoom}
      aria-current={current === "room" ? "page" : undefined}
      className={navButtonClass(current === "room")}
    >
      <HouseSimpleIcon size={22} weight="duotone" aria-hidden />
      Room
    </button>
    <Link
      href="/scan"
      transitionTypes={OPEN_SCAN}
      aria-label="Scan a barcode"
      className="-mt-8 flex size-16 items-center justify-center rounded-full border-4 border-card bg-terracotta text-accent-foreground shadow-[0_3px_0_#9A4F37,0_12px_22px_-10px_rgba(154,79,55,.8)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <BarcodeIcon size={26} weight="duotone" aria-hidden />
    </Link>
    {onFridgeDoor && (
      <button
        type="button"
        onClick={onFridgeDoor}
        aria-current={current === "fridgeDoor" ? "page" : undefined}
        className={navButtonClass(current === "fridgeDoor")}
      >
        <DoorIcon size={22} weight="duotone" aria-hidden />
        Fridge door
      </button>
    )}
  </nav>
);
