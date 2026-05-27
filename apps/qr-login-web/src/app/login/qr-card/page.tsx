"use client";

import Image from "next/image";
import { useState } from "react";

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
    tenant?: {
      name: string;
      code: string;
    };
  } | null;
  error?: { code: string; message: string } | null;
};

function resolveBadgeStatus(expiresAt: string) {
  const remain = new Date(expiresAt).getTime() - Date.now();
  if (remain <= 0) return { text: "หมดอายุ", className: "disabled" };
  if (remain <= 30_000) return { text: "ใกล้หมดอายุ", className: "in_use" };
  return { text: "พร้อมใช้งาน", className: "ready" };
}

function mapError(code?: string | null, fallback?: string | null) {
  if (code === "invalid_payload") return "กรุณากรอกรหัสร้านค้า";
  if (code === "store_not_found") return "ไม่พบร้านค้าที่ระบุ";
  if (code === "branch_required") return "กรุณาเลือกสาขา";
  if (code === "feature_not_enabled") return "สาขานี้ยังไม่เปิดใช้งาน QR Login";
  if (code === "qr_create_failed") return fallback ?? "ไม่สามารถสร้าง QR ได้";
  return fallback ?? "ไม่สามารถสร้าง QR ได้";
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function LoginQrCardPage() {
  const [storeCode, setStoreCode] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<QrCreateResponse["data"]>(null);

  const badge = payload?.expires_at ? resolveBadgeStatus(payload.expires_at) : { text: "-", className: "offline" };

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPayload(null);

    try {
      const response = await fetch("/api/auth/qr/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_code: storeCode.trim().toUpperCase(),
          branch_code: branchCode.trim().toUpperCase() || undefined
        })
      });

      const body = (await response.json().catch(() => null)) as QrCreateResponse | null;
      if (!response.ok || !body?.data) {
        setError(mapError(body?.error?.code, body?.error?.message));
        return;
      }
      setPayload(body.data);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ipos-mobile-page">
      <div className="ipos-mobile-wrapper">
        <div className="ipos-mobile-inner">
          <div className="ipos-logo" style={{ marginBottom: 10 }}>
            SST iPOS
          </div>
          <h1 style={{ margin: 0, fontSize: 34 }}>QR เข้าระบบสาขา</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>สร้าง QR ของสาขาเพื่อให้มือถือสแกนและยืนยันผู้ใช้งาน</p>

          <form className="ipos-form" onSubmit={handleCreate}>
            <label>รหัสร้านค้า</label>
            <div className="ipos-input-wrap">
              <span>ST</span>
              <input value={storeCode} onChange={(event) => setStoreCode(event.target.value.toUpperCase())} placeholder="กรอกรหัสร้านค้า" />
            </div>
            <label style={{ marginTop: 10 }}>รหัสสาขา (ถ้ามีหลายสาขา)</label>
            <div className="ipos-input-wrap">
              <span>BR</span>
              <input value={branchCode} onChange={(event) => setBranchCode(event.target.value.toUpperCase())} placeholder="เช่น BKK-01" />
            </div>
            <button type="submit" className="ipos-primary-btn" disabled={loading}>
              {loading ? "กำลังสร้าง QR..." : "สร้าง QR สาขา"}
            </button>
          </form>

          {error ? <p className="ipos-error">{error}</p> : null}

          {payload ? (
            <>
              <div style={{ marginTop: 16 }}>
                <span className={`ipos-status ${badge.className}`}>{badge.text}</span>
              </div>
              <section className="ipos-employee-card">
                <strong>{payload.tenant?.name ?? "-"}</strong>
                <span>ร้าน: {payload.tenant?.code ?? "-"}</span>
                <span>สาขา: {payload.branch?.name ?? "-"}</span>
                <span>รหัสสาขา: {payload.branch?.code ?? "-"}</span>
              </section>
              <div className="ipos-qr-box">
                <Image src={svgToDataUri(payload.qr_svg)} alt="Branch QR login token" width={250} height={250} unoptimized />
              </div>
              <p style={{ color: "#64748b", textAlign: "center" }}>นำ QR นี้ให้แอปมือถือสแกนเพื่อยืนยันผู้ใช้งาน</p>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
