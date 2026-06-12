import { getAuthContext } from "@/lib/auth-context";
import { appendAuditLog } from "@/lib/audit-log";
import { ok, fail } from "@/lib/http";
import { hasItAdminPermission, isItAdminPlatformRole } from "@/lib/it-admin-guard";

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext({ requireBranchScope: false });

    if (!isItAdminPlatformRole(auth.platformRole) || !hasItAdminPermission(auth.platformRole, "tenant_manage")) {
      return fail("forbidden", "Only IT admin or IT support can create tenants.", 403);
    }

    const body = (await req.json()) as {
      code: string;
      name: string;
      package_id: string;
    };

    const tenantId = crypto.randomUUID();

    await appendAuditLog({
      actorUserId: auth.userId,
      actorRole: auth.platformRole,
      action: "tenant_created",
      targetTable: "tenants",
      targetId: tenantId,
      metadata: body
    });

    return ok({ id: tenantId, ...body }, 201);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

