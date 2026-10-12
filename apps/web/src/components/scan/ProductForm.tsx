"use client";

import { useState } from "react";
import { SUPPLY_GROUP_NAMES } from "@pantrywood/shared";
import {
  useCreateProduct,
  useProductGroups,
  useQuantityUnits,
} from "@/lib/grocy";
import type { GrocyPlace } from "@/lib/pantry/model";
import { useUiStore } from "@/lib/store/ui-store";
import { FIELD_INPUT_CLASS, FieldSelect, FieldTile, NO_CHOICE, PrimaryButton } from "./fields";

const DEFAULT_SHELF_LIFE_DAYS = 7;
const supplyGroupNames = new Set(SUPPLY_GROUP_NAMES.map((name) => name.toLowerCase()));

type ProductFormProps = {
  /** Linked to the new product when given. */
  barcode?: string;
  suggestedName: string;
  suggestedThaiName?: string;
  suggestedSupply?: boolean;
  suggestedGroupName?: string | null;
  places: GrocyPlace[];
  onCancel: () => void;
  onCreated: (productId: number) => void;
};

export const ProductForm = ({
  barcode,
  suggestedName,
  suggestedThaiName = "",
  suggestedSupply = false,
  suggestedGroupName = null,
  places,
  onCancel,
  onCreated,
}: ProductFormProps) => {
  const productGroups = useProductGroups();
  const quantityUnits = useQuantityUnits();
  const createProduct = useCreateProduct();
  const showToast = useUiStore((state) => state.showToast);

  const [name, setName] = useState(suggestedName);
  const [thaiName, setThaiName] = useState(suggestedThaiName);
  const [isSupply, setIsSupply] = useState(suggestedSupply);
  // undefined = not touched yet, so the suggested group shows once groups have loaded.
  const [groupId, setGroupId] = useState<number | null | undefined>(undefined);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState<number | null>(places[0]?.id ?? null);
  const [shelfLifeDays, setShelfLifeDays] = useState(DEFAULT_SHELF_LIFE_DAYS);
  const [minStock, setMinStock] = useState(0);

  const groups = (productGroups.data ?? []).filter(
    (group) => supplyGroupNames.has(group.name.toLowerCase()) === isSupply,
  );
  const chosenGroupId =
    groupId === undefined
      ? (groups.find((group) => group.name.toLowerCase() === suggestedGroupName?.toLowerCase())?.id ?? null)
      : groupId;
  const units = quantityUnits.data ?? [];
  const chosenUnitId = unitId ?? units[0]?.id ?? null;
  const canSave = name.trim() !== "" && chosenUnitId !== null && placeId !== null;

  const save = () => {
    if (chosenUnitId === null || placeId === null) return;
    createProduct.mutate(
      {
        name: name.trim(),
        thaiName: thaiName.trim(),
        productGroupId: chosenGroupId,
        locationId: placeId,
        quantityUnitId: chosenUnitId,
        bestBeforeDays: isSupply ? -1 : shelfLifeDays,
        minStock,
        barcode: barcode ?? "",
      },
      {
        onSuccess: (productId) => {
          showToast(`${name.trim()} is in Grocy now`);
          onCreated(productId);
        },
        onError: (error) => showToast(error.message, "error"),
      },
    );
  };

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave && !createProduct.isPending) save();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">New product</h3>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <FieldTile label="Name">
        <input
          autoFocus
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={FIELD_INPUT_CLASS}
        />
      </FieldTile>
      <FieldTile label="Thai name (optional)">
        <input
          value={thaiName}
          onChange={(event) => setThaiName(event.target.value)}
          className={FIELD_INPUT_CLASS}
        />
      </FieldTile>
      <div role="radiogroup" aria-label="Kind" className="flex gap-1 rounded-full bg-muted p-1">
        {[
          { label: "Food", supply: false },
          { label: "Supply", supply: true },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={isSupply === option.supply}
            onClick={() => {
              setIsSupply(option.supply);
              setGroupId(null);
            }}
            className={`h-11 flex-1 rounded-full text-sm transition-colors duration-150 ease-out ${
              isSupply === option.supply
                ? "bg-card font-semibold shadow-[0_2px_6px_rgba(74,59,46,.12)]"
                : "font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FieldTile label="Group">
          <FieldSelect
            value={chosenGroupId === null ? NO_CHOICE : String(chosenGroupId)}
            onChange={(value) => setGroupId(value === NO_CHOICE ? null : Number(value))}
            options={[
              { value: NO_CHOICE, label: "—" },
              ...groups.map((group) => ({ value: String(group.id), label: group.name })),
            ]}
          />
        </FieldTile>
        <FieldTile label="Unit">
          <FieldSelect
            value={chosenUnitId === null ? "" : String(chosenUnitId)}
            onChange={(value) => setUnitId(Number(value))}
            options={units.map((unit) => ({ value: String(unit.id), label: unit.name }))}
          />
        </FieldTile>
        <FieldTile label="Lives in">
          <FieldSelect
            value={placeId === null ? "" : String(placeId)}
            onChange={(value) => setPlaceId(Number(value))}
            options={places.map((place) => ({ value: String(place.id), label: place.name }))}
          />
        </FieldTile>
        {isSupply ? (
          <FieldTile label="Keep at least">
            <input
              type="number"
              min={0}
              value={minStock}
              onChange={(event) => setMinStock(Number(event.target.value))}
              className={FIELD_INPUT_CLASS}
            />
          </FieldTile>
        ) : (
          <FieldTile label="Keeps for (days)">
            <input
              type="number"
              min={1}
              value={shelfLifeDays}
              onChange={(event) => setShelfLifeDays(Number(event.target.value))}
              className={FIELD_INPUT_CLASS}
            />
          </FieldTile>
        )}
      </div>
      <PrimaryButton disabled={!canSave || createProduct.isPending} onClick={save}>
        Create product
      </PrimaryButton>
    </form>
  );
};
