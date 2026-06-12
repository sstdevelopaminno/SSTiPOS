import { appendAuditLog } from "@/lib/audit-log";
import { getTenantLimits, invalidateTenantFeatureGateCache } from "@/lib/feature-gate";
import { fail, ok } from "@/lib/http";
import { guardItAdminError, parseTenantParam, requireItAdmin } from "@/lib/it-admin-guard";

type ContractPayload = {
  plan_id?: string;
  status?: "trial" | "active" | "suspended" | "expired" | "cancelled";
  start_date?: string;
  end_date?: string | null;
  max_branches?: number | null;
  max_devices?: number | null;
  max_users?: number | null;
};

type ContractRow = {
  id: string;
  tenant_id: string;
  package_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  branch_limit: number | null;
  terminal_limit_per_branch: number | null;
  max_branches: number | null;
  max_devices: number | null;
  max_users: number | null;
  created_at: string;
};

export async function GET(_req: Request, context: { params: Promise<{ tenantId: string }> }) {
  try {
    const { supabase } = await requireItAdmin({ permission: "contract_manage" });
    const { tenantId: tenantIdParam } = await context.params;
    const tenantId = parseTenantParam(tenantIdParam);

    const [{ data: plans, error: plansError }, { data: contract, error: contractError }, limits] = await Promise.all([
      supabase
        .from("subscription_packages")
        .select("id,code,name,monthly_price,max_branches,max_devices,max_users,status,is_active")
        .order("monthly_price", { ascending: true }),
      supabase
        .from("tenant_subscription_contracts")
        .select("id,tenant_id,package_id,status,started_at,ended_at,branch_limit,terminal_limit_per_branch,max_branches,max_devices,max_users,created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<ContractRow>(),
      getTenantLimits(tenantId)
    ]);

    if (plansError) {
      throw new Error(plansError.message);
    }
    if (contractError) {
      throw new Error(contractError.message);
    }

    return ok({
      plans: plans ?? [],
      active_contract: contract ?? null,
      limits
    });
  } catch (error) {
    return guardItAdminError(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ tenantId: string }> }) {
  try {
    const { auth, supabase, requestMeta } = await requireItAdmin({ permission: "contract_manage" });
    const { tenantId: tenantIdParam } = await context.params;
    const tenantId = parseTenantParam(tenantIdParam);
    const body = (await req.json().catch(() => ({}))) as ContractPayload;

    const { data: latestContract, error: latestError } = await supabase
      .from("tenant_subscription_contracts")
      .select("id,tenant_id,package_id,status,started_at,ended_at,branch_limit,terminal_limit_per_branch,max_branches,max_devices,max_users,created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<ContractRow>();

    if (latestError) {
      throw new Error(latestError.message);
    }

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {};

    if (typeof body.plan_id === "string" && body.plan_id.trim()) {
      patch.package_id = body.plan_id.trim();
    }
    if (typeof body.status === "string") {
      patch.status = body.status;
    }
    if (typeof body.start_date === "string" && body.start_date.trim()) {
      patch.started_at = `${body.start_date.trim()}T00:00:00.000Z`;
    }
    if (body.end_date === null) {
      patch.ended_at = null;
    } else if (typeof body.end_date === "string" && body.end_date.trim()) {
      patch.ended_at = `${body.end_date.trim()}T23:59:59.999Z`;
    }

    if (typeof body.max_branches === "number") {
      patch.max_branches = Math.max(1, Math.trunc(body.max_branches));
    }
    if (typeof body.max_devices === "number") {
      patch.max_devices = Math.max(1, Math.trunc(body.max_devices));
    }
    if (typeof body.max_users === "number") {
      patch.max_users = Math.max(1, Math.trunc(body.max_users));
    }

    if (Object.keys(patch).length === 0) {
      return fail("empty_patch", "No contract update fields provided.", 422);
    }

    let updated: ContractRow;
    if (latestContract) {
      const { data, error } = await supabase
        .from("tenant_subscription_contracts")
        .update(patch)
        .eq("id", latestContract.id)
        .eq("tenant_id", tenantId)
        .select("id,tenant_id,package_id,status,started_at,ended_at,branch_limit,terminal_limit_per_branch,max_branches,max_devices,max_users,created_at")
        .single<ContractRow>();

      if (error) {
        throw new Error(error.message);
      }
      updated = data;
    } else {
      if (!patch.package_id) {
        return fail("plan_required", "plan_id is required for initial contract creation.", 422);
      }
      const { data, error } = await supabase
        .from("tenant_subscription_contracts")
        .insert({
          tenant_id: tenantId,
          package_id: patch.package_id,
          contract_type: "saas",
          billing_interval: "monthly",
          deployment_mode: "cloud",
          status: patch.status ?? "trial",
          branch_limit: patch.max_branches ?? 1,
          terminal_limit_per_branch: patch.max_devices ?? 1,
          max_branches: patch.max_branches ?? 1,
          max_devices: patch.max_devices ?? 1,
          max_users: patch.max_users ?? null,
          amount_per_cycle: 0,
          currency: "THB",
          started_at: patch.started_at ?? nowIso,
          ended_at: patch.ended_at ?? null
        })
        .select("id,tenant_id,package_id,status,started_at,ended_at,branch_limit,terminal_limit_per_branch,max_branches,max_devices,max_users,created_at")
        .single<ContractRow>();

      if (error) {
        throw new Error(error.message);
      }
      updated = data;
    }

    invalidateTenantFeatureGateCache(tenantId);

    const planChanged = Boolean(latestContract && patch.package_id && latestContract.package_id !== patch.package_id);
    const previousStatus = latestContract?.status ?? null;
    const nextStatus = String(updated.status);

    if (planChanged) {
      await appendAuditLog({
        tenantId,
        actorUserId: auth.userId,
        actorRole: "it_admin",
        action: "plan_changed",
        targetTable: "tenant_subscription_contracts",
        targetId: updated.id,
        metadata: {
          from_plan_id: latestContract?.package_id ?? null,
          to_plan_id: updated.package_id
        },
        ipAddress: requestMeta.ipAddress ?? undefined,
        userAgent: requestMeta.userAgent ?? undefined
      });
    }

    if (previousStatus && previousStatus !== nextStatus) {
      if (nextStatus === "suspended") {
        await appendAuditLog({
          tenantId,
          actorUserId: auth.userId,
          actorRole: "it_admin",
          action: "contract_suspended",
          targetTable: "tenant_subscription_contracts",
          targetId: updated.id,
          metadata: {
            from_status: previousStatus,
            to_status: nextStatus
          },
          ipAddress: requestMeta.ipAddress ?? undefined,
          userAgent: requestMeta.userAgent ?? undefined
        });
      }

      if (previousStatus === "suspended" && (nextStatus === "active" || nextStatus === "trial")) {
        await appendAuditLog({
          tenantId,
          actorUserId: auth.userId,
          actorRole: "it_admin",
          action: "contract_reactivated",
          targetTable: "tenant_subscription_contracts",
          targetId: updated.id,
          metadata: {
            from_status: previousStatus,
            to_status: nextStatus
          },
          ipAddress: requestMeta.ipAddress ?? undefined,
          userAgent: requestMeta.userAgent ?? undefined
        });
      }
    }

    const limits = await getTenantLimits(tenantId);

    return ok({
      contract: updated,
      limits
    });
  } catch (error) {
    return guardItAdminError(error);
  }
}

