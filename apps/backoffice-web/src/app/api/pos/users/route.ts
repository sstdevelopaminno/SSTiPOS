import bcrypt from "bcryptjs";
import { appendAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { getPosApiAuthContext } from "@/lib/pos-api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

type BranchRole = "owner" | "manager" | "staff" | "accountant";

type UserScopeRow = {
  user_id: string;
  scope_mode: "all_devices" | "single_device";
  device_id: string | null;
};

type PatchPayload =
  | { action: "set_pin"; user_id?: string; pin?: string }
  | { action: "set_active"; user_id?: string; is_active?: boolean }
  | { action: "set_device_scope"; user_id?: string; scope_mode?: "all_devices" | "single_device"; device_id?: string | null };

function isMissingRelationError(error: { code?: string | null; message?: string | null } | null | undefined, relationName: string) {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  return code === "42P01" || message.includes("does not exist") || message.includes(relationName.toLowerCase());
}

function normalizeRole(value: string): BranchRole {
  if (value === "owner" || value === "manager" || value === "accountant") return value;
  return "staff";
}

function canManagerManageTarget(targetRole: BranchRole) {
  return targetRole === "staff";
}

async function getTargetRole(input: { tenantId: string; branchId: string; userId: string }) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_branch_roles")
    .select("role")
    .eq("tenant_id", input.tenantId)
    .eq("branch_id", input.branchId)
    .eq("user_id", input.userId)
    .maybeSingle<{ role: BranchRole }>();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return normalizeRole(data.role);
}

export async function GET() {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "users:view" });
    const supabase = getSupabaseServiceClient();

    let userQuery = supabase
      .from("user_branch_roles")
      .select("id,user_id,role,is_default,users_profiles!inner(id,full_name,email,is_active)")
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .order("role", { ascending: true });

    if (auth.branchRole === "manager") {
      userQuery = userQuery.eq("role", "staff");
    }

    const [{ data: rows, error }, { data: devices, error: deviceError }] = await Promise.all([
      userQuery,
      supabase
        .from("branch_devices")
        .select("id,device_code,device_name,status")
        .eq("tenant_id", auth.tenantId!)
        .eq("branch_id", auth.branchId!)
        .order("device_code", { ascending: true })
    ]);

    if (error) {
      return fail("pos_users_query_failed", error.message, 500);
    }
    if (deviceError) {
      return fail("pos_devices_query_failed", deviceError.message, 500);
    }

    let scopesByUser = new Map<string, UserScopeRow>();
    const scopeQuery = await supabase
      .from("pos_user_device_scopes")
      .select("user_id,scope_mode,device_id")
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!);

    if (scopeQuery.error && !isMissingRelationError(scopeQuery.error, "pos_user_device_scopes")) {
      return fail("pos_user_scope_query_failed", scopeQuery.error.message, 500);
    }
    if (!scopeQuery.error) {
      for (const row of (scopeQuery.data ?? []) as UserScopeRow[]) {
        scopesByUser.set(row.user_id, row);
      }
    }

    const items = ((rows ?? []) as Array<{
      id: string;
      user_id: string;
      role: BranchRole;
      is_default: boolean;
      users_profiles:
        | { id: string; full_name: string | null; email: string | null; is_active: boolean }
        | Array<{ id: string; full_name: string | null; email: string | null; is_active: boolean }>;
    }>).map((row) => {
      const profile = Array.isArray(row.users_profiles) ? row.users_profiles[0] : row.users_profiles;
      const scope = scopesByUser.get(row.user_id);
      return {
        user_id: row.user_id,
        role: row.role,
        is_default: row.is_default,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        is_active: profile?.is_active ?? false,
        device_scope: {
          scope_mode: scope?.scope_mode ?? "all_devices",
          device_id: scope?.device_id ?? null
        }
      };
    });

    return ok({
      items,
      devices: (devices ?? []).map((device) => ({
        id: String((device as { id?: string }).id ?? ""),
        device_code: String((device as { device_code?: string }).device_code ?? ""),
        device_name: String((device as { device_name?: string }).device_name ?? ""),
        status: String((device as { status?: string }).status ?? "active")
      })),
      metadata: {
        role: auth.branchRole,
        manager_scope_staff_only: auth.branchRole === "manager"
      }
    });
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "users:manage" });
    const body = (await request.json()) as PatchPayload;
    const action = String(body?.action ?? "").trim();
    const userId = String((body as { user_id?: string })?.user_id ?? "").trim();
    if (!userId) {
      return fail("invalid_payload", "user_id is required.", 422);
    }

    const targetRole = await getTargetRole({
      tenantId: auth.tenantId!,
      branchId: auth.branchId!,
      userId
    });
    if (!targetRole) {
      return fail("user_not_found", "User was not found in this branch.", 404);
    }
    if (auth.branchRole === "manager" && !canManagerManageTarget(targetRole)) {
      return fail("forbidden_target_role", "Manager can manage only staff users.", 403);
    }

    const supabase = getSupabaseServiceClient();

    if (action === "set_pin") {
      const pin = String((body as { pin?: string })?.pin ?? "").trim();
      if (!/^\d{4,12}$/.test(pin)) {
        return fail("invalid_pin", "PIN must be 4-12 digits.", 422);
      }
      const pinHash = await bcrypt.hash(pin, 10);
      const { error } = await supabase.from("users_profiles").update({ pin_hash: pinHash }).eq("id", userId);
      if (error) {
        return fail("user_pin_update_failed", error.message, 500);
      }
      await appendAuditLog({
        tenantId: auth.tenantId!,
        branchId: auth.branchId!,
        actorUserId: auth.userId,
        actorRole: auth.branchRole ?? "manager",
        targetUserId: userId,
        action: "pos_user_pin_updated",
        targetTable: "users_profiles",
        targetId: userId,
        metadata: { target_role: targetRole }
      });
      return ok({ user_id: userId, action: "set_pin" });
    }

    if (action === "set_active") {
      const isActive = Boolean((body as { is_active?: boolean })?.is_active);
      const { error } = await supabase.from("users_profiles").update({ is_active: isActive }).eq("id", userId);
      if (error) {
        return fail("user_status_update_failed", error.message, 500);
      }
      await appendAuditLog({
        tenantId: auth.tenantId!,
        branchId: auth.branchId!,
        actorUserId: auth.userId,
        actorRole: auth.branchRole ?? "manager",
        targetUserId: userId,
        action: "pos_user_status_updated",
        targetTable: "users_profiles",
        targetId: userId,
        metadata: { is_active: isActive, target_role: targetRole }
      });
      return ok({ user_id: userId, action: "set_active", is_active: isActive });
    }

    if (action === "set_device_scope") {
      const scopeMode = ((body as { scope_mode?: string })?.scope_mode ?? "all_devices") as "all_devices" | "single_device";
      const deviceId = String((body as { device_id?: string | null })?.device_id ?? "").trim() || null;
      if (scopeMode !== "all_devices" && scopeMode !== "single_device") {
        return fail("invalid_scope_mode", "scope_mode must be all_devices or single_device.", 422);
      }
      const normalizedMode = scopeMode;
      if (normalizedMode === "single_device" && !deviceId) {
        return fail("invalid_scope_device", "device_id is required for single_device mode.", 422);
      }

      const scopePayload = {
        tenant_id: auth.tenantId!,
        branch_id: auth.branchId!,
        user_id: userId,
        scope_mode: normalizedMode,
        device_id: normalizedMode === "single_device" ? deviceId : null
      };

      const upsertScope = await supabase
        .from("pos_user_device_scopes")
        .upsert(scopePayload, { onConflict: "tenant_id,branch_id,user_id" })
        .select("user_id,scope_mode,device_id")
        .single();

      if (upsertScope.error) {
        if (isMissingRelationError(upsertScope.error, "pos_user_device_scopes")) {
          return fail("pos_user_scope_table_missing", "Device scope table is missing. Please run migrations.", 500);
        }
        return fail("pos_user_scope_update_failed", upsertScope.error.message, 500);
      }

      await appendAuditLog({
        tenantId: auth.tenantId!,
        branchId: auth.branchId!,
        actorUserId: auth.userId,
        actorRole: auth.branchRole ?? "manager",
        targetUserId: userId,
        action: "pos_user_scope_updated",
        targetTable: "pos_user_device_scopes",
        targetId: userId,
        metadata: {
          scope_mode: normalizedMode,
          device_id: normalizedMode === "single_device" ? deviceId : null,
          target_role: targetRole
        }
      });

      return ok({
        user_id: userId,
        action: "set_device_scope",
        scope_mode: upsertScope.data.scope_mode,
        device_id: upsertScope.data.device_id
      });
    }

    return fail("invalid_action", "Unsupported action.", 422);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}
