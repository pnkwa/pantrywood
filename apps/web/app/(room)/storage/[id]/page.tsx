import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OpenPiece } from "@/components/inside/OpenPiece";

// Which piece is runtime data (only known per request), so it's read inside Suspense.
const Piece = async ({ params }: { params: Promise<{ id: string }> }) => {
  const locationId = Number((await params).id);
  if (!Number.isInteger(locationId) || locationId <= 0) notFound();
  return <OpenPiece locationId={locationId} />;
};

const Storage = ({ params }: PageProps<"/storage/[id]">) => (
  <Suspense fallback={null}>
    <Piece params={params} />
  </Suspense>
);

export default Storage;
