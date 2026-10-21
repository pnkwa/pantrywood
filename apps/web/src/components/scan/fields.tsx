"use client";

import type { ReactNode } from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

const TILE_CLASS =
  "flex min-h-14 cursor-pointer flex-col gap-0.5 rounded-md border-[1.5px] border-border bg-card px-3 py-2 transition-colors duration-150 ease-out hover:border-sage/60 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring";

export const FieldTile = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className={TILE_CLASS}>
    <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
    {children}
  </label>
);

export const FIELD_INPUT_CLASS =
  "w-full min-w-0 bg-transparent text-sm font-semibold text-foreground outline-none";

type StepperProps = {
  label: string;
  value: number;
  unit: string;
  min: number;
  onChange: (value: number) => void;
};

export const AmountStepper = ({ label, value, unit, min, onChange }: StepperProps) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm font-semibold">{label}</span>
    <div role="group" aria-label={label} className="flex items-center gap-0.5 rounded-full bg-muted p-1">
      <button
        type="button"
        aria-label="Less"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-11 items-center justify-center rounded-full bg-card text-lg font-semibold transition-[transform,background-color] duration-150 ease-out hover:bg-oat/25 active:scale-95 disabled:opacity-40"
      >
        −
      </button>
      <span className="tabular min-w-20 text-center text-base font-semibold">
        {value} {unit}
      </span>
      <button
        type="button"
        aria-label="More"
        onClick={() => onChange(value + 1)}
        className="flex size-11 items-center justify-center rounded-full bg-card text-lg font-semibold transition-[transform,background-color] duration-150 ease-out hover:bg-oat/25 active:scale-95"
      >
        +
      </button>
    </div>
  </div>
);

export const PrimaryButton = ({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="h-13 w-full rounded-full bg-sage-deep px-5 text-base font-semibold text-primary-foreground shadow-[0_3px_0_#3F5236] transition-[transform,background-color] duration-150 ease-out hover:bg-sage-deep/85 active:translate-y-px disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    {children}
  </button>
);

/** The value of a "nothing picked" option, such as Shop: —. */
export const NO_CHOICE = "none";

type FieldSelectProps = {
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/** A searchable dropdown in place of a native <select>; `value` "" shows the placeholder. */
export const FieldSelect = ({ className = FIELD_INPUT_CLASS, ...props }: FieldSelectProps) => (
  <Combobox className={className} {...props} />
);
