import { PageTransition } from "@/components/PageTransition";
import { ReceiptScanner } from "@/components/receipt/ReceiptScanner";

const ReceiptPage = () => (
  <PageTransition>
    <main className="flex-1">
      <ReceiptScanner />
    </main>
  </PageTransition>
);

export default ReceiptPage;
