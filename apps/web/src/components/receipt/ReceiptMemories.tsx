"use client";

import Link from "next/link";
import { ArrowLeftIcon, ReceiptIcon } from "@phosphor-icons/react";
import { Toasts } from "@/components/pantry/Toasts";
import { NAV_BACK, NAV_FORWARD } from "@/lib/page-transitions";
import { useReceiptMemories } from "@/lib/receipt/store";
import { ReceiptPolaroid } from "./ReceiptPolaroid";

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
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border"
        >
          <ArrowLeftIcon size={18} weight="bold" aria-hidden />
        </Link>
        <h1 className="text-2xl">Receipts</h1>
        <span className="text-sm text-muted-foreground">
          {receipts.length} {receipts.length === 1 ? "slip" : "slips"} kept
        </span>
        <Link
          href="/scan/receipt"
          transitionTypes={NAV_FORWARD}
          className="ml-auto flex h-11 items-center gap-2 rounded-full bg-terracotta px-4.5 text-sm font-semibold text-accent-foreground shadow-[0_3px_0_#9A4F37] transition-transform duration-150 ease-out active:translate-y-px"
        >
          <ReceiptIcon size={20} weight="duotone" aria-hidden />
          Scan receipt
        </Link>
      </header>

      {memories.isSuccess && receipts.length === 0 && (
        <p className="mx-auto mt-16 max-w-sm text-center text-muted-foreground">
          No receipts yet. Scan one after your next shop and it will be pinned
          here as a little memory.
        </p>
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
