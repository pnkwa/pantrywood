import { PageTransition } from "@/components/PageTransition";
import { ReceiptMemories } from "@/components/receipt/ReceiptMemories";

const ReceiptsPage = () => (
  <PageTransition>
    <main className="flex-1">
      <ReceiptMemories />
    </main>
  </PageTransition>
);

export default ReceiptsPage;
