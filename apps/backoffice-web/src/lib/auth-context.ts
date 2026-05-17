import type { BranchRole, PlatformRole } from "@pos/shared-types";
import { headers } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type AuthContextInput = {
  requireBranchScope?: boolean;
};

export type AuthContext = {
  userId: string;
  platformRole: PlatformRole;
  tenantId: string | null;
  branchId: string | null;
  branchRole: BranchRole | null;
};

const branchRoles: BranchRole[] = ["owner", "manager", "staff"];
const platformRoles: PlatformRole[] = ["it_admin", "tenant_user"];

function parseRole<T extends string>(value: unknown, allowed: T[]): T | null {
  if (typeof value !== "string") {
    return null;
  }

  return allowed.includes(value as T) ? (value as T) : null;
}

function getFallbackContext(): AuthContext | null {
  const userId = process.env.DEV_AUTH_USER_ID;
  const tenantId = process.env.DEV_AUTH_TENANT_ID ?? null;
  const branchId = process.env.DEV_AUTH_BRANCH_ID ?? null;
  const branchRole = parseRole(process.env.DEV_AUTH_BRANCH_ROLE, branchRoles);
  const platformRole = parseRole(process.env.DEV_AUTH_PLATFORM_ROLE, platformRoles) ?? "tenant_user";

  if (!userId) {
    return null;
  }

  return {
    userId,
    tenantId,
    branchId,
    branchRole,
    platformRole
  };
}

function assertBranchScope(context: AuthContext) {
  if (!context.tenantId || !context.branchId || !context.branchRole) {
    throw new Error("Missing tenant/branch claims in authenticated context.");
  }
}

export async function getAuthContext(input: AuthContextInput = {}): Promise<AuthContext> {
  const { requireBranchScope = true } = input;
  const supabase = await getSupabaseServerClient();
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization") ?? headerStore.get("Authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  const { data, error } = bearerToken ? await supabase.auth.getUser(bearerToken) : await supabase.auth.getUser();

  if (error || !data.user) {
    const fallback = getFallbackContext();

    if (!fallback) {
      throw new Error("User is not authenticated.");
    }

    if (requireBranchScope) {
      assertBranchScope(fallback);
    }

    return fallback;
  }

  const appMeta = data.user.app_metadata ?? {};
  const claims = {
    tenant_id: appMeta.tenant_id,
    branch_id: appMeta.branch_id,
    branch_role: appMeta.branch_role,
    platform_role: appMeta.platform_role
  };

  const context: AuthContext = {
    userId: data.user.id,
    tenantId: typeof claims.tenant_id === "string" ? claims.tenant_id : null,
    branchId: typeof claims.branch_id === "string" ? claims.branch_id : null,
    branchRole: parseRole(claims.branch_role, branchRoles),
    platformRole: parseRole(claims.platform_role, platformRoles) ?? "tenant_user"
  };

  if (requireBranchScope) {
    assertBranchScope(context);
  }

  return context;
}

