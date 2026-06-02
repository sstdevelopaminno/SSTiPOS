import { getAuthContext } from "@/lib/auth-context";
import { appendAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { canManageTables } from "@/lib/table-management";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

type ZonePayload = {
  zone_name: string;
  color?: string;
  display_order?: number;
  is_active?: boolean;
};

export async function GET() {
  try {
    const auth = await getAuthContext({ requireBranchScope: true });
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("table_zones")
      .select("id,tenant_id,branch_id,zone_name,color,display_order,is_active,metadata,created_at,updated_at")
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .order("display_order", { ascending: true })
      .order("zone_name", { ascending: true });

    if (error) {
      return fail("zone_query_failed", error.message, 500);
    }

    return ok({ items: data ?? [] });
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext({ requireBranchScope: true });
    if (!canManageTables(auth.branchRole)) {
      return fail("forbidden_role", "Only manager or owner can manage zones.", 403);
    }

    const body = (await req.json()) as ZonePayload;
    const zoneName = body.zone_name?.trim();
    if (!zoneName) {
      return fail("invalid_zone_name", "zone_name is required.", 422);
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("table_zones")
      .insert({
        tenant_id: auth.tenantId,
        branch_id: auth.branchId,
        zone_name: zoneName,
        color: body.color?.trim() || "#0ea5e9",
        display_order: Number(body.display_order ?? 0),
        is_active: body.is_active ?? true
      })
      .select("id,tenant_id,branch_id,zone_name,color,display_order,is_active,metadata,created_at,updated_at")
      .single();

    if (error) {
      return fail("zone_create_failed", error.message, 500);
    }

    await appendAuditLog({
      tenantId: auth.tenantId!,
      branchId: auth.branchId!,
      actorUserId: auth.userId,
      actorRole: auth.branchRole!,
      action: "table_zone_created",
      targetTable: "table_zones",
      targetId: data.id,
      metadata: {
        zone_name: data.zone_name,
        color: data.color
      }
    });

    return ok(data, 201);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}
