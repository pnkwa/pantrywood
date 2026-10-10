import { PageTransition } from "@/components/PageTransition";
import { ScanStation } from "@/components/scan/ScanStation";

const ScanPage = () => (
  <PageTransition>
    <main className="flex-1">
      <ScanStation />
    </main>
  </PageTransition>
);

export default ScanPage;
