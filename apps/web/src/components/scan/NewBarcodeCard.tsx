"use client";

import { useState } from "react";
import { z } from "zod";
import { ProductForm } from "./ProductForm";
import { ProductPicker } from "./ProductPicker";

const OnlineProductSchema = z.object({
  status: z.number(),
  product: z
    .object({
      product_name: z.string().optional(),
      product_name_en: z.string().optional(),
    })
    .optional(),
});

/** Open Food Facts: free and open, only asked when the user taps "Look up online". */
const lookUpOnline = async (barcode: string) => {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_en`,
  );
  if (!response.ok) return null;
  const parsed = OnlineProductSchema.safeParse(await response.json());
  if (!parsed.success || parsed.data.status !== 1) return null;
  return parsed.data.product?.product_name_en || parsed.data.product?.product_name || null;
};

type Step = "choose" | "create" | "link";

const UnknownBarcodeIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5M11 8v3M11 14h.01" />
  </svg>
);

type NewBarcodeCardProps = {
  barcode: string;
};

export const NewBarcodeCard = ({ barcode }: NewBarcodeCardProps) => {
  const [step, setStep] = useState<Step>("choose");
  const [suggestedName, setSuggestedName] = useState("");
  const [lookup, setLookup] = useState<"idle" | "looking" | "not-found">("idle");

  const lookUp = async () => {
    setLookup("looking");
    const name = await lookUpOnline(barcode).catch(() => null);
    if (name) {
      setSuggestedName(name);
      setLookup("idle");
      setStep("create");
    } else {
      setLookup("not-found");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-honey bg-status-soon/60 p-3.5">
      {step === "choose" && (
        <>
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-card text-status-soon-foreground">
              <UnknownBarcodeIcon />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-semibold">New barcode</span>
              <span className="tabular truncate text-[13px] text-muted-foreground">
                {barcode} · not in Grocy yet
              </span>
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
            <button
              type="button"
              onClick={() => setStep("create")}
              className="h-11 rounded-[14px] bg-sage-deep text-sm font-semibold text-primary-foreground transition-colors duration-150 ease-out hover:bg-sage-deep/85"
            >
              Create product
            </button>
            <button
              type="button"
              onClick={() => setStep("link")}
              className="h-11 rounded-[14px] border-[1.5px] border-border bg-card text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40"
            >
              Link to existing
            </button>
            <button
              type="button"
              disabled={lookup === "looking"}
              onClick={lookUp}
              className="h-11 rounded-[14px] border-[1.5px] border-border bg-card text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 disabled:opacity-60"
            >
              {lookup === "looking" ? "Looking…" : "Look up online"}
            </button>
          </div>
          {lookup === "not-found" && (
            <p className="text-[13px] text-muted-foreground">
              Nothing online for this one — create it by hand.
            </p>
          )}
        </>
      )}
      {step === "create" && (
        <ProductForm
          barcode={barcode}
          suggestedName={suggestedName}
          onCancel={() => setStep("choose")}
          onCreated={() => setStep("choose")}
        />
      )}
      {step === "link" && (
        <ProductPicker
          title="Which product is this?"
          barcode={barcode}
          onCancel={() => setStep("choose")}
          onLinked={() => setStep("choose")}
        />
      )}
    </div>
  );
};
