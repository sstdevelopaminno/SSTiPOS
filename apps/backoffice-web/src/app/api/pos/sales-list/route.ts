import { getPosApiAuthContext } from "@/lib/pos-api-auth";
import { fail, ok } from "@/lib/http";
import { loadPosSalesListData } from "@/lib/services/pos-sales-list-service";

export async function GET() {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "sales:list:view" });
    const payload = await loadPosSalesListData({
      userId: auth.userId,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      branchRole: auth.branchRole,
      platformRole: auth.platformRole
    });
    return ok(payload);
  } catch (error) {
    return fail("sales_list_fetch_failed", error instanceof Error ? error.message : "Failed to fetch sales list.", 401);
  }
}
