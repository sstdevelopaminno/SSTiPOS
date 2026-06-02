import { PosSalesSummaryDashboard } from "@/components/pos-preview/pos-sales-summary-dashboard";
import { getAuthContext } from "@/lib/auth-context";
import { getCurrentLanguage } from "@/lib/i18n";
import { requirePosPagePermission } from "@/lib/pos-page-guard";
import { loadPosSalesSummaryData } from "@/lib/services/pos-sales-summary-service";

export default async function PosSalesSummaryPage() {
  await requirePosPagePermission("reports:view");
  const lang = await getCurrentLanguage();
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  const initialPayload = await loadPosSalesSummaryData({
    userId: auth?.userId ?? null,
    tenantId: auth?.tenantId ?? null,
    branchId: auth?.branchId ?? null,
    branchRole: auth?.branchRole ?? null,
    platformRole: auth?.platformRole ?? "tenant_user"
  });

  return <PosSalesSummaryDashboard lang={lang} initialPayload={initialPayload} />;
}
