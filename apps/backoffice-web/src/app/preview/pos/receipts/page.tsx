import { PosPreviewSectionPage } from "@/components/pos-preview/pos-preview-section-page";
import { getCurrentLanguage } from "@/lib/i18n";
import { requirePosPagePermission } from "@/lib/pos-page-guard";

export default async function PosReceiptsPage() {
  await requirePosPagePermission("reports:view");
  const lang = await getCurrentLanguage();

  return (
    <PosPreviewSectionPage
      lang={lang}
      titleKey="pos_receipts_title"
      descKey="pos_receipts_desc"
      actionHref="/orders"
      actionKey="pos_receipts_action"
    />
  );
}
