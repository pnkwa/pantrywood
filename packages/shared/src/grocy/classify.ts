import type { Product, ProductGroup } from "./schemas";

export type ProductKind = "food" | "supply";

/**
 * Product groups that hold things you don't eat (DESIGN.md "Food vs. supplies").
 * Matched by name, case-insensitive. Everything else is food.
 */
export const SUPPLY_GROUP_NAMES: readonly string[] = [
  "Bathroom",
  "Cleaning",
  "Laundry",
  "Paper goods",
  "Household",
  "Maker supplies",
];

const supplyGroups = new Set(SUPPLY_GROUP_NAMES.map((name) => name.toLowerCase()));

/**
 * Food is tracked by expiry date and amount; supplies by amount only.
 * The product group decides. Without a group, a product that never expires
 * (default best-before -1) is a supply.
 */
export function classifyProduct(
  product: Pick<Product, "product_group_id" | "default_best_before_days">,
  groups: readonly Pick<ProductGroup, "id" | "name">[],
): ProductKind {
  const group = groups.find((g) => g.id === product.product_group_id);
  if (group) return supplyGroups.has(group.name.trim().toLowerCase()) ? "supply" : "food";
  return product.default_best_before_days === -1 ? "supply" : "food";
}
