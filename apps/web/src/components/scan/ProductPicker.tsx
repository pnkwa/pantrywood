"use client";

import { useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { THAI_NAME_USERFIELD } from "@pantrywood/shared";
import { useLinkBarcode, useProducts } from "@/lib/grocy";
import { useUiStore } from "@/lib/store/ui-store";

const MAX_RESULTS = 8;

type ProductPickerProps = {
  title: string;
  barcode: string;
  /** Moves the barcode off the product it was wrongly linked to. */
  replaceBarcodeId?: number;
  onCancel: () => void;
  onLinked: () => void;
};

export const ProductPicker = ({
  title,
  barcode,
  replaceBarcodeId,
  onCancel,
  onLinked,
}: ProductPickerProps) => {
  const products = useProducts();
  const linkBarcode = useLinkBarcode();
  const showToast = useUiStore((state) => state.showToast);
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const matches = (products.data ?? [])
    .filter((product) => product.active === 1)
    .filter(
      (product) =>
        !search ||
        product.name.toLowerCase().includes(search) ||
        (product.userfields?.[THAI_NAME_USERFIELD] ?? "").includes(search),
    )
    .slice(0, MAX_RESULTS);

  const link = (productId: number, productName: string) =>
    linkBarcode.mutate(
      { productId, barcode, replaceBarcodeId },
      {
        onSuccess: () => {
          showToast(`Barcode linked to ${productName}`);
          onLinked();
        },
        onError: (error) => showToast(error.message, "error"),
      },
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <label className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-border bg-muted px-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring">
        <MagnifyingGlassIcon size={16} className="text-muted-foreground" aria-hidden />
        <span className="sr-only">Find a product</span>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a product… eggs, ไข่"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
      <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
        {matches.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              disabled={linkBarcode.isPending}
              onClick={() => link(product.id, product.name)}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-[1.5px] border-border bg-card px-3 py-2 text-left text-sm transition-colors duration-150 ease-out hover:bg-muted disabled:opacity-60"
            >
              <span className="font-semibold">{product.name}</span>
              <span className="text-muted-foreground">
                {product.userfields?.[THAI_NAME_USERFIELD]}
              </span>
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            No product called “{query.trim()}”.
          </li>
        )}
      </ul>
    </div>
  );
};
