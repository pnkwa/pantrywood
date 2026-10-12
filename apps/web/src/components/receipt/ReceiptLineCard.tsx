"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import type { ReceiptLine } from "@pantrywood/shared";
import { AmountStepper } from "@/components/scan/fields";
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
  products: ReadonlyMap<number, ReviewProduct>;
  places: GrocyPlace[];
  onChange: (choice: LineChoice) => void;
};

export const ReceiptLineCard = ({
  number,
  line,
  choice,
  currency,
  added,
  products,
  places,
  onChange,
}: ReceiptLineCardProps) => {
  const [open, setOpen] = useState(needsYou(choice));
  const [creating, setCreating] = useState(false);
  const product =
    choice.productId === null ? undefined : products.get(choice.productId);
  const honey = needsYou(choice);
  const options = [
    ...new Set([
      ...(choice.productId === null ? [] : [choice.productId]),
      ...choice.candidateIds,
    ]),
  ]
    .slice(0, 3)
    .flatMap((id) => products.get(id) ?? []);

  const pick = (productId: number | null) => {
    onChange({
      ...choice,
      productId,
      how: productId === null ? "skipped" : "picked",
    });
    setCreating(false);
    setOpen(false);
  };

  const badge = (
    <span
      aria-hidden
      className={`flex size-6.5 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-primary-foreground ${
        honey
          ? "bg-[#C8901F]"
          : choice.how === "skipped"
            ? "bg-muted-foreground"
            : "bg-sage-deep"
      }`}
    >
      {added ? <CheckIcon size={14} weight="bold" /> : number}
    </span>
  );
  const price = (
    <span className="tabular w-20 shrink-0 text-right text-[15px] font-semibold">
      {formatMoney(line.line_total, currency)}
    </span>
  );

  if (!open) {
    return (
      <motion.li
        layout="position"
        transition={PANEL_SPRING}
        className={`flex items-center gap-3 rounded-[18px] border-[1.5px] bg-[#FFFDF8] px-3.5 py-3 dark:bg-card ${
          honey ? "border-honey" : "border-border"
        } ${added || choice.how === "skipped" ? "opacity-60" : ""}`}
      >
        {badge}
        <span
          aria-hidden
          style={{
            backgroundColor: AVATAR_TINTS[number % AVATAR_TINTS.length],
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-base font-semibold text-[#4A3B2E]"
        >
          {(product?.name ?? line.name).slice(0, 1)}
        </span>
        <button
          type="button"
          disabled={added}
          onClick={() => setOpen(true)}
          aria-label={`Line ${number}, ${line.name}: ${product?.name ?? "no product"}. Change the match`}
          className="flex min-h-11 min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
        >
          <span className="truncate text-[13px] text-muted-foreground">
            {line.name}
          </span>
          <span className="flex items-center gap-1.5 text-base font-semibold">
            <span className="truncate">
              {product?.name ??
                (choice.how === "skipped" ? "Skipped" : "Pick an item")}
            </span>
            {!added && (
              <CaretDownIcon
                size={14}
                weight="bold"
                className="shrink-0 text-muted-foreground"
                aria-hidden
              />
            )}
          </span>
          <span
            className={`text-xs ${honey ? "text-status-soon-foreground" : "text-status-fresh-foreground"}`}
          >
            {added ? "Added to stock" : NOTES[choice.how]}
          </span>
        </button>
        {product && (
          <span className="tabular hidden h-8.5 shrink-0 items-center rounded-full bg-muted px-3 text-[13px] font-semibold sm:inline-flex">
            {formatNumber(choice.amount)} {product.unitFor(choice.amount)}
          </span>
        )}
        {price}
      </motion.li>
    );
  }

  return (
    <motion.li
      layout="position"
      transition={PANEL_SPRING}
      className={`flex flex-col gap-3 rounded-[20px] border-2 p-3.5 ${
        honey ? "border-honey bg-status-soon/60" : "border-sage-deep bg-card"
      }`}
    >
      <div className="flex items-center gap-3">
        {badge}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] text-muted-foreground">
            {line.name}
          </span>
          <span className="text-base font-semibold">
            {honey ? "Which item is this?" : (product?.name ?? "Pick an item")}
          </span>
        </span>
        {price}
      </div>

      {creating ? (
        <div className="rounded-lg bg-card p-3">
          <ProductForm
            suggestedName={line.name_en ?? line.name}
            suggestedThaiName={
              /\p{Script=Thai}/u.test(line.name)
                ? normalizeReceiptName(line.name)
                : ""
            }
            suggestedSupply={line.kind === "supply"}
            suggestedGroupName={line.suggested_group}
            places={places}
            onCancel={() => setCreating(false)}
            onCreated={pick}
          />
        </div>
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label="Pick the matching item"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={option.id === choice.productId}
                onClick={() => pick(option.id)}
                className={`flex min-h-14 flex-col justify-center rounded-[14px] bg-card px-3 py-2.5 text-left transition-colors duration-150 ease-out ${
                  option.id === choice.productId
                    ? "border-2 border-sage-deep"
                    : "border-[1.5px] border-border"
                }`}
              >
                <span className="text-sm font-semibold">{option.name}</span>
                <span className="text-xs text-muted-foreground">
                  {option.id === choice.productId && choice.how === "guess"
                    ? "Best guess · "
                    : ""}
                  {option.placeName}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-14 items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-sage px-3 text-sm font-semibold text-sage-deep"
            >
              + New product
            </button>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <span className="text-muted-foreground">Something else</span>
            <select
              value={
                choice.how === "skipped" ? SKIP_VALUE : (choice.productId ?? "")
              }
              onChange={(event) =>
                pick(
                  event.target.value === SKIP_VALUE || event.target.value === ""
                    ? null
                    : Number(event.target.value),
                )
              }
              className="h-11 min-w-0 flex-1 rounded-full border-[1.5px] border-border bg-card px-3 font-semibold"
            >
              <option value="" disabled>
                Choose a product…
              </option>
              {[...products.values()].map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
              <option value={SKIP_VALUE}>Don&apos;t add this line</option>
            </select>
          </label>
          {product && (
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
          {!honey && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 self-end rounded-full px-4 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Done
            </button>
          )}
        </>
      )}
    </motion.li>
  );
};
