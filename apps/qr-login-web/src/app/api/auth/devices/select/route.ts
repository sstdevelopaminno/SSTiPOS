import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";
import { getRequestMeta, writeAuditLog, writeLoginAttempt } from "@/lib/server/audit-log";
import { hasBranchFeatureSafe } from "@/lib/server/feature-gate-safe";
import { consumeLoginContext } from "@/lib/server/login-context";
import { createPosSession, createSessionHandoffToken, resolvePosRedirectTarget, resolveSessionCookieConfig } from "@/lib/server/pos-session";
import { hasPermission, resolveEmployeeByUserId } from "@/lib/server/pre-entry-auth";
import { clearPreEntryFlowState, hasFlowStage, readPreEntryFlowState } from "@/lib/server/pre-entry-state";

type RequestBody = {
  device_code?: string;
  force_override?: boolean;
};

type DeviceRow = {
  id: string;
  device_code: string;
  device_name: string;
  status: "active" | "inactive" | "maintenance";
};

type ActiveSessionRow = {
  id: string;
  user_id: string;
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status });
}

function isSafeDeviceCode(value: string) {
  return /^[A-Z0-9_-]{1,64}$/.test(value);
}

async function runBestEffort(label: string, action: () => PromiseLike<unknown> | unknown) {
  try {
    await action();
  } catch (error) {
    console.error(`[auth/devices/select] best-effort task failed: ${label}`, {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const selectedDeviceCode = String(body?.device_code ?? "").trim().toUpperCase();
  const forceOverride = Boolean(body?.force_override);

  if (!selectedDeviceCode) {
    return jsonError(400, "device_required", "กรุณาเลือกเครื่องแคชเชียร์");
  }
  if (!isSafeDeviceCode(selectedDeviceCode)) {
    return jsonError(422, "device_required", "รูปแบบรหัสเครื่องไม่ถูกต้อง");
  }

  const cookieStore = await cookies();
  const flow = readPreEntryFlowState(cookieStore);
  if (!flow) {
    return jsonError(401, "missing_employee_context", "กรุณายืนยันตัวตนพนักงานก่อนเลือกเครื่องแคชเชียร์");
  }
  if (!hasFlowStage(flow, ["employee_verified"]) || !flow.branchId || !flow.userId || !flow.userRole || !flow.permissions) {
    return jsonError(401, "missing_employee_context", "กรุณายืนยันตัวตนพนักงานก่อนเลือกเครื่องแคชเชียร์");
  }

  const { ipAddress, userAgent } = getRequestMeta(request);
  const nowIso = new Date().toISOString();

  try {
    const supabase = getSupabaseServiceClient();

    const [coreSalesEnabled, deviceQuery, employee] = await Promise.all([
      hasBranchFeatureSafe(flow.tenantId, flow.branchId, "core_pos_sales"),
      supabase
        .from("branch_devices")
        .select("id,device_code,device_name,status")
        .eq("tenant_id", flow.tenantId)
        .eq("branch_id", flow.branchId)
        .eq("device_code", selectedDeviceCode)
        .maybeSingle<DeviceRow>(),
      resolveEmployeeByUserId({
        tenantId: flow.tenantId,
        branchId: flow.branchId,
        userId: flow.userId
      })
    ]);

    if (!coreSalesEnabled) {
      return jsonError(403, "feature_not_enabled", "แพ็กเกจปัจจุบันยังไม่รองรับการเข้าใช้งานหน้าขาย");
    }
    if (!employee) {
      return jsonError(401, "employee_not_found", "ไม่พบผู้ใช้งานในสาขานี้ หรือผู้ใช้งานไม่พร้อมใช้งาน");
    }
    if (!hasPermission(employee.permissions, "pos.sales.access")) {
      return jsonError(403, "permission_denied", "ผู้ใช้งานไม่มีสิทธิ์เข้าใช้งานหน้าขาย");
    }

    if (deviceQuery.error) {
      return jsonError(500, "device_select_failed", "ไม่สามารถตรวจสอบข้อมูลเครื่องแคชเชียร์ได้");
    }

    const device = deviceQuery.data;
    if (!device) {
      return jsonError(404, "device_not_found", "ไม่พบเครื่องแคชเชียร์ที่เลือก");
    }

    if (device.status === "inactive") {
      return jsonError(403, "device_disabled", "เครื่องที่เลือกถูกปิดใช้งาน");
    }

    if (device.status === "maintenance") {
      return jsonError(403, "device_offline", "เครื่องที่เลือกออฟไลน์หรืออยู่ระหว่างบำรุงรักษา");
    }

    const activeSessionQuery = await supabase
      .from("pos_sessions")
      .select("id,user_id")
      .eq("tenant_id", flow.tenantId)
      .eq("branch_id", flow.branchId)
      .eq("status", "active")
      .or(`device_id.eq.${device.id},device_code.eq.${selectedDeviceCode}`)
      .gt("expires_at", nowIso)
      .limit(1)
      .maybeSingle<ActiveSessionRow>();

    if (activeSessionQuery.error) {
      return jsonError(500, "device_select_failed", "ไม่สามารถตรวจสอบสถานะเครื่องได้");
    }

    const activeSession = activeSessionQuery.data;
    if (activeSession && activeSession.user_id !== employee.userId) {
      const canOverride = hasPermission(employee.permissions, "pos.device.override_in_use");
      if (!canOverride || !forceOverride) {
        return jsonError(409, "device_in_use", "เครื่องนี้กำลังถูกใช้งานอยู่");
      }

      const revokeResult = await supabase
        .from("pos_sessions")
        .update({ status: "revoked", revoked_at: nowIso })
        .eq("id", activeSession.id)
        .eq("status", "active");

      if (revokeResult.error) {
        return jsonError(500, "device_select_failed", "ไม่สามารถปลดล็อกเครื่องที่กำลังใช้งานอยู่ได้");
      }
    }

    const contextExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const contextResult = await supabase
      .from("pos_login_contexts")
      .insert({
        tenant_id: flow.tenantId,
        branch_id: flow.branchId,
        store_code: flow.storeCode,
        device_code: selectedDeviceCode,
        status: "active",
        expires_at: contextExpiresAt,
        metadata: {
          context_type: "pre_entry_device_selection",
          employee_user_id: employee.userId,
          employee_role: employee.role,
          employee_auth_method: flow.employeeAuthMethod ?? "employee_code"
        }
      })
      .select("id")
      .single<{ id: string }>();

    if (contextResult.error || !contextResult.data?.id) {
      return jsonError(500, "context_create_failed", "ไม่สามารถสร้างบริบทการเข้าสู่ระบบได้");
    }

    const contextId = contextResult.data.id;
    const loginMethod = flow.employeeAuthMethod === "qr" ? "qr" : "staff_card";

    const sessionCreated = await createPosSession({
      tenantId: flow.tenantId,
      branchId: flow.branchId,
      deviceId: device.id,
      deviceCode: selectedDeviceCode,
      userId: employee.userId,
      role: employee.role,
      loginContextId: contextId,
      loginMethod,
      metadata: {
        source: "pre_entry_flow",
        employee_auth_method: flow.employeeAuthMethod ?? "employee_code",
        employee_code: employee.employeeCode ?? flow.employeeCode ?? null
      }
    });

    if (!sessionCreated.ok) {
      if (sessionCreated.code === "session_scope_conflict") {
        return jsonError(409, "device_in_use", "เครื่องนี้กำลังถูกใช้งานอยู่");
      }
      return jsonError(500, sessionCreated.code, "ไม่สามารถสร้าง POS Session ได้");
    }

    await Promise.all([
      runBestEffort("consume_login_context", () => consumeLoginContext(contextId)),
      runBestEffort("touch_branch_device", () => supabase.from("branch_devices").update({ last_seen_at: nowIso }).eq("id", device.id)),
      runBestEffort("write_login_attempt", () =>
        writeLoginAttempt({
          tenantId: flow.tenantId,
          branchId: flow.branchId,
          userId: employee.userId,
          deviceCode: selectedDeviceCode,
          loginContextId: contextId,
          loginMethod,
          success: true,
          ipAddress,
          userAgent,
          metadata: {
            source: "pre_entry_flow_device_select"
          }
        })
      ),
      runBestEffort("write_audit_device_selected", () =>
        writeAuditLog({
          tenantId: flow.tenantId,
          branchId: flow.branchId,
          actorUserId: employee.userId,
          actorRole: employee.role,
          targetUserId: employee.userId,
          deviceCode: selectedDeviceCode,
          posSessionId: sessionCreated.session.id,
          action: "device_selected",
          targetType: "branch_devices",
          targetId: device.id,
          ipAddress,
          userAgent,
          metadata: {
            device_code: selectedDeviceCode,
            device_name: device.device_name
          }
        })
      ),
      runBestEffort("write_audit_session_created", () =>
        writeAuditLog({
          tenantId: flow.tenantId,
          branchId: flow.branchId,
          actorUserId: employee.userId,
          actorRole: employee.role,
          targetUserId: employee.userId,
          deviceCode: selectedDeviceCode,
          posSessionId: sessionCreated.session.id,
          action: "session_created",
          targetType: "pos_session",
          targetId: sessionCreated.session.id,
          ipAddress,
          userAgent,
          metadata: {
            login_method: loginMethod
          }
        })
      )
    ]);

    const token = createSessionHandoffToken({
      sessionId: sessionCreated.session.id,
      tenantId: flow.tenantId,
      branchId: flow.branchId,
      userId: employee.userId,
      role: employee.role
    });

    const cookieConfig = resolveSessionCookieConfig();
    const response = NextResponse.json({
      data: {
        redirect_to: resolvePosRedirectTarget(),
        session_id: sessionCreated.session.id
      },
      error: null
    });

    response.cookies.set({
      name: cookieConfig.name,
      value: token,
      httpOnly: true,
      secure: cookieConfig.secure,
      sameSite: "lax",
      path: "/",
      domain: cookieConfig.domain,
      maxAge: 120
    });
    response.cookies.set({
      name: cookieConfig.sessionIdName,
      value: sessionCreated.session.id,
      httpOnly: true,
      secure: cookieConfig.secure,
      sameSite: "lax",
      path: "/",
      domain: cookieConfig.domain,
      maxAge: cookieConfig.sessionMaxAgeSeconds
    });

    clearPreEntryFlowState(response);
    return response;
  } catch (error) {
    console.error("[auth/devices/select] unexpected error", {
      tenantId: flow.tenantId,
      branchId: flow.branchId,
      userId: flow.userId,
      deviceCode: selectedDeviceCode,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return jsonError(500, "device_select_failed", "ไม่สามารถเข้าใช้งานเครื่องที่เลือกได้");
  }
}
