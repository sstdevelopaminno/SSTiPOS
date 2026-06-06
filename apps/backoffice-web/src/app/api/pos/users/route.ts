import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { appendAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { validateManagerPin } from "@/lib/pin-approval";
import { getPosApiAuthContext } from "@/lib/pos-api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

type BranchRole = "owner" | "manager" | "staff" | "accountant";
type ScopeMode = "all_devices" | "single_device";

type UserScopeRow = {
  user_id: string;
  branch_id: string;
  scope_mode: ScopeMode;
  device_id: string | null;
};

type UserProfileSettingsRow = {
  user_id: string;
  employee_code: string | null;
  position_title: string | null;
  permission_role: string | null;
};

type BranchRow = {
  id: string;
  code: string | null;
  name: string | null;
  is_active: boolean | null;
};

type PatchPayload =
  | {
      action: "update_profile";
      user_id?: string;
      branch_id?: string;
      full_name?: string;
      email?: string;
      role?: BranchRole;
      position_title?: string;
      permission_role?: string;
      employee_code?: string;
      approval_pin?: string;
    }
  | { action: "set_pin"; user_id?: string; branch_id?: string; pin?: string; approval_pin?: string }
  | { action: "set_active"; user_id?: string; branch_id?: string; is_active?: boolean }
  | { action: "set_device_scope"; user_id?: string; branch_id?: string; scope_mode?: ScopeMode; device_id?: string | null };

type CreatePayload = {
  full_name?: string;
  email?: string;
  role?: BranchRole;
  branch_id?: string;
  pin?: string;
  is_active?: boolean;
  scope_mode?: ScopeMode;
  device_id?: string | null;
  employee_code?: string;
  position_title?: string;
  permission_role?: string;
  approval_pin?: string;
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

function deriveEmployeeCode(userId: string) {
  const normalized = String(userId).replace(/-/g, "").toUpperCase();
  return `EMP-${normalized.slice(-6)}`;
}

function deriveDemoEmployeeCode(input: { userId: string; email: string; role: BranchRole }) {
  const email = String(input.email ?? "").toLowerCase();
  const isDemoUser = email.endsWith(".local") || email.endsWith("@demo.local");
  if (!isDemoUser) return null;
  if (input.role === "owner" && (email.startsWith("owner@") || email.startsWith("owner."))) return "182536";
  const suffix = String(input.userId).replace(/-/g, "").slice(-6).toUpperCase();
  if (input.role === "manager") return `MGR-${suffix}`;
  if (input.role === "accountant") return `ACC-${suffix}`;
  return `STF-${suffix}`;
}

function normalizeEmployeeCode(value: string) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizePermissionRole(value: string | null | undefined, fallback: BranchRole) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function canActorAdd(actorRole: BranchRole | null | undefined) {
  return actorRole === "owner" || actorRole === "manager";
}

function canActorDelete(actorRole: BranchRole | null | undefined) {
  return actorRole === "owner";
}

function canActorEditTarget(input: { actorRole: BranchRole | null | undefined; actorUserId: string; targetUserId: string; targetRole: BranchRole }) {
  if (input.actorRole === "owner") return true;
  if (input.actorRole !== "manager") return false;
  if (input.targetRole === "owner") return false;
  if (input.actorUserId === input.targetUserId) return false;
  return input.targetRole === "staff" || input.targetRole === "accountant";
}

function normalizeManagerRoleChange(actorRole: BranchRole | null | undefined, requestedRole: BranchRole, currentRole: BranchRole) {
  if (actorRole === "owner") return requestedRole;
  if (actorRole === "manager") {
    if (requestedRole === "staff" || requestedRole === "accountant") return requestedRole;
    return currentRole;
  }
  return currentRole;
}

async function requirePinIfProvided(input: { pin?: string; tenantId: string; branchId: string }) {
  const pin = String(input.pin ?? "").trim();
  if (!pin) return { approved: true };
  const approval = await validateManagerPin("employee_delete", pin, {
    tenantId: input.tenantId,
    branchId: input.branchId
  });
  return approval;
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
  if (error) throw new Error(error.message);
  return data ? normalizeRole(data.role) : null;
}

async function loadProfileSettings(tenantId: string, userIds: string[]) {
  const supabase = getSupabaseServiceClient();
  const settingsByUser = new Map<string, UserProfileSettingsRow>();
  if (!userIds.length) return settingsByUser;

  const { data, error } = await supabase
    .from("pos_user_profiles")
    .select("user_id,employee_code,position_title,permission_role")
    .eq("tenant_id", tenantId)
    .in("user_id", userIds);

  if (error) {
    if (isMissingRelationError(error, "pos_user_profiles")) return settingsByUser;
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as UserProfileSettingsRow[]) {
    settingsByUser.set(row.user_id, row);
  }
  return settingsByUser;
}

async function upsertProfileSettings(input: {
  tenantId: string;
  userId: string;
  employeeCode: string;
  positionTitle: string;
  permissionRole: string;
}) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("pos_user_profiles").upsert(
    {
      tenant_id: input.tenantId,
      user_id: input.userId,
      employee_code: input.employeeCode,
      position_title: input.positionTitle,
      permission_role: input.permissionRole
    },
    { onConflict: "tenant_id,user_id" }
  );
  if (error) {
    if (isMissingRelationError(error, "pos_user_profiles")) return;
    throw new Error(error.message);
  }
}

export async function GET(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "users:view" });
    if (auth.branchRole !== "owner" && auth.branchRole !== "manager") {
      return fail("forbidden_role", "Only owner or manager can view POS users.", 403);
    }

    const supabase = getSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const branchFilter = String(searchParams.get("branch_id") ?? "").trim();

    const branchesQuery = supabase
      .from("branches")
      .select("id,code,name,is_active")
      .eq("tenant_id", auth.tenantId!)
      .order("name", { ascending: true });

    let userQuery = supabase
      .from("user_branch_roles")
      .select("id,user_id,branch_id,role,is_default,users_profiles!inner(id,full_name,email,is_active)")
      .eq("tenant_id", auth.tenantId!)
      .order("branch_id", { ascending: true })
      .order("role", { ascending: true });

    let deviceQuery = supabase
      .from("branch_devices")
      .select("id,branch_id,device_code,device_name,status")
      .eq("tenant_id", auth.tenantId!)
      .order("device_code", { ascending: true });

    let scopeQuery = supabase
      .from("pos_user_device_scopes")
      .select("user_id,branch_id,scope_mode,device_id")
      .eq("tenant_id", auth.tenantId!);

    if (branchFilter && branchFilter !== "all") {
      userQuery = userQuery.eq("branch_id", branchFilter);
      deviceQuery = deviceQuery.eq("branch_id", branchFilter);
      scopeQuery = scopeQuery.eq("branch_id", branchFilter);
    }

    const [branchesResult, usersResult, devicesResult, scopesResult] = await Promise.all([
      branchesQuery,
      userQuery,
      deviceQuery,
      scopeQuery
    ]);

    if (branchesResult.error) return fail("branches_query_failed", branchesResult.error.message, 500);
    if (usersResult.error) return fail("pos_users_query_failed", usersResult.error.message, 500);
    if (devicesResult.error) return fail("pos_devices_query_failed", devicesResult.error.message, 500);
    if (scopesResult.error && !isMissingRelationError(scopesResult.error, "pos_user_device_scopes")) {
      return fail("pos_user_scope_query_failed", scopesResult.error.message, 500);
    }

    const branches = ((branchesResult.data ?? []) as BranchRow[]).filter((branch) => branch.is_active !== false);
    const branchById = new Map(branches.map((branch) => [branch.id, branch]));
    const scopeByKey = new Map<string, UserScopeRow>();
    for (const row of ((scopesResult.error ? [] : scopesResult.data) ?? []) as UserScopeRow[]) {
      scopeByKey.set(`${row.branch_id}:${row.user_id}`, row);
    }

    const rawRows = (usersResult.data ?? []) as Array<{
      id: string;
      user_id: string;
      branch_id: string;
      role: BranchRole;
      is_default: boolean;
      users_profiles:
        | { id: string; full_name: string | null; email: string | null; is_active: boolean }
        | Array<{ id: string; full_name: string | null; email: string | null; is_active: boolean }>;
    }>;

    const rows =
      auth.branchRole === "manager"
        ? rawRows.filter((row) => row.role !== "owner")
        : rawRows;
    const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
    const settingsByUser = await loadProfileSettings(auth.tenantId!, userIds);

    const items = rows.map((row) => {
      const profile = Array.isArray(row.users_profiles) ? row.users_profiles[0] : row.users_profiles;
      const scope = scopeByKey.get(`${row.branch_id}:${row.user_id}`);
      const settings = settingsByUser.get(row.user_id);
      const branch = branchById.get(row.branch_id);
      const role = normalizeRole(row.role);
      const demoEmployeeCode = deriveDemoEmployeeCode({ userId: row.user_id, email: profile?.email ?? "", role });
      const employeeCode = normalizeEmployeeCode(settings?.employee_code ?? "") || demoEmployeeCode || deriveEmployeeCode(row.user_id);
      return {
        user_id: row.user_id,
        branch_id: row.branch_id,
        branch_name: branch?.name ?? row.branch_id,
        branch_code: branch?.code ?? "",
        role,
        permission_role: normalizePermissionRole(settings?.permission_role, role),
        position_title: settings?.position_title ?? "",
        employee_code: employeeCode,
        is_default: row.is_default,
        full_name: profile?.full_name ?? "",
        email: profile?.email ?? "",
        is_active: profile?.is_active ?? false,
        can_edit: canActorEditTarget({
          actorRole: auth.branchRole,
          actorUserId: auth.userId,
          targetUserId: row.user_id,
          targetRole: role
        }),
        can_delete: canActorDelete(auth.branchRole) && auth.userId !== row.user_id,
        device_scope: {
          scope_mode: scope?.scope_mode ?? "all_devices",
          device_id: scope?.device_id ?? null
        }
      };
    });

    return ok({
      items,
      branches: branches.map((branch) => ({
        id: branch.id,
        code: branch.code ?? "",
        name: branch.name ?? branch.code ?? branch.id
      })),
      devices: (devicesResult.data ?? []).map((device) => ({
        id: String((device as { id?: string }).id ?? ""),
        branch_id: String((device as { branch_id?: string }).branch_id ?? ""),
        device_code: String((device as { device_code?: string }).device_code ?? ""),
        device_name: String((device as { device_name?: string }).device_name ?? ""),
        status: String((device as { status?: string }).status ?? "active")
      })),
      metadata: {
        role: auth.branchRole,
        user_id: auth.userId,
        tenant_id: auth.tenantId,
        branch_id: auth.branchId,
        can_add: canActorAdd(auth.branchRole),
        can_delete: canActorDelete(auth.branchRole)
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
    const branchId = String((body as { branch_id?: string })?.branch_id ?? auth.branchId ?? "").trim();
    if (!userId || !branchId) return fail("invalid_payload", "user_id and branch_id are required.", 422);

    const targetRole = await getTargetRole({ tenantId: auth.tenantId!, branchId, userId });
    if (!targetRole) return fail("user_not_found", "User was not found in this branch.", 404);
    if (!canActorEditTarget({ actorRole: auth.branchRole, actorUserId: auth.userId, targetUserId: userId, targetRole })) {
      return fail("forbidden_target_role", "This user cannot be edited by the current role.", 403);
    }

    const supabase = getSupabaseServiceClient();

    if (action === "update_profile") {
      const payload = body as Extract<PatchPayload, { action: "update_profile" }>;
      const fullName = String(payload.full_name ?? "").trim();
      const email = String(payload.email ?? "").trim().toLowerCase();
      const requestedRole = normalizeRole(String(payload.role ?? targetRole));
      const nextRole = normalizeManagerRoleChange(auth.branchRole, requestedRole, targetRole);
      const currentSettings = await loadProfileSettings(auth.tenantId!, [userId]);
      const { data: profileForCode, error: profileForCodeError } = await supabase.from("users_profiles").select("email").eq("id", userId).maybeSingle<{ email: string | null }>();
      if (profileForCodeError) return fail("user_profile_lookup_failed", profileForCodeError.message, 500);
      const demoEmployeeCode = deriveDemoEmployeeCode({ userId, email: profileForCode?.email ?? "", role: targetRole });
      const currentEmployeeCode = normalizeEmployeeCode(currentSettings.get(userId)?.employee_code ?? "") || demoEmployeeCode || deriveEmployeeCode(userId);
      const employeeCode = normalizeEmployeeCode(payload.employee_code ?? "") || currentEmployeeCode;
      const employeeCodeChanged = employeeCode !== currentEmployeeCode;
      const positionTitle = String(payload.position_title ?? "").trim();
      const permissionRole = normalizePermissionRole(payload.permission_role, nextRole);

      if (!fullName || !email || !email.includes("@")) {
        return fail("invalid_profile", "Full name and valid email are required.", 422);
      }

      const pinApproval = employeeCodeChanged ? await requirePinIfProvided({ pin: payload.approval_pin, tenantId: auth.tenantId!, branchId }) : { approved: true };
      if (employeeCodeChanged && !pinApproval.approved) {
        return fail("approval_pin_required", "PIN approval is required to update employee code.", 403);
      }

      const { error: profileError } = await supabase.from("users_profiles").update({ full_name: fullName, email }).eq("id", userId);
      if (profileError) return fail("user_profile_update_failed", profileError.message, 500);

      if (nextRole !== targetRole) {
        const { error: roleError } = await supabase
          .from("user_branch_roles")
          .update({ role: nextRole })
          .eq("tenant_id", auth.tenantId!)
          .eq("branch_id", branchId)
          .eq("user_id", userId);
        if (roleError) return fail("user_role_update_failed", roleError.message, 500);
      }

      try {
        await upsertProfileSettings({
          tenantId: auth.tenantId!,
          userId,
          employeeCode,
          positionTitle,
          permissionRole
        });
      } catch (error) {
        return fail("pos_user_profile_update_failed", error instanceof Error ? error.message : "Unable to update POS user profile.", 500);
      }

      void appendAuditLog({
        tenantId: auth.tenantId!,
        branchId,
        actorUserId: auth.userId,
        actorRole: auth.branchRole ?? "manager",
        targetUserId: userId,
        action: "pos_user_profile_updated",
        targetTable: "users_profiles",
        targetId: userId,
        metadata: { role: nextRole, target_role: targetRole, employee_code: employeeCode, position_title: positionTitle }
      });
      return ok({ user_id: userId, branch_id: branchId, action: "update_profile", role: nextRole });
    }

    if (action === "set_pin") {
      const payload = body as Extract<PatchPayload, { action: "set_pin" }>;
      const pin = String(payload.pin ?? "").trim();
      if (!/^\d{4,12}$/.test(pin)) return fail("invalid_pin", "PIN must be 4-12 digits.", 422);
      const approval = await requirePinIfProvided({ pin: payload.approval_pin, tenantId: auth.tenantId!, branchId });
      if (!approval.approved) return fail("approval_pin_required", "PIN approval is required to update user PIN.", 403);
      const pinHash = await bcrypt.hash(pin, 10);
      const { error } = await supabase.from("users_profiles").update({ pin_hash: pinHash }).eq("id", userId);
      if (error) return fail("user_pin_update_failed", error.message, 500);
      return ok({ user_id: userId, branch_id: branchId, action: "set_pin" });
    }

    if (action === "set_active") {
      const payload = body as Extract<PatchPayload, { action: "set_active" }>;
      const isActive = Boolean(payload.is_active);
      const { error } = await supabase.from("users_profiles").update({ is_active: isActive }).eq("id", userId);
      if (error) return fail("user_status_update_failed", error.message, 500);
      return ok({ user_id: userId, branch_id: branchId, action: "set_active", is_active: isActive });
    }

    if (action === "set_device_scope") {
      const payload = body as Extract<PatchPayload, { action: "set_device_scope" }>;
      const scopeMode = payload.scope_mode === "single_device" ? "single_device" : "all_devices";
      const deviceId = String(payload.device_id ?? "").trim() || null;
      if (scopeMode === "single_device" && !deviceId) {
        return fail("invalid_scope_device", "device_id is required for single_device mode.", 422);
      }

      const upsertScope = await supabase
        .from("pos_user_device_scopes")
        .upsert(
          {
            tenant_id: auth.tenantId!,
            branch_id: branchId,
            user_id: userId,
            scope_mode: scopeMode,
            device_id: scopeMode === "single_device" ? deviceId : null
          },
          { onConflict: "tenant_id,branch_id,user_id" }
        )
        .select("user_id,scope_mode,device_id")
        .single();

      if (upsertScope.error) {
        if (isMissingRelationError(upsertScope.error, "pos_user_device_scopes")) {
          return fail("pos_user_scope_table_missing", "Device scope table is missing. Please run migrations.", 500);
        }
        return fail("pos_user_scope_update_failed", upsertScope.error.message, 500);
      }
      return ok({ user_id: userId, branch_id: branchId, action: "set_device_scope", scope_mode: scopeMode, device_id: deviceId });
    }

    return fail("invalid_action", "Unsupported action.", 422);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "users:manage" });
    if (!canActorAdd(auth.branchRole)) return fail("forbidden_role", "Only owner or manager can add POS users.", 403);

    const body = (await request.json()) as CreatePayload;
    const fullName = String(body.full_name ?? "").trim();
    const requestedEmail = String(body.email ?? "").trim().toLowerCase();
    const branchId = String(body.branch_id ?? auth.branchId ?? "").trim();
    const requestedRole = normalizeRole(String(body.role ?? "staff"));
    const role = auth.branchRole === "manager" && (requestedRole === "owner" || requestedRole === "manager") ? "staff" : requestedRole;
    const pin = String(body.pin ?? "").trim();
    const scopeMode = body.scope_mode === "single_device" ? "single_device" : "all_devices";
    const deviceId = String(body.device_id ?? "").trim() || null;
    const employeeCodeInput = normalizeEmployeeCode(body.employee_code ?? "");
    const positionTitle = String(body.position_title ?? "").trim();
    const permissionRole = normalizePermissionRole(body.permission_role, role);

    if (!fullName || !branchId) return fail("invalid_profile", "Full name and branch are required.", 422);
    if (pin && !/^\d{4,12}$/.test(pin)) return fail("invalid_pin", "PIN must be 4-12 digits.", 422);
    if (scopeMode === "single_device" && !deviceId) return fail("invalid_scope_device", "device_id is required for single_device mode.", 422);

    const approval = await requirePinIfProvided({ pin: body.approval_pin, tenantId: auth.tenantId!, branchId });
    if (!approval.approved && (employeeCodeInput || pin)) {
      return fail("approval_pin_required", "PIN approval is required to create user code or PIN.", 403);
    }

    const supabase = getSupabaseServiceClient();
    const email = requestedEmail || `${employeeCodeInput || crypto.randomUUID()}@pos.local`.toLowerCase();
    const { data: existingProfile, error: existingError } = await supabase
      .from("users_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle<{ id: string }>();
    if (existingError) return fail("user_lookup_failed", existingError.message, 500);

    const userId = existingProfile?.id ?? crypto.randomUUID();
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
      if (insertProfileError) return fail("user_create_failed", insertProfileError.message, 500);
    }

    const employeeCode = employeeCodeInput || deriveEmployeeCode(userId);
    const { error: roleError } = await supabase.from("user_branch_roles").upsert(
      {
        user_id: userId,
        tenant_id: auth.tenantId!,
        branch_id: branchId,
        role,
        is_default: false
      },
      { onConflict: "user_id,tenant_id,branch_id" }
    );
    if (roleError) return fail("user_role_create_failed", roleError.message, 500);

    try {
      await upsertProfileSettings({ tenantId: auth.tenantId!, userId, employeeCode, positionTitle, permissionRole });
    } catch (error) {
      return fail("pos_user_profile_create_failed", error instanceof Error ? error.message : "Unable to create POS user profile.", 500);
    }

    const scopeWrite = await supabase.from("pos_user_device_scopes").upsert(
      {
        user_id: userId,
        tenant_id: auth.tenantId!,
        branch_id: branchId,
        scope_mode: scopeMode,
        device_id: scopeMode === "single_device" ? deviceId : null
      },
      { onConflict: "tenant_id,branch_id,user_id" }
    );
    if (scopeWrite.error && !isMissingRelationError(scopeWrite.error, "pos_user_device_scopes")) {
      return fail("pos_user_scope_create_failed", scopeWrite.error.message, 500);
    }

    void appendAuditLog({
      tenantId: auth.tenantId!,
      branchId,
      actorUserId: auth.userId,
      actorRole: auth.branchRole ?? "manager",
      targetUserId: userId,
      action: "pos_user_created",
      targetTable: "users_profiles",
      targetId: userId,
      metadata: { role, employee_code: employeeCode, position_title: positionTitle, reused_profile: Boolean(existingProfile) }
    });

    return ok({ user_id: userId, branch_id: branchId, role }, 201);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "users:manage" });
    if (!canActorDelete(auth.branchRole)) return fail("forbidden_role", "Only owner can delete POS users.", 403);

    const { searchParams } = new URL(request.url);
    const userId = String(searchParams.get("user_id") ?? "").trim();
    const branchId = String(searchParams.get("branch_id") ?? auth.branchId ?? "").trim();
    if (!userId || !branchId) return fail("invalid_payload", "user_id and branch_id are required.", 422);
    if (userId === auth.userId) return fail("delete_self_forbidden", "Owner cannot delete own active access.", 409);

    const supabase = getSupabaseServiceClient();
    const targetRole = await getTargetRole({ tenantId: auth.tenantId!, branchId, userId });
    if (!targetRole) return fail("user_not_found", "User was not found in this branch.", 404);

    const deleteScope = await supabase
      .from("pos_user_device_scopes")
      .delete()
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", branchId)
      .eq("user_id", userId);
    if (deleteScope.error && !isMissingRelationError(deleteScope.error, "pos_user_device_scopes")) {
      return fail("pos_user_scope_delete_failed", deleteScope.error.message, 500);
    }

    const { error: deleteRoleError } = await supabase
      .from("user_branch_roles")
      .delete()
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", branchId)
      .eq("user_id", userId);
    if (deleteRoleError) return fail("user_delete_failed", deleteRoleError.message, 500);

    const { count } = await supabase.from("user_branch_roles").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if ((count ?? 0) === 0) await supabase.from("users_profiles").update({ is_active: false }).eq("id", userId);

    void appendAuditLog({
      tenantId: auth.tenantId!,
      branchId,
      actorUserId: auth.userId,
      actorRole: "owner",
      targetUserId: userId,
      action: "pos_user_deleted",
      targetTable: "user_branch_roles",
      targetId: userId,
      metadata: { target_role: targetRole }
    });

    return ok({ user_id: userId, branch_id: branchId, deleted: true });
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}
