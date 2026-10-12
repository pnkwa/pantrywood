"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import type { ReceiptLine } from "@pantrywood/shared";
import { AmountStepper, FieldSelect } from "@/components/scan/fields";
import { ProductForm } from "@/components/scan/ProductForm";
import { PANEL_SPRING } from "@/lib/motion";
import { formatMoney, formatNumber } from "@/lib/pantry/format";
import type { GrocyPlace } from "@/lib/pantry/model";
import { normalizeReceiptName, type MatchHow } from "@/lib/receipt/match";

export type LineChoice = {
  productId: number | null;
  how: MatchHow | "picked" | "skipped";
  candidateIds: number[];
  amount: number;
};

export type ReviewProduct = {
  id: number;
  name: string;
  thaiName: string;
  placeName: string;
  stockAmount: number;
  unitFor: (count: number) => string;
};

export const needsYou = (choice: LineChoice) =>
  choice.how === "guess" || choice.how === "none";

const NOTES: Record<LineChoice["how"], string> = {
  remembered: "Remembered match",
  name: "Matched by name",
  guess: "Best guess",
  picked: "Your pick",
  none: "Not matched yet",
  skipped: "Won't be added",
};

const AVATAR_TINTS = ["#F3E7CF", "#EADFC9", "#F3EEE4", "#E1ECEE"];
const SKIP_VALUE = "skip";

type ReceiptLineCardProps = {
  number: number;
  line: ReceiptLine;
  choice: LineChoice;
  currency: string;
  added: boolean;
  open: boolean;
  products: ReadonlyMap<number, ReviewProduct>;
  places: GrocyPlace[];
  onToggle: () => void;
  onChange: (choice: LineChoice) => void;
};

const SKIP_OPTION = { value: SKIP_VALUE, label: "Don't add this line" };

/**
 * One receipt line. The header row is the same open or closed; only the details below it
 * fade in and out while the card and its neighbours glide to their new size (Motion layout).
 */
export const ReceiptLineCard = ({
  number,
  line,
  choice,
  currency,
  added,
  open,
  products,
  places,
  onToggle,
  onChange,
}: ReceiptLineCardProps) => {
  const detailsId = useId();
  const [creating, setCreating] = useState(false);
  const product = choice.productId === null ? undefined : products.get(choice.productId);
  const honey = needsYou(choice);
  const skipped = choice.how === "skipped";
  const options = [
    ...new Set([...(choice.productId === null ? [] : [choice.productId]), ...choice.candidateIds]),
  ]
    .slice(0, 3)
    .flatMap((id) => products.get(id) ?? []);

  const pick = (productId: number | null) => {
    onChange({ ...choice, productId, how: productId === null ? "skipped" : "picked" });
    setCreating(false);
  };

  const title = honey && open ? "Which item is this?" : (product?.name ?? (skipped ? "Skipped" : "Pick an item"));

  return (
    <motion.li
      layout
      transition={PANEL_SPRING}
      style={{ borderRadius: 20 }}
      className={`shrink-0 overflow-hidden border-[1.5px] transition-colors duration-150 ease-out ${
        honey
          ? "border-honey bg-status-soon/60"
          : open
            ? "border-sage-deep bg-card"
            : "border-border bg-[#FFFDF8] dark:bg-card"
      } ${(added || skipped) && !open ? "opacity-60" : ""}`}
    >
      <motion.button
        layout="position"
        transition={PANEL_SPRING}
        type="button"
        disabled={added}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailsId}
        aria-label={`Line ${number}, ${line.name}: ${product?.name ?? "no product yet"}`}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 ease-out enabled:hover:bg-black/[0.025] dark:enabled:hover:bg-white/[0.04]"
      >
        <span
          aria-hidden
          className={`flex size-6.5 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-primary-foreground ${
            honey ? "bg-[#C8901F]" : skipped ? "bg-muted-foreground" : "bg-sage-deep"
          }`}
        >
          {added ? <CheckIcon size={14} weight="bold" /> : number}
        </span>
        <span
          aria-hidden
          style={{ backgroundColor: AVATAR_TINTS[number % AVATAR_TINTS.length] }}
          className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-base font-semibold text-[#4A3B2E]"
        >
          {(product?.name ?? line.name_en ?? line.name).slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] text-muted-foreground">{line.name}</span>
          <span className="truncate text-base font-semibold">{title}</span>
          <span className={`text-xs ${honey ? "text-status-soon-foreground" : "text-status-fresh-foreground"}`}>
            {added ? "Added to stock" : NOTES[choice.how]}
          </span>
        </span>
        {product && !skipped && (
          <span className="tabular hidden h-8.5 shrink-0 items-center rounded-full bg-muted px-3 text-[13px] font-semibold sm:inline-flex">
            {formatNumber(choice.amount)} {product.unitFor(choice.amount)}
          </span>
        )}
        <span className="tabular w-20 shrink-0 text-right text-[15px] font-semibold">
          {formatMoney(line.line_total, currency)}
        </span>
        {!added && (
          <CaretDownIcon
            size={16}
            weight="bold"
            aria-hidden
            className={`shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        )}
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="details"
            id={detailsId}
            layout="position"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { ...PANEL_SPRING, delay: 0.05 } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
            className="flex flex-col gap-3 px-3.5 pb-3.5"
          >
            {creating ? (
              <div className="rounded-lg bg-card p-3">
                <ProductForm
                  suggestedName={line.name_en ?? line.name}
                  suggestedThaiName={/\p{Script=Thai}/u.test(line.name) ? normalizeReceiptName(line.name) : ""}
                  suggestedSupply={line.kind === "supply"}
                  suggestedGroupName={line.suggested_group}
                  places={places}
                  onCancel={() => setCreating(false)}
                  onCreated={pick}
                />
              </div>
            ) : (
              <>
                <div role="radiogroup" aria-label="Pick the matching item" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={option.id === choice.productId}
                      onClick={() => pick(option.id)}
                      className={`flex min-h-14 flex-col justify-center rounded-[14px] bg-card px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-muted/40 ${
                        option.id === choice.productId ? "border-2 border-sage-deep" : "border-[1.5px] border-border"
                      }`}
                    >
                      <span className="text-sm font-semibold">{option.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.id === choice.productId && choice.how === "guess" ? "Best guess · " : ""}
                        {option.placeName}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex min-h-14 items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-sage px-3 text-sm font-semibold text-sage-deep transition-colors duration-150 ease-out hover:bg-status-fresh/50"
                  >
                    + New product
                  </button>
                </div>
                <div className="flex min-h-11 items-center gap-2 text-sm">
                  <span className="shrink-0 text-muted-foreground">Something else</span>
                  <FieldSelect
                    value={skipped ? SKIP_VALUE : choice.productId === null ? "" : String(choice.productId)}
                    onChange={(value) => pick(value === SKIP_VALUE ? null : Number(value))}
                    placeholder="Choose a product…"
                    className="h-11 flex-1 rounded-full border-[1.5px] border-border bg-card px-4 font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    options={[
                      ...[...products.values()].map((option) => ({
                        value: String(option.id),
                        label: option.name,
                        keywords: option.thaiName ? [option.thaiName] : [],
                      })),
                      SKIP_OPTION,
                    ]}
                  />
                </div>
                {product && !skipped && (
                  <div className="flex flex-col gap-2">
                    <AmountStepper
                      label="Amount"
                      value={choice.amount}
                      unit={product.unitFor(choice.amount)}
                      min={Math.min(1, choice.amount)}
                      onChange={(amount) => onChange({ ...choice, amount })}
                    />
                    <span className="text-[13px] text-muted-foreground">
                      {product.placeName}: {formatNumber(product.stockAmount)} →{" "}
                      <b className="text-status-fresh-foreground">
                        {formatNumber(product.stockAmount + choice.amount)}{" "}
                        {product.unitFor(product.stockAmount + choice.amount)}
                      </b>
                    </span>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};
