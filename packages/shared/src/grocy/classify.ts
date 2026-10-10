import type { Product, ProductGroup } from "./schemas";

export type ProductKind = "food" | "supply";

export const SUPPLY_GROUP_NAMES: readonly string[] = [
  "Bathroom",
  "Cleaning",
  "Laundry",
  "Paper goods",
  "Household",
  "Maker supplies",
];

const supplyGroupNames = new Set(
  SUPPLY_GROUP_NAMES.map((name) => name.toLowerCase()),
);

export const classifyProduct = (
  product: Pick<Product, "product_group_id" | "default_best_before_days">,
  groups: readonly Pick<ProductGroup, "id" | "name">[],
): ProductKind => {
  const group = groups.find(
    (candidate) => candidate.id === product.product_group_id,
  );
  if (group)
    return supplyGroupNames.has(group.name.trim().toLowerCase())
      ? "supply"
      : "food";
  return product.default_best_before_days === -1 ? "supply" : "food";
};
