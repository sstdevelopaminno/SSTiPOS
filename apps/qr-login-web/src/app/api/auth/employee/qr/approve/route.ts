import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";
import { getRequestMeta, writeAuditLog } from "@/lib/server/audit-log";
import { hasPermission, resolveEmployeeByCode } from "@/lib/server/pre-entry-auth";

type RequestBody = {
  qr_token?: string;
  qr_payload?: unknown;
  employee_code?: string;
  user_identifier?: string;
};

type ParsedPayload = {
  token: string | null;
  storeCode: string | null;
  branchCode: string | null;
};

type TokenRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  user_id: string | null;
  status: "active" | "used" | "expired" | "revoked";
  expires_at: string;
  token_hash: string | null;
  metadata: Record<string, unknown> | null;
};

function normalize(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  return v || null;
}

function toUpper(value: string | null | undefined) {
  const v = String(value ?? "").trim().toUpperCase();
  return v || null;
}

function parsePayload(payload: unknown): ParsedPayload {
  if (typeof payload === "string") {
    const raw = payload.trim();
    if (!raw) return { token: null, storeCode: null, branchCode: null };
    if (raw.startsWith("{") && raw.endsWith("}")) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return {
          token: normalize(typeof parsed.token === "string" ? parsed.token : typeof parsed.qr_token === "string" ? parsed.qr_token : null),
          storeCode: toUpper(typeof parsed.store_code === "string" ? parsed.store_code : null),
          branchCode: toUpper(typeof parsed.branch_code === "string" ? parsed.branch_code : null)
        };
      } catch {
        return { token: normalize(raw), storeCode: null, branchCode: null };
      }
    }

    return { token: normalize(raw), storeCode: null, branchCode: null };
  }

  if (!payload || typeof payload !== "object") {
    return { token: null, storeCode: null, branchCode: null };
  }

  const value = payload as Record<string, unknown>;
  return {
    token: normalize(typeof value.token === "string" ? value.token : typeof value.qr_token === "string" ? value.qr_token : null),
    storeCode: toUpper(typeof value.store_code === "string" ? value.store_code : null),
    branchCode: toUpper(typeof value.branch_code === "string" ? value.branch_code : null)
  };
}

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function isSecretMatch(expected: string, provided: string | null) {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided ?? "", "utf8");
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

async function findTokenRow(token: string): Promise<TokenRow | null> {
  const supabase = getSupabaseServiceClient();
  const tokenHash = hashToken(token);

  const { data: hashedRow } = await supabase
    .from("pos_qr_login_tokens")
    .select("id,tenant_id,branch_id,user_id,status,expires_at,token_hash,metadata")
    .eq("token_hash", tokenHash)
    .limit(1)
    .maybeSingle<TokenRow>();
  if (!hashedRow) return null;
  return hashedRow;
}

async function resolveScopeCodes(input: { tenantId: string; branchId: string }) {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("branches")
    .select("code,tenants!inner(code)")
    .eq("id", input.branchId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle<{ code: string; tenants: { code: string } | Array<{ code: string }> }>();

  if (!data) return { storeCode: null, branchCode: null };
  const tenant = Array.isArray(data.tenants) ? data.tenants[0] : data.tenants;
  return {
    storeCode: toUpper(tenant?.code ?? null),
    branchCode: toUpper(data.code ?? null)
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const parsedPayload = parsePayload(body?.qr_payload);
  const qrToken = normalize(body?.qr_token) ?? parsedPayload.token;
  const employeeCode = normalize(body?.employee_code) ?? normalize(body?.user_identifier);

  if (!qrToken) {
    return NextResponse.json({ data: null, error: { code: "qr_token_required", message: "กรุณาระบุ QR Token" } }, { status: 400 });
  }
  if (!employeeCode) {
    return NextResponse.json({ data: null, error: { code: "employee_code_required", message: "กรุณาระบุรหัสผู้ใช้งาน" } }, { status: 400 });
  }

  const approvalSecret = normalize(process.env.POS_QR_APPROVAL_SECRET);
  if (!approvalSecret) {
    console.error("[auth/employee/qr/approve] missing POS_QR_APPROVAL_SECRET");
    return NextResponse.json(
      { data: null, error: { code: "approval_secret_missing", message: "ระบบยังไม่พร้อมยืนยัน QR โปรดติดต่อผู้ดูแลระบบ" } },
      { status: 503 }
    );
  }

  const providedSecret = normalize(request.headers.get("x-pos-qr-approval-key"));
  if (!isSecretMatch(approvalSecret, providedSecret)) {
    return NextResponse.json({ data: null, error: { code: "approval_unauthorized", message: "ไม่ได้รับอนุญาตให้ยืนยัน QR" } }, { status: 401 });
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const tokenRow = await findTokenRow(qrToken);
    if (!tokenRow) {
      return NextResponse.json({ data: null, error: { code: "qr_token_invalid", message: "ไม่พบ QR นี้ในระบบ" } }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    if (tokenRow.expires_at <= nowIso || tokenRow.status === "expired") {
      const supabase = getSupabaseServiceClient();
      await supabase.from("pos_qr_login_tokens").update({ status: "expired" }).eq("id", tokenRow.id).eq("status", "active");
      return NextResponse.json({ data: null, error: { code: "qr_token_expired", message: "QR หมดอายุแล้ว" } }, { status: 410 });
    }

    if (tokenRow.status === "revoked") {
      return NextResponse.json({ data: null, error: { code: "qr_token_revoked", message: "QR นี้ถูกยกเลิกแล้ว" } }, { status: 409 });
    }

    const scopedCodes = await resolveScopeCodes({ tenantId: tokenRow.tenant_id, branchId: tokenRow.branch_id });
    if (
      (parsedPayload.storeCode && scopedCodes.storeCode && parsedPayload.storeCode !== scopedCodes.storeCode) ||
      (parsedPayload.branchCode && scopedCodes.branchCode && parsedPayload.branchCode !== scopedCodes.branchCode)
    ) {
      return NextResponse.json({ data: null, error: { code: "qr_token_scope_mismatch", message: "QR นี้ไม่ตรงกับร้านหรือสาขา" } }, { status: 403 });
    }

    const employee = await resolveEmployeeByCode({
      tenantId: tokenRow.tenant_id,
      branchId: tokenRow.branch_id,
      employeeCode
    });

    if (!employee) {
      return NextResponse.json({ data: null, error: { code: "employee_not_found", message: "ไม่พบผู้ใช้งานในสาขานี้" } }, { status: 404 });
    }
    if (!hasPermission(employee.permissions, "pos.sales.access")) {
      return NextResponse.json({ data: null, error: { code: "permission_denied", message: "ผู้ใช้งานนี้ไม่มีสิทธิ์เข้าใช้งานระบบขาย" } }, { status: 403 });
    }

    if (tokenRow.status === "used") {
      if (tokenRow.user_id === employee.userId) {
        return NextResponse.json({
          data: {
            status: "approved",
            qr_token_id: tokenRow.id,
            employee: {
              id: employee.userId,
              code: employee.employeeCode,
              name: employee.fullName,
              role: employee.role
            }
          },
          error: null
        });
      }
      return NextResponse.json(
        { data: null, error: { code: "qr_token_used", message: "QR นี้ถูกยืนยันโดยผู้ใช้งานคนอื่นแล้ว" } },
        { status: 409 }
      );
    }

    const metadata = {
      ...(tokenRow.metadata ?? {}),
      approval_status: "approved",
      approved_at: nowIso,
      approved_employee_code: employee.employeeCode,
      approved_user_id: employee.userId,
      approved_role: employee.role
    };

    const supabase = getSupabaseServiceClient();
    const { data: updatedRows } = await supabase
      .from("pos_qr_login_tokens")
      .update({
        user_id: employee.userId,
        status: "used",
        used_at: nowIso,
        consumed_at: nowIso,
        metadata
      })
      .eq("id", tokenRow.id)
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .select("id")
      .limit(1);

    if ((updatedRows?.length ?? 0) === 0) {
      return NextResponse.json(
        { data: null, error: { code: "qr_token_invalid", message: "QR นี้ไม่พร้อมยืนยันแล้ว กรุณาสร้างใหม่" } },
        { status: 409 }
      );
    }

    await writeAuditLog({
      tenantId: tokenRow.tenant_id,
      branchId: tokenRow.branch_id,
      actorUserId: employee.userId,
      actorRole: employee.role,
      targetUserId: employee.userId,
      action: "qr_token_approved",
      targetType: "pos_qr_login_tokens",
      targetId: tokenRow.id,
      ipAddress,
      userAgent,
      metadata: {
        employee_code: employee.employeeCode,
        approved_source: "mobile_scanner"
      }
    });

    return NextResponse.json({
      data: {
        status: "approved",
        qr_token_id: tokenRow.id,
        employee: {
          id: employee.userId,
          code: employee.employeeCode,
          name: employee.fullName,
          role: employee.role
        },
        scope: {
          store_code: scopedCodes.storeCode,
          branch_code: scopedCodes.branchCode
        }
      },
      error: null
    });
  } catch (error) {
    console.error("[auth/employee/qr/approve] unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json({ data: null, error: { code: "employee_verify_failed", message: "ไม่สามารถยืนยัน QR ได้ในขณะนี้" } }, { status: 500 });
  }
}
