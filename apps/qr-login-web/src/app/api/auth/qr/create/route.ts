import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";
import { getRequestMeta, writeAuditLog } from "@/lib/server/audit-log";
import { hasBranchFeatureSafe } from "@/lib/server/feature-gate-safe";
import { buildRateLimitKey, enforceRateLimit, getClientIpAddress, readRateLimitSetting } from "@/lib/server/rate-limit";

type RequestBody = {
  store_code?: string;
  branch_id?: string;
  branch_code?: string;
};

type BranchRoleRow = {
  user_id: string;
  role: "owner" | "manager" | "staff";
};

type QrPayloadV1 = {
  v: 1;
  type: "pos_login";
  token: string;
  store_code: string;
  branch_code: string;
  issued_at: string;
  expires_at: string;
};

function resolveQrTokenTtlSeconds() {
  const raw = Number(process.env.POS_QR_TOKEN_TTL_SECONDS ?? 120);
  if (!Number.isFinite(raw)) return 120;
  const ttl = Math.trunc(raw);
  if (ttl < 30 || ttl > 600) return 120;
  return ttl;
}

async function renderQrSvg(token: string): Promise<string> {
  try {
    const qr = (await import("qrcode")) as { toString: (input: string, options: Record<string, unknown>) => Promise<string> };
    return await qr.toString(token, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 250 });
  } catch {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 250"><rect width="250" height="250" fill="#ffffff"/><text x="125" y="120" text-anchor="middle" font-family="monospace" font-size="14" fill="#0f172a">QR TOKEN</text><text x="125" y="145" text-anchor="middle" font-family="monospace" font-size="10" fill="#334155">${token.slice(0, 20)}</text></svg>`;
  }
}

function buildQrPayloadString(input: { token: string; storeCode: string; branchCode: string; issuedAt: string; expiresAt: string }) {
  const payload: QrPayloadV1 = {
    v: 1,
    type: "pos_login",
    token: input.token,
    store_code: input.storeCode,
    branch_code: input.branchCode,
    issued_at: input.issuedAt,
    expires_at: input.expiresAt
  };
  return JSON.stringify(payload);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const storeCode = String(body?.store_code ?? "").trim().toUpperCase();
  const branchIdInput = String(body?.branch_id ?? "").trim();
  const branchCodeInput = String(body?.branch_code ?? "").trim().toUpperCase();

  if (!storeCode) {
    return NextResponse.json({ data: null, error: { code: "invalid_payload", message: "กรุณากรอกรหัสร้านค้า" } }, { status: 400 });
  }

  const rateLimitMax = readRateLimitSetting("POS_QR_CREATE_RATE_LIMIT_MAX", 20, { min: 5, max: 500 });
  const rateLimitWindowSeconds = readRateLimitSetting("POS_PUBLIC_RATE_LIMIT_WINDOW_SECONDS", 60, { min: 10, max: 3600 });
  const rateLimitResult = await enforceRateLimit({
    namespace: "qr_create",
    key: buildRateLimitKey({
      namespace: "auth:qr:create",
      parts: [getClientIpAddress(request), storeCode, branchIdInput || branchCodeInput || "unknown-branch"]
    }),
    max: rateLimitMax,
    windowMs: rateLimitWindowSeconds * 1000,
    failClosedOnBackendError: true
  });
  if (!rateLimitResult.ok) {
    const limited = NextResponse.json(
      { data: null, error: { code: "rate_limited", message: "คำขอมากเกินไป กรุณาลองใหม่อีกครั้ง" } },
      { status: 429 }
    );
    limited.headers.set("Retry-After", String(rateLimitResult.retryAfterSeconds));
    return limited;
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const supabase = getSupabaseServiceClient();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id,code,name,is_active")
      .eq("code", storeCode)
      .maybeSingle<{ id: string; code: string; name: string; is_active: boolean }>();

    if (!tenant || tenant.is_active === false) {
      return NextResponse.json(
        { data: null, error: { code: "store_not_found", message: "ไม่พบรหัสร้านค้า หรือร้านค้ายังไม่เปิดใช้งาน" } },
        { status: 404 }
      );
    }

    const { data: branchRows } = await supabase
      .from("branches")
      .select("id,code,name,is_active")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true);

    const branches = (branchRows ?? []) as Array<{ id: string; code: string; name: string; is_active: boolean }>;
    const targetBranch =
      branches.find((branch) => branch.id === branchIdInput) ??
      branches.find((branch) => branch.code.toUpperCase() === branchCodeInput) ??
      (branches.length === 1 ? branches[0] : null);

    if (!targetBranch) {
      return NextResponse.json({ data: null, error: { code: "branch_required", message: "กรุณาเลือกสาขาก่อนสร้าง QR" } }, { status: 400 });
    }

    const qrFeatureEnabled = await hasBranchFeatureSafe(tenant.id, targetBranch.id, "qr_login");
    if (!qrFeatureEnabled) {
      return NextResponse.json(
        { data: null, error: { code: "feature_not_enabled", message: "สาขานี้ยังไม่เปิดใช้งานการยืนยันด้วย QR" } },
        { status: 403 }
      );
    }

    await supabase
      .from("pos_qr_login_tokens")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("tenant_id", tenant.id)
      .eq("branch_id", targetBranch.id)
      .eq("status", "active");

    const rawToken = crypto.randomBytes(24).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken, "utf8").digest("hex");
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + resolveQrTokenTtlSeconds() * 1000).toISOString();
    const qrPayload = buildQrPayloadString({
      token: rawToken,
      storeCode: tenant.code,
      branchCode: targetBranch.code,
      issuedAt,
      expiresAt
    });

    const baseMetadata = {
      source: "branch_qr_challenge",
      approval_status: "pending_mobile_scan",
      branch_code: targetBranch.code,
      store_code: tenant.code,
      issued_at: issuedAt
    };

    let insertedId: string | null = null;
    const insertErrors: string[] = [];
    const insertNullUser = await supabase
      .from("pos_qr_login_tokens")
      .insert({
        tenant_id: tenant.id,
        branch_id: targetBranch.id,
        user_id: null,
        token_hash: tokenHash,
        status: "active",
        expires_at: expiresAt,
        metadata: baseMetadata
      })
      .select("id")
      .single<{ id: string }>();

    if (insertNullUser.error?.message) {
      insertErrors.push(`null-user insert: ${insertNullUser.error.message}`);
    }
    if (insertNullUser.data?.id) {
      insertedId = insertNullUser.data.id;
    } else {
      // Backward compatibility for databases that still enforce user_id NOT NULL.
      const { data: roleRows } = await supabase
        .from("user_branch_roles")
        .select("user_id,role")
        .eq("tenant_id", tenant.id)
        .eq("branch_id", targetBranch.id);

      const scopedRoles = (roleRows ?? []) as BranchRoleRow[];
      const rolePriority: Record<BranchRoleRow["role"], number> = { owner: 0, manager: 1, staff: 2 };
      const placeholder = scopedRoles.sort((a, b) => rolePriority[a.role] - rolePriority[b.role])[0] ?? null;

      if (!placeholder?.user_id) {
        return NextResponse.json(
          { data: null, error: { code: "qr_create_failed", message: "ไม่พบผู้ใช้งานในสาขาเพื่อเตรียม QR" } },
          { status: 500 }
        );
      }

      const fallbackInsert = await supabase
        .from("pos_qr_login_tokens")
        .insert({
          tenant_id: tenant.id,
          branch_id: targetBranch.id,
          user_id: placeholder.user_id,
          token_hash: tokenHash,
          status: "active",
          expires_at: expiresAt,
          metadata: {
            ...baseMetadata,
            placeholder_user_id: placeholder.user_id,
            placeholder_role: placeholder.role
          }
        })
        .select("id")
        .single<{ id: string }>();

      if (fallbackInsert.error?.message) {
        insertErrors.push(`placeholder-user insert: ${fallbackInsert.error.message}`);
      }
      if (fallbackInsert.data?.id) {
        insertedId = fallbackInsert.data.id;
      }
    }

    if (!insertedId) {
      if (insertErrors.length > 0) {
        console.error("[auth/qr/create] insert failed", {
          tenantId: tenant.id,
          branchId: targetBranch.id,
          insertErrors
        });
      }
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "qr_create_failed",
            message: "ไม่สามารถสร้าง QR Token ได้"
          }
        },
        { status: 500 }
      );
    }

    const qrSvg = await renderQrSvg(qrPayload);

    await writeAuditLog({
      tenantId: tenant.id,
      branchId: targetBranch.id,
      actorRole: "system",
      action: "qr_token_created",
      targetType: "pos_qr_login_tokens",
      targetId: insertedId,
      ipAddress,
      userAgent,
      metadata: {
        mode: "branch_scope",
        expires_at: expiresAt
      }
    });

    return NextResponse.json({
      data: {
        token: rawToken,
        qr_payload: qrPayload,
        expires_at: expiresAt,
        status: "ready",
        qr_svg: qrSvg,
        branch: {
          id: targetBranch.id,
          code: targetBranch.code,
          name: targetBranch.name
        },
        tenant: {
          name: tenant.name,
          code: tenant.code
        }
      },
      error: null
    });
  } catch (error) {
    console.error("[auth/qr/create] unexpected error", {
      storeCode,
      branchIdInput,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json({ data: null, error: { code: "qr_create_failed", message: "ไม่สามารถสร้าง QR Token ได้ในขณะนี้" } }, { status: 500 });
  }
}
