"use client";

import Link from "next/link";
import { NAV_BACK } from "@/lib/page-transitions";
import { ArrowLeftIcon, PrinterIcon } from "@phosphor-icons/react";
import { THAI_NAME_USERFIELD } from "@pantrywood/shared";
import { Toasts } from "@/components/pantry/Toasts";
import {
  useLinkLabelBarcodes,
  useProductBarcodes,
  useProducts,
} from "@/lib/grocy";
import { labelCodeFor } from "@/lib/scan/code128";
import { useUiStore } from "@/lib/store/ui-store";
import { Code128 } from "./Code128";

const LABEL_PREFIX = "PW";

/** Printable Pantrywood labels for market goods that came without a barcode. */
export const LabelSheet = () => {
  const products = useProducts();
  const barcodes = useProductBarcodes();
  const linkLabels = useLinkLabelBarcodes();
  const showToast = useUiStore((state) => state.showToast);

  const activeProducts = (products.data ?? []).filter((product) => product.active === 1);
  const barcodeRows = barcodes.data ?? [];
  const withoutBarcode = activeProducts.filter(
    (product) => !barcodeRows.some((row) => row.product_id === product.id),
  );
  const labels = activeProducts.flatMap((product) => {
    const label = barcodeRows.find(
      (row) => row.product_id === product.id && row.barcode.startsWith(LABEL_PREFIX),
    );
    return label ? [{ product, code: label.barcode }] : [];
  });

  const makeLabels = () =>
    linkLabels.mutate(
      withoutBarcode.map((product) => ({
        productId: product.id,
        barcode: labelCodeFor(product.id),
      })),
      {
        onSuccess: () =>
          showToast(
            `${withoutBarcode.length} labels ready · they are linked in Grocy`,
          ),
        onError: (error) => showToast(error.message, "error"),
      },
    );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 lg:p-6 print:max-w-none print:p-0">
      <header className="flex flex-wrap items-center gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-3 shadow-paper print:hidden">
        <Link
          href="/scan"
          transitionTypes={NAV_BACK}
          aria-label="Back to scanning"
          className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-border transition-colors duration-150 ease-out hover:bg-muted/40"
        >
          <ArrowLeftIcon size={18} weight="bold" aria-hidden />
        </Link>
        <h1 className="text-2xl">Print labels</h1>
        <button
          type="button"
          disabled={labels.length === 0}
          onClick={() => window.print()}
          className="ml-auto flex h-11 items-center gap-2 rounded-full bg-sage-deep px-5 text-sm font-semibold text-primary-foreground transition-colors duration-150 ease-out hover:bg-sage-deep/85 disabled:opacity-50"
        >
          <PrinterIcon size={18} weight="duotone" aria-hidden />
          Print {labels.length} {labels.length === 1 ? "label" : "labels"}
        </button>
      </header>

      {withoutBarcode.length > 0 && (
        <section className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-honey bg-status-soon/60 p-4 print:hidden">
          <p className="min-w-60 flex-1 text-sm">
            <span className="font-semibold">
              {withoutBarcode.length} products have no barcode
            </span>{" "}
            <span className="text-muted-foreground">
              ({withoutBarcode.slice(0, 3).map((product) => product.name).join(", ")}
              {withoutBarcode.length > 3 ? "…" : ""}). Give each one a Pantrywood code and
              print it; scanning the label works like any barcode.
            </span>
          </p>
          <button
            type="button"
            disabled={linkLabels.isPending}
            onClick={makeLabels}
            className="h-11 rounded-full bg-card px-4 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 disabled:opacity-60"
          >
            Make {withoutBarcode.length} labels
          </button>
        </section>
      )}

      {labels.length === 0 ? (
        <p className="rounded-md border-[1.5px] border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground print:hidden">
          No Pantrywood labels yet.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 print:grid-cols-3 print:gap-2">
          {labels.map(({ product, code }) => (
            <li
              key={code}
              className="flex break-inside-avoid flex-col items-center gap-1 rounded-md border-[1.5px] border-dashed border-border bg-white px-3 py-3 text-[#4A3B2E]"
            >
              <span className="text-sm font-semibold">{product.name}</span>
              <span className="text-xs">{product.userfields?.[THAI_NAME_USERFIELD]}</span>
              <Code128 value={code} />
              <span className="tabular text-xs tracking-widest">{code}</span>
            </li>
          ))}
        </ul>
      )}
      <Toasts />
    </div>
  );
};
