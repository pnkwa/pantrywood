import { useMemo } from "react";
import { useRouter } from "next/navigation";

/** Opening or closing a piece is a URL change; `OpenPiece` on `/storage/[id]` does the rest. */
export const useInsideNavigation = () => {
  const router = useRouter();
  return useMemo(
    () => ({
      openInside: (locationId: number) => router.push(`/storage/${locationId}`, { scroll: false }),
      closeInside: () => router.push("/", { scroll: false }),
    }),
    [router],
  );
};
