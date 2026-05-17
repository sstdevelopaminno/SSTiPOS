import type { CreateManualDeliveryOrderInput } from "@pos/shared-types";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";
import { getAuthContext } from "@/lib/auth-context";
import { appendAuditLog } from "@/lib/audit-log";
import { executeCreateManualDeliveryOrderTransaction } from "@/lib/services/stock-transaction-service";
import { buildPaginationMeta, parsePagination } from "@/lib/query-params";
import { ok, fail } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext({ requireBranchScope: true });
    const supabase = getSupabaseServiceClient();
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const { page, pageSize } = parsePagination(searchParams, 10);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();
    const orderType = searchParams.get("order_type")?.trim();
    const channel = searchParams.get("channel")?.trim();
    const branchId = searchParams.get("branch_id")?.trim();

    if (branchId && branchId !== auth.branchId) {
      return fail("forbidden_branch_scope", "Cross-branch access is not allowed.", 403);
    }

    let query = supabase
      .from("orders")
      .select(
        "id,tenant_id,branch_id,shift_id,order_no,order_type,channel,external_order_code,customer_name,total_amount,status,created_at,delivery_status",
        { count: "exact" }
      )
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    if (orderType) {
      query = query.eq("order_type", orderType);
    }

    if (channel) {
      query = query.eq("channel", channel);
    }

    if (search) {
      query = query.or(
        `order_no.ilike.%${search}%,external_order_code.ilike.%${search}%,customer_name.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      return fail("orders_query_failed", error.message, 500);
    }

    return ok({
      items: data ?? [],
      pagination: buildPaginationMeta(page, pageSize, count)
    });
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as CreateManualDeliveryOrderInput;
    const auth = await getAuthContext({ requireBranchScope: true });

    if (!payload.external_order_code?.trim()) {
      return fail("invalid_external_code", "External order code is required.", 422);
    }

    if (!["grab", "line_man", "shopee", "merchant_app", "other"].includes(payload.channel)) {
      return fail("invalid_channel", "Manual delivery channel is invalid.", 422);
    }

    const idempotencyKey = req.headers.get("x-idempotency-key")?.trim() || undefined;

    const result = await executeCreateManualDeliveryOrderTransaction({
      auth,
      input: payload,
      idempotencyKey,
      appendAuditLog
    });

    if (!result.ok) {
      return fail(result.code, result.message, result.status);
    }

    return ok(result.data, result.data.duplicate_request ? 200 : 201);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

