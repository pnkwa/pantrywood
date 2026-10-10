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
import { FIELD_INPUT_CLASS, FieldTile, PrimaryButton } from "./fields";

const DEFAULT_SHELF_LIFE_DAYS = 7;
const supplyGroupNames = new Set(SUPPLY_GROUP_NAMES.map((name) => name.toLowerCase()));

type ProductFormProps = {
  barcode: string;
  suggestedName: string;
  places: GrocyPlace[];
  onCancel: () => void;
  onCreated: () => void;
};

export const ProductForm = ({
  barcode,
  suggestedName,
  places,
  onCancel,
  onCreated,
}: ProductFormProps) => {
  const productGroups = useProductGroups();
  const quantityUnits = useQuantityUnits();
  const createProduct = useCreateProduct();
  const showToast = useUiStore((state) => state.showToast);

  const [name, setName] = useState(suggestedName);
  const [thaiName, setThaiName] = useState("");
  const [isSupply, setIsSupply] = useState(false);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState<number | null>(places[0]?.id ?? null);
  const [shelfLifeDays, setShelfLifeDays] = useState(DEFAULT_SHELF_LIFE_DAYS);
  const [minStock, setMinStock] = useState(0);

  const groups = (productGroups.data ?? []).filter(
    (group) => supplyGroupNames.has(group.name.toLowerCase()) === isSupply,
  );
  const units = quantityUnits.data ?? [];
  const chosenUnitId = unitId ?? units[0]?.id ?? null;
  const canSave = name.trim() !== "" && chosenUnitId !== null && placeId !== null;

  const save = () => {
    if (chosenUnitId === null || placeId === null) return;
    createProduct.mutate(
      {
        name: name.trim(),
        thaiName: thaiName.trim(),
        productGroupId: groupId,
        locationId: placeId,
        quantityUnitId: chosenUnitId,
        bestBeforeDays: isSupply ? -1 : shelfLifeDays,
        minStock,
        barcode,
      },
      {
        onSuccess: () => {
          showToast(`${name.trim()} is in Grocy now`);
          onCreated();
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
        if (canSave) save();
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
                : "font-medium text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FieldTile label="Group">
          <select
            value={groupId ?? ""}
            onChange={(event) => setGroupId(event.target.value ? Number(event.target.value) : null)}
            className={FIELD_INPUT_CLASS}
          >
            <option value="">—</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </FieldTile>
        <FieldTile label="Unit">
          <select
            value={chosenUnitId ?? ""}
            onChange={(event) => setUnitId(Number(event.target.value))}
            className={FIELD_INPUT_CLASS}
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </FieldTile>
        <FieldTile label="Lives in">
          <select
            value={placeId ?? ""}
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
