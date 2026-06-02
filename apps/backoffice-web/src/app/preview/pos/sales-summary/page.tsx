import { PosPreviewSectionPage } from "@/components/pos-preview/pos-preview-section-page";
import { getCurrentLanguage } from "@/lib/i18n";
import { requirePosPagePermission } from "@/lib/pos-page-guard";

export default async function PosSalesSummaryPage() {
  await requirePosPagePermission("reports:view");
  const lang = await getCurrentLanguage();

  return (
    <PosPreviewSectionPage
      lang={lang}
      titleKey="pos_sales_summary_title"
      descKey="pos_sales_summary_desc"
      actionHref="/reports/sales"
      actionKey="pos_sales_summary_action"
    />
  );
}

