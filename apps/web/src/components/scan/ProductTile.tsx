import { PRODUCT_ICONS, productIconKeyFor } from "@/components/pantry/icons";

export const ProductTile = ({ groupName }: { groupName: string }) => {
  const ProductIcon = PRODUCT_ICONS[productIconKeyFor(groupName)];
  return (
    <span className="flex size-15 shrink-0 items-center justify-center rounded-[16px] bg-background text-muted-foreground">
      <ProductIcon size={30} weight="duotone" aria-hidden />
    </span>
  );
};
