"use client";

import Link from "next/link";
import { ArrowLeftIcon, ReceiptIcon } from "@phosphor-icons/react";
import { Toasts } from "@/components/pantry/Toasts";
import { NAV_BACK, NAV_FORWARD } from "@/lib/page-transitions";
import { useReceiptMemories } from "@/lib/receipt/store";
import { ReceiptPolaroid } from "./ReceiptPolaroid";
import { ReceiptSketch } from "./ReceiptScanner";

export const ReceiptMemories = () => {
  const memories = useReceiptMemories();
  const receipts = memories.data ?? [];

  return (
    <div className="mx-auto flex min-h-dvh max-w-310 flex-col gap-5 p-4 pb-28 lg:p-6">
      <header className="flex flex-wrap items-center gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-3 shadow-paper">
        <Link
          href="/"
          transitionTypes={NAV_BACK}
          aria-label="Back to the storage room"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border transition-colors duration-150 ease-out hover:bg-muted/40"
        >
          <ArrowLeftIcon size={18} weight="bold" aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-col leading-tight">
          <h1 className="text-2xl">Receipts</h1>
          <span className="text-sm text-muted-foreground">
            {receipts.length} {receipts.length === 1 ? "slip" : "slips"} kept
          </span>
        </div>
        <Link
          href="/scan/receipt"
          transitionTypes={NAV_FORWARD}
          className="ml-auto flex h-11 items-center gap-2 rounded-full bg-terracotta px-4.5 text-sm font-semibold text-accent-foreground shadow-[0_3px_0_#9A4F37] transition-[transform,background-color] duration-150 ease-out hover:bg-terracotta/85 active:translate-y-px"
        >
          <ReceiptIcon size={20} weight="duotone" aria-hidden />
          Scan receipt
        </Link>
      </header>

      {memories.isSuccess && receipts.length === 0 && (
        <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-8 text-center animate-in fade-in duration-300">
          <ReceiptSketch className="h-32 opacity-80" />
          <h2 className="text-lg">No receipts yet</h2>
          <p className="text-sm text-muted-foreground">
            Scan one after your next shop and it will be pinned here as a little memory.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-6 gap-y-8 px-2 pt-2">
        {receipts.map((receipt, index) => (
          <ReceiptPolaroid key={receipt.id} receipt={receipt} order={index} />
        ))}
      </ul>
      <Toasts />
    </div>
  );
};
