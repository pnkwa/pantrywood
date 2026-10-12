import { ReceiptIcon } from "@phosphor-icons/react";
import type { ReceiptMemory } from "@pantrywood/shared";
import { formatDate, formatMoney } from "@/lib/pantry/format";

const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

const dateLabel = (date: string | null) =>
  date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDate(date) : "No date";

export const ReceiptPolaroid = ({
  receipt,
  order,
}: {
  receipt: ReceiptMemory;
  order: number;
}) => (
  <li
    className={`${TILTS[order % TILTS.length]} flex flex-col gap-2 rounded-[6px] bg-[#FFFDF8] p-3 pb-4 shadow-paper transition-transform duration-150 ease-out animate-in fade-in slide-in-from-bottom-2 hover:-translate-y-1 hover:rotate-0 motion-reduce:slide-in-from-bottom-0 dark:bg-card`}
  >
    <div className="aspect-3/4 overflow-hidden rounded-[3px] bg-muted">
      {receipt.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- a stored data URL, nothing to optimize
        <img
          src={receipt.image}
          alt={`Receipt from ${receipt.store ?? "a shop"}`}
          className="size-full object-cover object-top"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground">
          <ReceiptIcon size={40} weight="duotone" aria-hidden />
        </span>
      )}
    </div>
    <span className="-rotate-1 truncate text-base font-semibold italic">
      {receipt.store ?? "A shop"}
    </span>
    <span className="tabular -mt-1.5 -rotate-1 text-[13px] text-muted-foreground italic">
      {dateLabel(receipt.date)} ·{" "}
      {receipt.total === null
        ? `${receipt.lineCount} lines`
        : formatMoney(receipt.total, receipt.currency)}
    </span>
  </li>
);
