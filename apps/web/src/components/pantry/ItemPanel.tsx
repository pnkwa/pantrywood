"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowsLeftRightIcon,
  ForkKnifeIcon,
  type Icon,
  JarIcon,
  PlusIcon,
  ShoppingCartSimpleIcon,
} from "@phosphor-icons/react";
import { ItemPictureField } from "@/components/inside/ItemPictureField";
import { useStockAction, type StockAction } from "@/lib/grocy";
import type { PantryItem } from "@/lib/pantry/model";
import { formatAmount, formatDate, formatDaysLeft } from "@/lib/pantry/format";
import { PANEL_SPRING } from "@/lib/motion";
import { useUiStore } from "@/lib/store/ui-store";
import { AnimatedNumber } from "./AnimatedNumber";
import { FadeIn } from "./FadeIn";
import { ItemIconTile } from "./ItemRow";
import { CloseButton } from "./StoragePanel";
import { FreezerTag, StatusChip } from "./StatusChip";

type Destination = { id: number; name: string };

type ItemPanelProps = {
  item: PantryItem;
  locationName: string;
  destinations: Destination[];
  /** Where it stands inside the open storage piece, with a way to move it there. */
  spot?: ReactNode;
  onBack: () => void;
  onClose: () => void;
};

type ActionButtonProps = {
  icon: Icon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  expanded?: boolean;
};

const ActionButton = ({
  icon: ActionIcon,
  label,
  onClick,
  disabled,
  primary,
  expanded,
}: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-expanded={expanded}
    className={`flex h-12 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-[transform,background-color] duration-150 ease-out active:translate-y-px disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring ${
      primary
        ? "bg-primary text-primary-foreground shadow-[0_2px_0_var(--sage-deep)] hover:bg-primary/85"
        : "border-[1.5px] border-border bg-muted hover:bg-oat/30"
    }`}
  >
    <ActionIcon size={18} weight="duotone" aria-hidden />
    {label}
  </button>
);

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[1.5px] border-dashed border-border py-2.5 last:border-b-0">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-right text-[15px] font-medium">{children}</dd>
  </div>
);

export const ItemPanel = ({
  item,
  locationName,
  destinations,
  spot,
  onBack,
  onClose,
}: ItemPanelProps) => {
  const stockAction = useStockAction();
  const showToast = useUiStore((state) => state.showToast);
  const [moving, setMoving] = useState(false);
  const isFood = item.kind === "food";
  const inStock = item.amount > 0;
  const firstClosedEntry = item.entries.find((entry) => entry.open === 0);

  const run = (action: StockAction, successMessage: string) =>
    stockAction.mutate(action, {
      onSuccess: () => showToast(successMessage),
      onError: (error) => showToast(error.message, "error"),
    });

  const consumeLabel = isFood ? "Eat one" : "Use one";

  return (
    <div className="-mx-1 flex h-full flex-col gap-4 overflow-y-auto px-1">
      <FadeIn className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-sage-deep transition-colors duration-150 ease-out hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeftIcon size={16} weight="bold" aria-hidden />
          {locationName}
        </button>
        <CloseButton label="Close panel" onClick={onClose} />
      </FadeIn>

      <div className="flex items-start gap-4">
        <ItemIconTile item={item} size="large" />
        <FadeIn order={1} className="min-w-0 flex-1">
          <h2 className="text-[26px] leading-tight">{item.name}</h2>
          {item.thaiName && (
            <p className="mt-0.5 text-[15px] text-muted-foreground">
              {item.thaiName}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusChip item={item} />
            {item.inFreezer && <FreezerTag />}
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {isFood ? "Food" : "Supply"}
            </span>
          </div>
        </FadeIn>
      </div>

      <FadeIn order={2}>
      <dl className="rounded-lg border-[1.5px] border-border bg-[#FFFDF8] px-4 dark:bg-card">
        <Fact label="Amount here">
          <AnimatedNumber value={item.amount} /> {item.amount === 1 ? item.unitName : item.unitPlural}
        </Fact>
        {isFood && item.bestBefore && item.daysLeft !== null && (
          <Fact label="Best before">
            {formatDate(item.bestBefore)}{" "}
            <span className="text-muted-foreground">
              ({formatDaysLeft(item.daysLeft)})
            </span>
          </Fact>
        )}
        {item.amountOpened > 0 && (
          <Fact label="Opened">{formatAmount(item, item.amountOpened)}</Fact>
        )}
        <Fact label="Where">
          {item.inFreezer ? `${locationName} · freezer` : locationName}
        </Fact>
        {item.minStock > 0 && (
          <Fact label="Keep at least">
            {formatAmount(item, item.minStock)}
          </Fact>
        )}
      </dl>
      </FadeIn>

      <FadeIn order={2} className="flex flex-col gap-3">
        {spot}
        <ItemPictureField item={item} />
      </FadeIn>

      <FadeIn order={3} className="mt-auto grid grid-cols-2 gap-2.5">
        <ActionButton
          icon={ForkKnifeIcon}
          label={consumeLabel}
          primary
          disabled={!inStock || stockAction.isPending}
          onClick={() =>
            run(
              {
                type: "consume",
                productId: item.productId,
                amount: 1,
                locationId: item.locationId,
              },
              `${isFood ? "Ate" : "Used"} 1 · ${item.name}`,
            )
          }
        />
        {isFood ? (
          <ActionButton
            icon={JarIcon}
            label="Open"
            disabled={!firstClosedEntry || stockAction.isPending}
            onClick={() =>
              run(
                {
                  type: "open",
                  productId: item.productId,
                  amount: 1,
                  stockEntryId: firstClosedEntry?.stock_id,
                },
                `Opened 1 · ${item.name}`,
              )
            }
          />
        ) : (
          <ActionButton
            icon={ShoppingCartSimpleIcon}
            label="Add to list"
            disabled={stockAction.isPending}
            onClick={() =>
              run(
                {
                  type: "addToShoppingList",
                  productId: item.productId,
                  amount: Math.max(1, item.minStock - item.totalAmount),
                },
                `${item.name} is on the shopping list`,
              )
            }
          />
        )}
        <ActionButton
          icon={ArrowsLeftRightIcon}
          label="Move"
          expanded={moving}
          disabled={!inStock || destinations.length === 0}
          onClick={() => setMoving((open) => !open)}
        />
        <ActionButton
          icon={PlusIcon}
          label="Add more"
          disabled={stockAction.isPending}
          onClick={() =>
            run(
              {
                type: "add",
                productId: item.productId,
                amount: 1,
                locationId: item.locationId,
              },
              `Added 1 · ${item.name}`,
            )
          }
        />
      </FadeIn>

      <AnimatePresence initial={false}>
        {moving && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={PANEL_SPRING}
          >
            <p className="mb-2 text-sm text-muted-foreground">
              Move all {formatAmount(item)} to…
            </p>
            <ul className="flex flex-wrap gap-2">
              {destinations.map((destination) => (
                <li key={destination.id}>
                  <button
                    type="button"
                    disabled={stockAction.isPending}
                    onClick={() => {
                      setMoving(false);
                      run(
                        {
                          type: "transfer",
                          productId: item.productId,
                          amount: item.amount,
                          fromLocationId: item.locationId,
                          toLocationId: destination.id,
                        },
                        `Moved ${item.name} to ${destination.name}`,
                      );
                    }}
                    className="h-11 rounded-full border-[1.5px] border-border bg-card px-4 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40 disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {destination.name}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
