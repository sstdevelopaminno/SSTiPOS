import bcrypt from "bcryptjs";
import crypto from "node:crypto";
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
  | { action: "set_device_scope"; user_id?: string; scope_mode?: "all_devices" | "single_device"; device_id?: string | null }
  | { action: "update_profile"; user_id?: string; full_name?: string; email?: string; role?: BranchRole };

type CreatePayload = {
  full_name?: string;
  email?: string;
  role?: BranchRole;
  pin?: string;
  is_active?: boolean;
  scope_mode?: "all_devices" | "single_device";
  device_id?: string | null;
};

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
  return targetRole !== "owner";
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

    if (action === "update_profile") {
      const fullName = String((body as { full_name?: string })?.full_name ?? "").trim();
      const email = String((body as { email?: string })?.email ?? "").trim().toLowerCase();
      const nextRole = normalizeRole(String((body as { role?: string })?.role ?? targetRole));
      if (!fullName || !email || !email.includes("@")) {
        return fail("invalid_profile", "Full name and valid email are required.", 422);
      }
      if (auth.branchRole === "manager" && targetRole === "owner") {
        return fail("forbidden_target_role", "Manager cannot edit owner users.", 403);
      }
      if (auth.branchRole === "manager" && nextRole !== targetRole) {
        return fail("forbidden_role_change", "Manager cannot change user role.", 403);
      }

      const { error: profileError } = await supabase
        .from("users_profiles")
        .update({ full_name: fullName, email })
        .eq("id", userId);
      if (profileError) {
        return fail("user_profile_update_failed", profileError.message, 500);
      }

      if (auth.branchRole === "owner" && nextRole !== targetRole) {
        const { error: roleError } = await supabase
          .from("user_branch_roles")
          .update({ role: nextRole })
          .eq("tenant_id", auth.tenantId!)
          .eq("branch_id", auth.branchId!)
          .eq("user_id", userId);
        if (roleError) {
          return fail("user_role_update_failed", roleError.message, 500);
        }
      }

      await appendAuditLog({
        tenantId: auth.tenantId!,
        branchId: auth.branchId!,
        actorUserId: auth.userId,
        actorRole: auth.branchRole ?? "manager",
        targetUserId: userId,
        action: "pos_user_profile_updated",
        targetTable: "users_profiles",
        targetId: userId,
        metadata: { role: nextRole, target_role: targetRole }
      });
      return ok({ user_id: userId, action: "update_profile", role: nextRole });
    }

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

export async function POST(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "users:manage" });
    if (auth.branchRole !== "owner") {
      return fail("forbidden_role", "Only owner can add POS users.", 403);
    }

    const body = (await request.json()) as CreatePayload;
    const fullName = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = normalizeRole(String(body.role ?? "staff"));
    const pin = String(body.pin ?? "").trim();
    const scopeMode = body.scope_mode === "single_device" ? "single_device" : "all_devices";
    const deviceId = String(body.device_id ?? "").trim() || null;

    if (!fullName || !email || !email.includes("@")) {
      return fail("invalid_profile", "Full name and valid email are required.", 422);
    }
    if (pin && !/^\d{4,12}$/.test(pin)) {
      return fail("invalid_pin", "PIN must be 4-12 digits.", 422);
    }
    if (scopeMode === "single_device" && !deviceId) {
      return fail("invalid_scope_device", "device_id is required for single_device mode.", 422);
    }

    const supabase = getSupabaseServiceClient();
    const { data: existingProfile, error: existingError } = await supabase
      .from("users_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle<{ id: string }>();
    if (existingError) {
      return fail("user_lookup_failed", existingError.message, 500);
    }

    let userId = existingProfile?.id ?? crypto.randomUUID();
    if (!existingProfile) {
      const pinHash = pin ? await bcrypt.hash(pin, 10) : null;
      const { error: insertProfileError } = await supabase.from("users_profiles").insert({
        id: userId,
        email,
        full_name: fullName,
        platform_role: "tenant_user",
        pin_hash: pinHash,
        is_active: body.is_active ?? true
      });
      if (insertProfileError) {
        return fail("user_create_failed", insertProfileError.message, 500);
      }
    }

    const { error: roleError } = await supabase.from("user_branch_roles").upsert(
      {
        user_id: userId,
        tenant_id: auth.tenantId!,
        branch_id: auth.branchId!,
        role,
        is_default: false
      },
      { onConflict: "user_id,tenant_id,branch_id" }
    );
    if (roleError) {
      return fail("user_role_create_failed", roleError.message, 500);
    }

    const scopeWrite = await supabase.from("pos_user_device_scopes").upsert(
      {
        user_id: userId,
        tenant_id: auth.tenantId!,
        branch_id: auth.branchId!,
        scope_mode: scopeMode,
        device_id: scopeMode === "single_device" ? deviceId : null
      },
      { onConflict: "tenant_id,branch_id,user_id" }
    );
    if (scopeWrite.error && !isMissingRelationError(scopeWrite.error, "pos_user_device_scopes")) {
      return fail("pos_user_scope_create_failed", scopeWrite.error.message, 500);
    }

    await appendAuditLog({
      tenantId: auth.tenantId!,
      branchId: auth.branchId!,
      actorUserId: auth.userId,
      actorRole: "owner",
      targetUserId: userId,
      action: "pos_user_created",
      targetTable: "users_profiles",
      targetId: userId,
      metadata: { role, reused_profile: Boolean(existingProfile), scope_mode: scopeMode }
    });

    return ok({ user_id: userId, role }, 201);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "users:manage" });
    if (auth.branchRole !== "owner") {
      return fail("forbidden_role", "Only owner can delete POS users.", 403);
    }

    const { searchParams } = new URL(request.url);
    const userId = String(searchParams.get("user_id") ?? "").trim();
    if (!userId) {
      return fail("invalid_payload", "user_id is required.", 422);
    }
    if (userId === auth.userId) {
      return fail("delete_self_forbidden", "Owner cannot delete own active access.", 409);
    }

    const supabase = getSupabaseServiceClient();
    const targetRole = await getTargetRole({ tenantId: auth.tenantId!, branchId: auth.branchId!, userId });
    if (!targetRole) {
      return fail("user_not_found", "User was not found in this branch.", 404);
    }

    const deleteScope = await supabase
      .from("pos_user_device_scopes")
      .delete()
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .eq("user_id", userId);
    if (deleteScope.error && !isMissingRelationError(deleteScope.error, "pos_user_device_scopes")) {
      return fail("pos_user_scope_delete_failed", deleteScope.error.message, 500);
    }

    const { error: deleteRoleError } = await supabase
      .from("user_branch_roles")
      .delete()
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .eq("user_id", userId);
    if (deleteRoleError) {
      return fail("user_delete_failed", deleteRoleError.message, 500);
    }

    const { count } = await supabase
      .from("user_branch_roles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) === 0) {
      await supabase.from("users_profiles").update({ is_active: false }).eq("id", userId);
    }

    await appendAuditLog({
      tenantId: auth.tenantId!,
      branchId: auth.branchId!,
      actorUserId: auth.userId,
      actorRole: "owner",
      targetUserId: userId,
      action: "pos_user_deleted",
      targetTable: "user_branch_roles",
      targetId: userId,
      metadata: { target_role: targetRole }
    });

    return ok({ user_id: userId, deleted: true });
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}
