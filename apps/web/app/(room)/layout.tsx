import type { ReactNode } from "react";
import { PageTransition } from "@/components/PageTransition";
import { PantryHome } from "@/components/pantry/PantryHome";

// The room stays mounted for "/" and "/storage/[id]": opening a piece only changes which one is open, so the 3D
// scene, its data and the camera glide carry over instead of the whole room loading again.
const RoomLayout = ({ children }: { children: ReactNode }) => (
  <PageTransition>
    <main className="flex min-h-dvh flex-1 flex-col">
      <h1 className="sr-only">Pantrywood</h1>
      <PantryHome />
      {children}
    </main>
  </PageTransition>
);

export default RoomLayout;
