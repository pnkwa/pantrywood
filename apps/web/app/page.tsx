import { PageTransition } from "@/components/PageTransition";
import { PantryHome } from "@/components/pantry/PantryHome";

const Home = () => (
  <PageTransition>
    <main className="flex min-h-dvh flex-1 flex-col">
      <h1 className="sr-only">Pantrywood</h1>
      <PantryHome />
    </main>
  </PageTransition>
);

export default Home;
