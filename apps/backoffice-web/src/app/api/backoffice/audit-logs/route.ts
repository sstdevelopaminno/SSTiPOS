import { getAuthContext } from "@/lib/auth-context";
import { fail, ok } from "@/lib/http";
import { buildPaginationMeta, parsePagination } from "@/lib/query-params";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext({ requireBranchScope: true });
    if (!auth.branchRole || !["manager", "owner"].includes(auth.branchRole)) {
      return fail("forbidden_role", "Only manager or owner can view audit logs.", 403);
    }

    const supabase = getSupabaseServiceClient();
    const { searchParams } = new URL(req.url);
    const { page, pageSize } = parsePagination(searchParams, 20);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const module = searchParams.get("module")?.trim();
    const action = searchParams.get("action")?.trim();
    const search = searchParams.get("search")?.trim();
    const branchId = searchParams.get("branch_id")?.trim();

    if (branchId && branchId !== auth.branchId) {
      return fail("forbidden_branch_scope", "Cross-branch access is not allowed.", 403);
    }

    let query = supabase
      .from("audit_logs")
      .select(
        "id,tenant_id,branch_id,user_id,role,module,action,entity_type,entity_id,target_table,target_id,created_at,metadata",
        { count: "exact" }
      )
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (module) {
      query = query.eq("module", module);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (search) {
      query = query.or(`entity_type.ilike.%${search}%,action.ilike.%${search}%,target_table.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      return fail("audit_logs_query_failed", error.message, 500);
    }

    return ok({
      items: data ?? [],
      pagination: buildPaginationMeta(page, pageSize, count)
    });
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}
