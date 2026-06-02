import { PosSalesListWorkspace } from "@/components/pos-preview/pos-sales-list-workspace";
import { getAuthContext } from "@/lib/auth-context";
import { getCurrentLanguage } from "@/lib/i18n";
import { requirePosPagePermission } from "@/lib/pos-page-guard";
import { loadPosSalesListData } from "@/lib/services/pos-sales-list-service";

export default async function PosSalesListPage() {
  await requirePosPagePermission("sales:list:view");
  const lang = await getCurrentLanguage();
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);

  const initialData = await loadPosSalesListData({
    userId: auth?.userId ?? null,
    tenantId: auth?.tenantId ?? null,
    branchId: auth?.branchId ?? null,
    branchRole: auth?.branchRole ?? null,
    platformRole: auth?.platformRole ?? "tenant_user"
  });

  return (
    <PosSalesListWorkspace
      lang={lang}
      initialRole={auth?.branchRole ?? null}
      platformRole={auth?.platformRole ?? "tenant_user"}
      initialBranchId={auth?.branchId ?? null}
      initialRecords={initialData.records}
      branchOptions={initialData.branchOptions}
      shiftOptions={initialData.shiftOptions}
      refreshEndpoint="/api/pos/sales-list"
    />
  );
}
