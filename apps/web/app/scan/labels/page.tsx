import { PageTransition } from "@/components/PageTransition";
import { LabelSheet } from "@/components/scan/LabelSheet";

const LabelsPage = () => (
  <PageTransition>
    <main className="flex-1">
      <LabelSheet />
    </main>
  </PageTransition>
);

export default LabelsPage;
