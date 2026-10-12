import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon, XIcon } from "@phosphor-icons/react";
import { PinnedScanHeader } from "@/components/scan/PinnedScanHeader";
import { ScanKindTabs } from "@/components/scan/ScanStation";
import { CLOSE_SCAN } from "@/lib/page-transitions";

/**
 * The scan station's header on every receipt step, so Barcode · Receipt is always one tap away.
 * Below lg it floats over the full-screen photo, exactly like the barcode camera header.
 */
export const ReceiptScanHeader = ({ children }: { children?: ReactNode }) => (
  <PinnedScanHeader>
    <header className="absolute inset-x-4 top-4 z-20 flex flex-col gap-3 lg:static lg:mx-auto lg:w-full lg:max-w-[1240px] lg:flex-row lg:flex-wrap lg:items-center lg:rounded-[22px] lg:border-[1.5px] lg:border-border lg:bg-card lg:px-4 lg:py-3 lg:shadow-paper">
      <div className="flex items-center gap-2 lg:gap-3">
        <Link
          href="/"
          transitionTypes={CLOSE_SCAN}
          aria-label="Back to the storage room"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#2B261F]/60 text-[#F3EADB] transition-colors duration-150 ease-out hover:bg-[#2B261F]/80 lg:border-[1.5px] lg:border-border lg:bg-card lg:text-foreground lg:hover:bg-muted/40"
        >
          <XIcon size={18} weight="bold" className="lg:hidden" aria-hidden />
          <ArrowLeftIcon size={18} weight="bold" className="hidden lg:block" aria-hidden />
        </Link>
        <h1 className="hidden text-2xl lg:block">Scan</h1>
        <ScanKindTabs current="receipt" overCamera />
      </div>
      {children && <div className="hidden gap-2 lg:ml-auto lg:flex">{children}</div>}
    </header>
  </PinnedScanHeader>
);
