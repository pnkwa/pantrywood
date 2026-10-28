import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/PageTransition";
import { StoragePage } from "@/components/inside/StoragePage";

// Which piece is runtime data (the id is only known per request), so it's read inside Suspense.
const Inside = async ({ params }: { params: Promise<{ id: string }> }) => {
  const locationId = Number((await params).id);
  if (!Number.isInteger(locationId) || locationId <= 0) notFound();
  return <StoragePage locationId={locationId} />;
};

const Storage = ({ params }: PageProps<"/storage/[id]">) => (
  <PageTransition>
    <main className="flex min-h-dvh flex-1 flex-col">
      <h1 className="sr-only">Inside the storage</h1>
      <Suspense fallback={<p role="status" className="m-auto text-sm text-muted-foreground">Opening…</p>}>
        <Inside params={params} />
      </Suspense>
    </main>
  </PageTransition>
);

export default Storage;
