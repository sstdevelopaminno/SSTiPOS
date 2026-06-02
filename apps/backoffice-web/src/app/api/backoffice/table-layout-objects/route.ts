import { getAuthContext } from "@/lib/auth-context";
import { appendAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { canManageTables, floorObjectDefaults, floorObjectTypes } from "@/lib/table-management";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

type FloorObjectPayload = {
  zone_id?: string | null;
  object_type: string;
  object_name?: string | null;
  color?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  z_index?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
};

export async function GET() {
  try {
    const auth = await getAuthContext({ requireBranchScope: true });
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("table_layout_objects")
      .select(
        "id,tenant_id,branch_id,zone_id,object_type,object_name,color,position_x,position_y,width,height,rotation,z_index,is_active,metadata,created_at,updated_at"
      )
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .order("z_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return fail("layout_object_query_failed", error.message, 500);
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
      return fail("forbidden_role", "Only manager or owner can manage floor objects.", 403);
    }

    const body = (await req.json()) as FloorObjectPayload;
    if (!body.object_type || !floorObjectTypes.includes(body.object_type as (typeof floorObjectTypes)[number])) {
      return fail("invalid_object_type", "object_type is invalid.", 422);
    }

    const objectType = body.object_type as (typeof floorObjectTypes)[number];
    const defaults = floorObjectDefaults[objectType];
    const color = typeof body.color === "string" && body.color.trim().length > 0 ? body.color.trim() : defaults.color;
    const width = Math.max(24, Number(body.width ?? defaults.width));
    const height = Math.max(24, Number(body.height ?? defaults.height));

    const supabase = getSupabaseServiceClient();
    if (body.zone_id) {
      const { data: zone, error: zoneError } = await supabase
        .from("table_zones")
        .select("id")
        .eq("tenant_id", auth.tenantId!)
        .eq("branch_id", auth.branchId!)
        .eq("id", body.zone_id)
        .maybeSingle();
      if (zoneError) {
        return fail("zone_lookup_failed", zoneError.message, 500);
      }
      if (!zone) {
        return fail("invalid_zone_id", "zone_id is not available in current branch.", 422);
      }
    }

    const { data, error } = await supabase
      .from("table_layout_objects")
      .insert({
        tenant_id: auth.tenantId,
        branch_id: auth.branchId,
        zone_id: body.zone_id ?? null,
        object_type: objectType,
        object_name: body.object_name?.trim() || defaults.name,
        color,
        position_x: Number(body.position_x ?? 24),
        position_y: Number(body.position_y ?? 24),
        width,
        height,
        rotation: Number(body.rotation ?? 0),
        z_index: Math.max(1, Number(body.z_index ?? 1)),
        is_active: body.is_active ?? true,
        metadata: body.metadata ?? {}
      })
      .select(
        "id,tenant_id,branch_id,zone_id,object_type,object_name,color,position_x,position_y,width,height,rotation,z_index,is_active,metadata,created_at,updated_at"
      )
      .single();

    if (error) {
      return fail("layout_object_create_failed", error.message, 500);
    }

    await appendAuditLog({
      tenantId: auth.tenantId!,
      branchId: auth.branchId!,
      actorUserId: auth.userId,
      actorRole: auth.branchRole!,
      action: "floor_object_created",
      targetTable: "table_layout_objects",
      targetId: data.id,
      metadata: {
        object_type: data.object_type,
        object_name: data.object_name
      }
    });

    return ok(data, 201);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}
