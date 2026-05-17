import { getAuthContext } from "@/lib/auth-context";
import { appendAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { executeShiftClose } from "@/lib/services/shift-close-service";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext({ requireBranchScope: true });
    const supabase = getSupabaseServiceClient();
    const body = (await req.json()) as {
      shift_id: string;
      expected_cash: number;
      actual_cash: number;
      manager_override_approval_id?: string;
    };

    const { data: openOrders, error: orderError } = await supabase
      .from("orders")
      .select(
        "id,tenant_id,branch_id,shift_id,order_no,order_type,channel,table_id,external_order_code,customer_name,notes,subtotal,discount_amount,gp_amount,total_amount,status,created_by,cancelled_by,cancelled_reason,created_at"
      )
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .eq("shift_id", body.shift_id);

    if (orderError) {
      return fail("shift_orders_query_failed", orderError.message, 500);
    }

    const result = await executeShiftClose({
      auth,
      input: body,
      openOrders: openOrders ?? [],
      appendAuditLog
    });

    if (!result.ok) {
      return fail(result.code, result.message, result.status);
    }

    const { error: closeError } = await supabase
      .from("shifts")
      .update({
        expected_cash: body.expected_cash,
        actual_cash: body.actual_cash,
        close_override_approval_id: body.manager_override_approval_id ?? null,
        closed_by: auth.userId,
        status: "closed"
      })
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .eq("id", body.shift_id);

    if (closeError) {
      return fail("shift_close_update_failed", closeError.message, 500);
    }

    return ok(result.data);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

