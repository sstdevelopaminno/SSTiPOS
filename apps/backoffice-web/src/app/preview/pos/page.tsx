import { PosEntryGate } from "@/components/pos/pos-entry-gate";
import { getCurrentLanguage } from "@/lib/i18n";

export default async function PosPreviewPage() {
  const lang = await getCurrentLanguage();

  return (
    <main className="h-full min-h-0 w-full">
      <PosEntryGate lang={lang} />
    </main>
  );
}

