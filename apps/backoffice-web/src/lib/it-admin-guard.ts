import "server-only";

import { headers } from "next/headers";
import { getAuthContext, type AuthContext } from "@/lib/auth-context";
import { FeatureGateError } from "@/lib/feature-gate";
import { fail } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

export type ItAdminContext = {
  auth: AuthContext;
  supabase: ReturnType<typeof getSupabaseServiceClient>;
  requestMeta: {
    ipAddress: string | null;
    userAgent: string | null;
  };
};

export type ItAdminPermission =
  | "tenant_manage"
  | "branch_manage"
  | "contract_manage"
  | "user_role_manage"
  | "user_role_delete"
  | "session_manage"
  | "shift_manage"
  | "audit_read"
  | "monitoring_read"
  | "package_read"
  | "feature_manage"
  | "device_manage"
  | "platform_user_manage"
  | "settings_manage"
  | "login_policy_manage"
  | "customer_display_manage";

export class ItAdminGuardError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 403) {
    super(message);
    this.name = "ItAdminGuardError";
    this.code = code;
    this.status = status;
  }
}

export function isItAdminPlatformRole(role: string | null | undefined): role is "it_admin" | "it_support" {
  return role === "it_admin" || role === "it_support";
}

const itSupportPermissions = new Set<ItAdminPermission>([
  "tenant_manage",
  "branch_manage",
  "contract_manage",
  "user_role_manage",
  "session_manage",
  "shift_manage",
  "audit_read",
  "monitoring_read",
  "package_read"
]);

export function hasItAdminPermission(
  role: string | null | undefined,
  permission: ItAdminPermission
): boolean {
  if (role === "it_admin") return true;
  if (role === "it_support") return itSupportPermissions.has(permission);
  return false;
}

export function assertItAdminPermission(auth: AuthContext, permission: ItAdminPermission) {
  if (!hasItAdminPermission(auth.platformRole, permission)) {
    throw new ItAdminGuardError(
      "it_admin_permission_denied",
      "This IT admin action is not allowed for your role.",
      403
    );
  }
}

function readIpAddress(headerStore: Headers): string | null {
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  return forwarded || realIp || null;
}

export async function requireItAdmin(input: { permission?: ItAdminPermission } = {}): Promise<ItAdminContext> {
  const auth = await getAuthContext({ requireBranchScope: false });
  if (!isItAdminPlatformRole(auth.platformRole)) {
    throw new ItAdminGuardError("forbidden", "Only IT admin or IT support can access this endpoint.", 403);
  }
  if (input.permission) {
    assertItAdminPermission(auth, input.permission);
  }

  const headerStore = await headers();
  return {
    auth,
    supabase: getSupabaseServiceClient(),
    requestMeta: {
      ipAddress: readIpAddress(headerStore),
      userAgent: headerStore.get("user-agent")
    }
  };
}

export function parseTenantParam(raw: string | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) {
    throw new ItAdminGuardError("missing_tenant_id", "tenantId is required.", 422);
  }
  return value;
}

export function parseBranchParam(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value || null;
}

export function guardItAdminError(error: unknown): Response {
  if (error instanceof ItAdminGuardError) {
    return fail(error.code, error.message, error.status);
  }
  if (error instanceof FeatureGateError) {
    return fail(error.code, error.message, error.status);
  }

  return fail("it_admin_internal_error", "Internal server error.", 500);
}
