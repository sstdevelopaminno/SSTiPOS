import "server-only";

import { headers } from "next/headers";
import { getAuthContext, type AuthContext } from "@/lib/auth-context";
import { isItAdminPlatformRole } from "@/lib/it-admin-guard";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";
import { FeatureGateError } from "@/lib/feature-gate";
import { fail } from "@/lib/http";

export class ActivationAdminGuardError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 403) {
    super(message);
    this.name = "ActivationAdminGuardError";
    this.code = code;
    this.status = status;
  }
}

export type ActivationAdminContext = {
  auth: AuthContext;
  supabase: ReturnType<typeof getSupabaseServiceClient>;
  actorRole: "it_admin" | "it_support";
  requestMeta: {
    ipAddress: string | null;
    userAgent: string | null;
  };
};

function readIpAddress(headerStore: Headers) {
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  return forwarded || realIp || null;
}

export async function requireActivationAdmin(): Promise<ActivationAdminContext> {
  const auth = await getAuthContext({ requireBranchScope: false });
  if (!isItAdminPlatformRole(auth.platformRole)) {
    throw new ActivationAdminGuardError("forbidden", "Activation enrollment requires IT admin or IT support permission.", 403);
  }
  const actorRole = auth.platformRole;

  const headerStore = await headers();
  return {
    auth,
    supabase: getSupabaseServiceClient(),
    actorRole,
    requestMeta: {
      ipAddress: readIpAddress(headerStore),
      userAgent: headerStore.get("user-agent")
    }
  };
}

export async function assertActivationScope(input: {
  auth: AuthContext;
  tenantId: string;
  branchId?: string | null;
  allowTenantWide?: boolean;
}) {
  const tenantId = String(input.tenantId ?? "").trim();
  const branchId = String(input.branchId ?? "").trim() || null;
  if (!tenantId) {
    throw new ActivationAdminGuardError("missing_tenant_id", "tenant_id is required.", 422);
  }

  if (isItAdminPlatformRole(input.auth.platformRole)) {
    return { tenantId, branchId };
  }

  if (!input.auth.tenantId || input.auth.tenantId !== tenantId) {
    throw new ActivationAdminGuardError("scope_forbidden", "You can only manage activation in your tenant scope.", 403);
  }

  if (!input.allowTenantWide && !branchId) {
    throw new ActivationAdminGuardError("branch_scope_required", "branch_id is required for scoped activation actions.", 422);
  }

  if (branchId && input.auth.branchId !== branchId) {
    throw new ActivationAdminGuardError("scope_forbidden", "You can only manage activation in your assigned branch.", 403);
  }

  return { tenantId, branchId };
}

export function guardActivationAdminError(error: unknown): Response {
  if (error instanceof ActivationAdminGuardError) {
    return fail(error.code, error.message, error.status);
  }
  if (error instanceof FeatureGateError) {
    return fail(error.code, error.message, error.status);
  }
  return fail("activation_admin_internal_error", error instanceof Error ? error.message : "Internal server error.", 500);
}
