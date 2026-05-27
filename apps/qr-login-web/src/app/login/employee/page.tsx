"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { PreEntryShell } from "@/components/pre-entry/pre-entry-shell";

type SessionContextResponse = {
  data?: {
    stage: string;
    tenant: { id: string; code: string | null; name: string | null } | null;
    branch: { id: string; code: string | null; name: string | null } | null;
  } | null;
};

type VerifyCodeResponse = {
  data?: { next_step: "devices" } | null;
  error?: { code: string; message: string } | null;
};

type QrCreateResponse = {
  data?: {
    token: string;
    expires_at: string;
    status: "ready";
    qr_svg: string;
    branch?: {
      id: string;
      code: string;
      name: string;
    };
  } | null;
  error?: { code: string; message: string } | null;
};

type QrStatusResponse = {
  data?:
    | {
        status: "pending" | "expired" | "revoked";
        expires_at: string;
      }
    | {
        status: "approved";
        next_step: "devices";
      }
    | null;
  error?: { code: string; message: string } | null;
};

type PopupState =
  | { type: "none" }
  | { type: "loading"; message: string }
  | { type: "error"; message: string };

type QrPayloadState = {
  token: string;
  expiresAt: string;
  qrSvg: string;
  branchName: string;
  branchCode: string;
};

function mapEmployeeError(code?: string | null, fallback?: string | null) {
  if (code === "employee_code_required") return "กรุณากรอกรหัสผู้ใช้งาน";
  if (code === "qr_token_required") return "กรุณาสแกนหรือกรอก QR Token";
  if (code === "employee_not_found") return "ไม่พบผู้ใช้งานในสาขานี้";
  if (code === "employee_mismatch") return "ผู้ใช้งานที่ยืนยันจากมือถือไม่ตรงกับข้อมูลที่ระบุ";
  if (code === "permission_denied") return "ผู้ใช้งานนี้ไม่มีสิทธิ์เข้าใช้งานระบบขาย";
  if (code === "feature_not_enabled") return "สาขานี้ยังไม่เปิดใช้งานวิธีล็อคอินที่เลือก";
  if (code === "missing_branch_context") return "กรุณาเลือกสาขาก่อนยืนยันผู้ใช้งาน";
  if (code === "branch_required") return "ไม่พบข้อมูลสาขา กรุณาเริ่มที่หน้าร้านค้าใหม่";
  if (code === "store_not_found") return "ไม่พบข้อมูลร้านค้าสำหรับสร้าง QR";
  if (code === "qr_token_invalid") return "QR ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาสร้างใหม่";
  if (code === "qr_token_scope_mismatch") return "QR นี้ไม่ตรงกับร้านหรือสาขาที่เลือก";
  if (code === "session_scope_conflict") return "มีผู้ใช้งานอื่นเข้าเครื่องนี้อยู่แล้ว กรุณาเลือกเครื่องใหม่หรือลองอีกครั้ง";
  if (code === "qr_token_not_approved") return "กำลังรอการยืนยันจากแอปมือถือ";
  if (code === "employee_verify_failed") return "ไม่สามารถยืนยันผู้ใช้งานได้ในขณะนี้";
  return fallback ?? "ไม่สามารถยืนยันผู้ใช้งานได้";
}

function isRetryableRequestError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return error instanceof TypeError;
}

function mapNetworkErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "หมดเวลาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง";
  }
  return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้";
}

function normalizeEmployeeCodeInput(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9@._-]/g, "")
    .slice(0, 32);
}

function isEmployeeCodeFormatValid(employeeCode: string) {
  return /^[A-Z0-9@._-]{3,32}$/.test(employeeCode);
}

function formatRemainingTime(expiresAt: string, nowMs = Date.now()) {
  const remainMs = new Date(expiresAt).getTime() - nowMs;
  if (remainMs <= 0) return "หมดอายุแล้ว";
  const sec = Math.floor(remainMs / 1000);
  const min = Math.floor(sec / 60);
  const leftSec = sec % 60;
  return `${min}:${String(leftSec).padStart(2, "0")} นาที`;
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchJsonWithRetry<T>(input: RequestInfo | URL, init?: RequestInit) {
  const attempts = 2;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, init);
      const body = (await response.json().catch(() => null)) as T | null;
      return { response, body };
    } catch (error) {
      lastError = error;
      if (!isRetryableRequestError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 350 * attempt));
    }
  }

  throw lastError;
}

function LoginEmployeePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow") === "single" ? "single" : "multi";
  const [tab, setTab] = useState<"code" | "qr">("code");
  const [storeCode, setStoreCode] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrWaiting, setQrWaiting] = useState(false);
  const [qrPayload, setQrPayload] = useState<QrPayloadState | null>(null);
  const [qrClockMs, setQrClockMs] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [popup, setPopup] = useState<PopupState>({ type: "none" });

  const pollTimerRef = useRef<number | null>(null);
  const pollInFlightRef = useRef(false);
  const pollFailCountRef = useRef(0);
  const mountedRef = useRef(true);
  const tabRef = useRef<"code" | "qr">("code");
  const qrAutoRequestedRef = useRef(false);

  const isCodeMode = tab === "code";
  const normalizedEmployeeCode = employeeCode.trim().toUpperCase();
  const qrTimeLeft = qrPayload ? formatRemainingTime(qrPayload.expiresAt, qrClockMs) : "";

  function stopQrPolling() {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollInFlightRef.current = false;
    pollFailCountRef.current = 0;
  }

  function clearErrors() {
    if (error) setError("");
    if (popup.type === "error") setPopup({ type: "none" });
  }

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopQrPolling();
    };
  }, []);

  useEffect(() => {
    if (!qrPayload) return;
    const timerId = window.setInterval(() => {
      if (!mountedRef.current) return;
      setQrClockMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [qrPayload]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const { response, body } = await fetchJsonWithRetry<SessionContextResponse>("/api/auth/session/context");
        if (!response.ok) return;

        const stage = body?.data?.stage ?? "none";
        if (stage === "none" || stage === "store_verified") {
          router.replace("/login/store");
          return;
        }
        if (body?.data?.tenant?.code && mounted) {
          setStoreCode(body.data.tenant.code.toUpperCase());
        }
        if (body?.data?.branch?.id && mounted) {
          setBranchId(body.data.branch.id);
        }
        if (body?.data?.branch?.name && mounted) {
          setBranchName(body.data.branch.name);
        }
        if (body?.data?.branch?.code && mounted) {
          setBranchCode(body.data.branch.code.toUpperCase());
        }
        if (stage === "employee_verified") {
          router.replace(`/login/devices?flow=${flow}`);
        }
      } catch (requestError) {
        if (mounted) {
          const message = mapNetworkErrorMessage(requestError);
          setError(message);
          setPopup({ type: "error", message });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [flow, router]);

  useEffect(() => {
    if (tab !== "qr") return;
    if (!storeCode || !branchId || loading || qrWaiting || qrPayload || qrAutoRequestedRef.current) return;
    qrAutoRequestedRef.current = true;
    void submitQrFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, storeCode, branchId, loading, qrWaiting, qrPayload]);

  useEffect(() => {
    if (tab === "code") return;
    return () => {
      stopQrPolling();
    };
  }, [tab]);

  async function submitByCode() {
    const normalizedCode = normalizedEmployeeCode;
    if (!normalizedCode) {
      const message = "กรุณากรอกรหัสผู้ใช้งาน";
      setError(message);
      setPopup({ type: "error", message });
      return;
    }
    if (!isEmployeeCodeFormatValid(normalizedCode)) {
      const message = "รูปแบบรหัสผู้ใช้งานไม่ถูกต้อง";
      setError(message);
      setPopup({ type: "error", message });
      return;
    }

    setLoading(true);
    setError("");
    setPopup({ type: "loading", message: "กำลังตรวจสอบข้อมูลผู้ใช้งาน..." });

    let hasFailure = false;
    let shouldNavigate = false;

    try {
      const { response, body } = await fetchJsonWithRetry<VerifyCodeResponse>("/api/auth/employee/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_code: normalizedCode })
      });

      if (!response.ok || !body?.data || body.data.next_step !== "devices") {
        const message = mapEmployeeError(body?.error?.code, body?.error?.message);
        setError(message);
        setPopup({ type: "error", message });
        hasFailure = true;
        return;
      }

      shouldNavigate = true;
    } catch (requestError) {
      const message = mapNetworkErrorMessage(requestError);
      setError(message);
      setPopup({ type: "error", message });
      hasFailure = true;
    } finally {
      setLoading(false);
      if (shouldNavigate) {
        setPopup({ type: "none" });
        router.push(`/login/devices?flow=${flow}`);
      } else if (!hasFailure) {
        setPopup({ type: "none" });
      }
    }
  }

  function scheduleNextPoll(poller: () => Promise<void>) {
    pollTimerRef.current = window.setTimeout(() => {
      void poller();
    }, 1400);
  }

  function startQrPolling(token: string) {
    stopQrPolling();
    pollFailCountRef.current = 0;

    const poller = async () => {
      if (!mountedRef.current || tabRef.current !== "qr") return;
      if (pollInFlightRef.current) {
        scheduleNextPoll(poller);
        return;
      }

      pollInFlightRef.current = true;

      try {
        const { response, body } = await fetchJsonWithRetry<QrStatusResponse>("/api/auth/employee/qr/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qr_token: token
          })
        });

        pollFailCountRef.current = 0;
        const status = body?.data?.status ?? null;

        if (response.ok && status === "approved") {
          stopQrPolling();
          setQrWaiting(false);
          setPopup({ type: "none" });
          router.push(`/login/devices?flow=${flow}`);
          return;
        }

        if (status === "pending") {
          setPopup({ type: "none" });
          scheduleNextPoll(poller);
          return;
        }

        if (status === "expired") {
          stopQrPolling();
          setQrWaiting(false);
          const message = "QR หมดอายุแล้ว กรุณากดสร้าง QR ใหม่";
          setError(message);
          setPopup({ type: "error", message });
          return;
        }

        if (status === "revoked") {
          stopQrPolling();
          setQrWaiting(false);
          const message = "QR นี้ถูกยกเลิกแล้ว กรุณาสร้าง QR ใหม่";
          setError(message);
          setPopup({ type: "error", message });
          return;
        }

        const message = mapEmployeeError(body?.error?.code, body?.error?.message);
        stopQrPolling();
        setQrWaiting(false);
        setError(message);
        setPopup({ type: "error", message });
      } catch (requestError) {
        pollFailCountRef.current += 1;
        if (pollFailCountRef.current >= 3) {
          stopQrPolling();
          setQrWaiting(false);
          const message = mapNetworkErrorMessage(requestError);
          setError(message);
          setPopup({ type: "error", message });
          return;
        }
        scheduleNextPoll(poller);
      } finally {
        pollInFlightRef.current = false;
      }
    };

    void poller();
  }

  async function submitQrFlow() {
    if (!storeCode || !branchId) {
      const message = "ไม่พบข้อมูลร้านหรือสาขา กรุณาเริ่มใหม่จากหน้าร้าน";
      setError(message);
      setPopup({ type: "error", message });
      return;
    }

    setLoading(true);
    setError("");
    setPopup({ type: "loading", message: "กำลังสร้าง QR ของสาขา..." });

    try {
      const { response, body } = await fetchJsonWithRetry<QrCreateResponse>("/api/auth/qr/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_code: storeCode,
          branch_id: branchId,
          branch_code: branchCode || undefined
        })
      });

      if (!response.ok || !body?.data?.token || !body.data.qr_svg) {
        const message = mapEmployeeError(body?.error?.code, body?.error?.message);
        setError(message);
        setPopup({ type: "error", message });
        return;
      }

      setQrPayload({
        token: body.data.token,
        expiresAt: body.data.expires_at,
        qrSvg: body.data.qr_svg,
        branchCode: body.data.branch?.code ?? branchCode,
        branchName: body.data.branch?.name ?? branchName
      });
      setQrWaiting(true);
      setPopup({ type: "none" });
      startQrPolling(body.data.token);
    } catch (requestError) {
      const message = mapNetworkErrorMessage(requestError);
      setError(message);
      setPopup({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || qrWaiting) return;
    if (isCodeMode) {
      await submitByCode();
      return;
    }
    await submitQrFlow();
  }

  return (
    <PreEntryShell mode={flow} activeStep={flow === "multi" ? 3 : 2} title="" subtitle="" layout="store" showModePill={false} showStepbar={false}>
      {branchName ? <p className="ipos-employee-branch">สาขา: {branchName}</p> : null}

      <div className="ipos-tabs ipos-tabs-compact-store">
        <button
          type="button"
          className={tab === "code" ? "active" : ""}
          onClick={() => {
            if (qrWaiting) {
              stopQrPolling();
              setQrWaiting(false);
              setPopup({ type: "none" });
            }
            setTab("code");
            clearErrors();
          }}
        >
          รหัสผู้ใช้งาน
        </button>
        <button
          type="button"
          className={tab === "qr" ? "active" : ""}
          onClick={() => {
            qrAutoRequestedRef.current = false;
            setTab("qr");
            clearErrors();
          }}
        >
          สแกน QR
        </button>
      </div>

      <form className="ipos-form" onSubmit={handleSubmit}>
        {isCodeMode ? (
          <>
            <label htmlFor="employeeCodeInput">รหัสผู้ใช้งาน</label>
            <div className="ipos-input-wrap ipos-input-wrap-compact">
              <span>EMP</span>
              <input
                id="employeeCodeInput"
                value={employeeCode}
                onChange={(event) => {
                  setEmployeeCode(normalizeEmployeeCodeInput(event.target.value));
                  clearErrors();
                }}
                placeholder="เช่น EMP-000103"
                autoComplete="off"
                maxLength={32}
              />
            </div>
            <p className="ipos-qr-preview-meta">รองรับ: `EMP-000103`, `103`, อีเมลผู้ใช้งาน หรือ UUID</p>
            {normalizedEmployeeCode && !isEmployeeCodeFormatValid(normalizedEmployeeCode) ? <p className="ipos-error">รูปแบบรหัสผู้ใช้งานไม่ถูกต้อง</p> : null}
          </>
        ) : (
          <>
            <label>สแกน QR เพื่อยืนยันตัวตน</label>
            <p className="ipos-qr-preview-meta">ระบบจะแสดง QR ของสาขานี้ทันที เพื่อให้แอปมือถือสแกนและยืนยันสิทธิ์ผู้ใช้งาน</p>
          </>
        )}

        <button className="ipos-primary-btn ipos-btn-compact" type="submit" disabled={loading || qrWaiting}>
          {isCodeMode
            ? loading
              ? "กำลังตรวจสอบ..."
              : "ยืนยัน"
            : loading
              ? "กำลังสร้าง QR..."
              : qrWaiting
                ? "รอการยืนยัน..."
                : "แสดง QR เพื่อยืนยัน"}
        </button>
      </form>

      {!isCodeMode && qrPayload ? (
        <section className="ipos-qr-preview-panel">
          <div className="ipos-qr-preview-card">
            <div className="ipos-qr-box">
              <Image src={svgToDataUri(qrPayload.qrSvg)} alt="Employee approval QR token" width={250} height={250} unoptimized />
            </div>
          </div>
          <p className="ipos-qr-preview-meta">
            สาขา: <strong>{qrPayload.branchName || "-"}</strong> ({qrPayload.branchCode || "-"})
          </p>
          <p className="ipos-qr-preview-meta">
            สถานะ: <span className={`ipos-status ${qrWaiting ? "in_use" : "ready"}`}>{qrWaiting ? "รอยืนยันจากมือถือ" : "พร้อมใช้งาน"}</span>
          </p>
          <p className="ipos-qr-preview-meta">เวลาใช้งานคงเหลือ: {qrTimeLeft || "-"}</p>
          <button
            type="button"
            className="ipos-outline-btn ipos-btn-compact-secondary ipos-mt-10"
            disabled={loading}
            onClick={() => {
              if (qrWaiting) {
                stopQrPolling();
                setQrWaiting(false);
              }
              clearErrors();
              void submitQrFlow();
            }}
          >
            สร้าง QR ใหม่
          </button>
          {qrWaiting ? (
            <button
              type="button"
              className="ipos-ghost-btn ipos-btn-compact-secondary ipos-mt-10"
              onClick={() => {
                stopQrPolling();
                setQrWaiting(false);
                setPopup({ type: "none" });
              }}
            >
              ยกเลิกรอการยืนยัน
            </button>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="ipos-error">{error}</p> : null}

      {popup.type !== "none" ? (
        <div className="store-v2-popup-overlay" role="dialog" aria-modal="true" aria-live="polite">
          <div className="store-v2-popup-card">
            {popup.type === "loading" ? (
              <>
                <div className="store-v2-popup-spinner" aria-hidden="true" />
                <p className="store-v2-popup-title">กำลังเข้าสู่ระบบ</p>
                <p className="store-v2-popup-text">{popup.message}</p>
              </>
            ) : (
              <>
                <div className="store-v2-popup-error-icon" aria-hidden="true">
                  !
                </div>
                <p className="store-v2-popup-title">ดำเนินการไม่สำเร็จ</p>
                <p className="store-v2-popup-text">{popup.message}</p>
                <button type="button" className="store-v2-popup-close-btn" onClick={() => setPopup({ type: "none" })}>
                  ปิด
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </PreEntryShell>
  );
}

export default function LoginEmployeePage() {
  return (
    <Suspense
      fallback={
        <PreEntryShell mode="multi" activeStep={3} title="" subtitle="" layout="store" showModePill={false} showStepbar={false}>
          <p className="ipos-loading-text">กำลังเตรียมหน้ายืนยันผู้ใช้งาน...</p>
        </PreEntryShell>
      }
    >
      <LoginEmployeePageContent />
    </Suspense>
  );
}
