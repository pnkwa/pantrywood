"use client";

import { useState } from "react";
import {
  classifyProduct,
  THAI_NAME_USERFIELD,
  toIsoDate,
  type ProductDetails,
} from "@pantrywood/shared";
import {
  useProductGroups,
  useQuantityUnits,
  useShoppingLocations,
  useStockAction,
  type StockAction,
} from "@/lib/grocy";
import { formatDate } from "@/lib/pantry/format";
import type { GrocyPlace } from "@/lib/pantry/model";
import { useScanStore, type ScanMode } from "@/lib/store/scan-store";
import { useUiStore } from "@/lib/store/ui-store";
import { AmountStepper, FIELD_INPUT_CLASS, FieldTile, PrimaryButton } from "./fields";
import { ProductPicker } from "./ProductPicker";
import { ProductTile } from "./ProductTile";

const daysFromToday = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

type ScanResultCardProps = {
  barcode: string;
  details: ProductDetails;
  mode: ScanMode;
  places: GrocyPlace[];
  onDone: () => void;
};

export const ScanResultCard = ({ barcode, details, mode, places, onDone }: ScanResultCardProps) => {
  const { product } = details;
  const productGroups = useProductGroups();
  const quantityUnits = useQuantityUnits();
  const shops = useShoppingLocations();
  const stockAction = useStockAction();
  const showToast = useUiStore((state) => state.showToast);
  const lastLocationId = useScanStore((state) => state.lastLocationId);
  const rememberLocation = useScanStore((state) => state.rememberLocation);
  const addSessionRow = useScanStore((state) => state.addSessionRow);
  const keepScanning = useScanStore((state) => state.keepScanning);
  const setKeepScanning = useScanStore((state) => state.setKeepScanning);

  const matchedBarcode = details.product_barcodes.find((row) => row.barcode === barcode);
  const kind = classifyProduct(product, productGroups.data ?? []);
  const groupName =
    productGroups.data?.find((group) => group.id === product.product_group_id)?.name ?? "";
  const unit = quantityUnits.data?.find((candidate) => candidate.id === product.qu_id_stock);
  const neverExpires = product.default_best_before_days === -1;
  const thaiName = product.userfields?.[THAI_NAME_USERFIELD];

  const defaultAmount = {
    add: matchedBarcode?.amount ?? 1,
    eat: 1,
    check: details.stock_amount,
  }[mode];
  const [amount, setAmount] = useState(defaultAmount);
  const placeIsKnown = places.some((place) => place.id === lastLocationId);
  const [placeId, setPlaceId] = useState(
    placeIsKnown && lastLocationId !== null ? lastLocationId : product.location_id,
  );
  const [bestBefore, setBestBefore] = useState(
    neverExpires || product.default_best_before_days <= 0
      ? ""
      : daysFromToday(product.default_best_before_days),
  );
  const [price, setPrice] = useState("");
  const [shopId, setShopId] = useState(
    details.last_shopping_location_id ?? details.default_shopping_location_id ?? null,
  );
  const [relinking, setRelinking] = useState(false);

  const unitText = (count: number) =>
    (count === 1 ? unit?.name : unit?.name_plural ?? unit?.name) ?? "";
  const placeName = places.find((place) => place.id === placeId)?.name ?? "";
  const addedDetail =
    !neverExpires && bestBefore ? `${placeName} · best before ${formatDate(bestBefore)}` : placeName;
  const unchanged = mode === "check" && amount === details.stock_amount;

  const confirmLabel = {
    add: `Add ${amount} ${unitText(amount)} to ${placeName}`,
    eat: `${kind === "food" ? "Eat" : "Use"} ${amount} ${unitText(amount)}`,
    check: unchanged ? "All correct" : `Set to ${amount} ${unitText(amount)}`,
  }[mode];

  const actionFor = (): StockAction => {
    if (mode === "add") {
      return {
        type: "add",
        productId: product.id,
        amount,
        locationId: placeId,
        bestBeforeDate: neverExpires ? undefined : bestBefore || undefined,
        price: price ? Number(price) : undefined,
        shoppingLocationId: shopId ?? undefined,
      };
    }
    if (mode === "eat") return { type: "consume", productId: product.id, amount };
    return { type: "inventory", productId: product.id, newAmount: amount };
  };

  const confirm = () => {
    if (unchanged) {
      addSessionRow({
        productName: product.name,
        amountText: `${amount} ${unitText(amount)} ✓`,
        detail: "Checked",
        mode,
        transactionId: null,
      });
      onDone();
      return;
    }
    stockAction.mutate(actionFor(), {
      onSuccess: (transactionId) => {
        if (mode === "add") rememberLocation(placeId);
        addSessionRow({
          productName: product.name,
          amountText:
            mode === "add"
              ? `+${amount} ${unitText(amount)}`
              : mode === "eat"
                ? `−${amount} ${unitText(amount)}`
                : `= ${amount} ${unitText(amount)}`,
          detail: mode === "add" ? addedDetail : mode === "eat" ? "Eaten" : "Checked",
          mode,
          transactionId,
        });
        if (typeof navigator.vibrate === "function") navigator.vibrate(20);
        onDone();
      },
      onError: (error) => showToast(error.message, "error"),
    });
  };

  if (relinking) {
    return (
      <ProductPicker
        title="Which product is this barcode?"
        barcode={barcode}
        replaceBarcodeId={matchedBarcode?.id}
        onCancel={() => setRelinking(false)}
        onLinked={() => setRelinking(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <ProductTile groupName={groupName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xl font-semibold tracking-[-0.02em]">
            {product.name}{" "}
            {thaiName && (
              <span className="text-sm font-medium text-muted-foreground">{thaiName}</span>
            )}
          </span>
          <span className="text-[13px] text-muted-foreground">
            You have {details.stock_amount} {unitText(details.stock_amount)}
          </span>
        </div>
        <span className="rounded-full bg-status-fresh px-2.5 py-1 text-xs font-semibold text-status-fresh-foreground">
          Found
        </span>
      </div>

      <AmountStepper
        label={mode === "check" ? "You really have" : "Amount"}
        value={amount}
        unit={unitText(amount)}
        min={mode === "check" ? 0 : 1}
        onChange={setAmount}
      />

      {mode === "add" && (
        <div className="grid grid-cols-2 gap-2">
          <FieldTile label="Put in">
            <select
              value={placeId}
              onChange={(event) => setPlaceId(Number(event.target.value))}
              className={FIELD_INPUT_CLASS}
            >
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          </FieldTile>
          <FieldTile label="Best before">
            {neverExpires ? (
              <span className="text-sm font-semibold">Never expires</span>
            ) : (
              <input
                type="date"
                value={bestBefore}
                onChange={(event) => setBestBefore(event.target.value)}
                className={FIELD_INPUT_CLASS}
              />
            )}
          </FieldTile>
          <FieldTile label="Price (optional)">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              value={price}
              placeholder={details.last_price ? `${details.last_price} ฿ last time` : "฿"}
              onChange={(event) => setPrice(event.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </FieldTile>
          <FieldTile label="Shop">
            <select
              value={shopId ?? ""}
              onChange={(event) =>
                setShopId(event.target.value ? Number(event.target.value) : null)
              }
              className={FIELD_INPUT_CLASS}
            >
              <option value="">—</option>
              {(shops.data ?? []).map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </FieldTile>
        </div>
      )}

      <PrimaryButton disabled={stockAction.isPending} onClick={confirm}>
        {confirmLabel}
      </PrimaryButton>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setRelinking(true)}
          className="h-11 px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Not right?
        </button>
        <label className="inline-flex min-h-11 items-center gap-2 text-[13px] text-muted-foreground">
          <input
            type="checkbox"
            checked={keepScanning}
            onChange={(event) => setKeepScanning(event.target.checked)}
            className="size-[18px] accent-sage-deep"
          />
          Keep scanning
        </label>
      </div>
    </div>
  );
};
