"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type LoginState = "idle" | "loading" | "error" | "invalid_role" | "session_expired" | "signed_out" | "success";
type LoginMode = "password" | "qr";

type LoginResponse = {
  data?: {
    redirect_to?: string;
  } | null;
  error?: {
    code?: string;
    message?: string;
  } | null;
};

const supportLogoSrc = "/brand/sst-ipos-logo.svg";

const stateCopy: Record<LoginState, { title: string; detail: string }> = {
  idle: {
    title: "เข้าสู่ระบบทีม IT / IT support login",
    detail: "ใช้บัญชี Platform สำหรับทีม IT Admin และ IT Support เท่านั้น"
  },
  loading: {
    title: "กำลังเข้าสู่ระบบ... / Signing in...",
    detail: "กำลังตรวจสอบบัญชีและสิทธิ์จากเซิร์ฟเวอร์"
  },
  error: {
    title: "เข้าสู่ระบบไม่สำเร็จ / Login failed",
    detail: "ตรวจสอบอีเมล รหัสผ่าน หรือสถานะบัญชี แล้วลองอีกครั้ง"
  },
  invalid_role: {
    title: "ไม่มีสิทธิ์เข้า SSTiPOS Support / Invalid IT role",
    detail: "บัญชี tenant_user ไม่สามารถเข้า IT Backoffice ได้"
  },
  session_expired: {
    title: "เซสชันหมดอายุ / Session expired",
    detail: "กรุณาเข้าสู่ระบบ SSTiPOS Support ใหม่อีกครั้ง"
  },
  signed_out: {
    title: "ออกจากระบบแล้ว / Signed out",
    detail: "คุณออกจากระบบเรียบร้อยแล้ว สามารถเข้าสู่ระบบใหม่ได้ทุกเมื่อ"
  },
  success: {
    title: "เข้าสู่ระบบสำเร็จ / Login successful",
    detail: "กำลังพาไปหน้า IT Backoffice"
  }
};

export function ItAdminLoginForm({ initialState = "idle" }: { initialState?: LoginState }) {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>(initialState);
  const [message, setMessage] = useState<string | null>(
    initialState === "idle" ? null : stateCopy[initialState].detail
  );

  const copy = useMemo(() => stateCopy[state], [state]);
  const isBusy = state === "loading" || state === "success";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage(stateCopy.loading.detail);

    try {
      const response = await fetch("/api/it-admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const body = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok || body.error) {
        const code = body.error?.code;
        const nextState = code === "invalid_role" ? "invalid_role" : "error";
        setState(nextState);
        setMessage(body.error?.message ?? stateCopy[nextState].detail);
        return;
      }

      setState("success");
      setMessage(stateCopy.success.detail);
      router.replace(body.data?.redirect_to ?? "/it-admin");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : stateCopy.error.detail);
    }
  }

  return (
    <section className="it-support-login-shell" aria-label="SSTiPOS Support login">
      <div className="it-support-login-card">
        <aside className="it-support-login-brand" aria-label="SSTiPOS Support">
          <div className="it-support-login-logo-row">
            <span className="it-support-login-logo">
              <Image src={supportLogoSrc} alt="" width={44} height={44} priority />
            </span>
            <span className="it-support-login-logo-text">SSTiPOS</span>
          </div>

          <div className="it-support-login-brand-copy">
            <p className="it-support-login-kicker">Support Console</p>
            <h1>SSTiPOS Support</h1>
            <p>ศูนย์ช่วยเหลือและดูแลระบบสำหรับทีม IT Admin และ IT Support</p>
            <p>Secure access for platform operations, tenant support, and readiness review.</p>
          </div>

          <div className="it-support-login-badges" aria-label="Deployment model">
            <span>Separate admin domain</span>
            <span>Server-side role check</span>
            <span>POS URL isolated</span>
          </div>
        </aside>

        <div className="it-support-login-panel">
          <div className="it-support-login-panel__head">
            <p className="it-support-login-kicker">SSTiPOS Support</p>
            <h2>{copy.title}</h2>
            <p>{copy.detail}</p>
          </div>

          <div className="it-support-login-tabs" role="tablist" aria-label="Login method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "password"}
              className={mode === "password" ? "is-active" : ""}
              onClick={() => setMode("password")}
            >
              Email / Password
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "qr"}
              className={mode === "qr" ? "is-active" : ""}
              onClick={() => setMode("qr")}
            >
              QR Login
            </button>
          </div>

          {message ? <div className={`it-support-login-alert it-support-login-alert--${state}`}>{message}</div> : null}

          {mode === "password" ? (
            <form className="it-support-login-form" onSubmit={onSubmit}>
              <label className="it-support-login-field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isBusy}
                  placeholder="support@example.com"
                  required
                />
              </label>

              <label className="it-support-login-field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isBusy}
                  placeholder="••••••••"
                  required
                />
              </label>

              <div className="it-support-login-actions">
                <button
                  type="button"
                  className="it-support-login-link"
                  onClick={() => {
                    setState("idle");
                    setMessage("Password reset for IT staff is not enabled yet. Please contact an IT admin.");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button className="it-support-login-button" type="submit" disabled={isBusy}>
                {state === "loading" ? "กำลังเข้าสู่ระบบ... / Signing in..." : "เข้าสู่ระบบ / Sign in"}
              </button>
            </form>
          ) : (
            <div className="it-support-qr-placeholder" role="tabpanel">
              <div className="it-support-qr-box" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h3>QR login for mobile support devices is coming soon.</h3>
              <p>โหมดนี้เตรียมไว้สำหรับอุปกรณ์ Support ในอนาคต และยังไม่เปิดใช้งานระบบยืนยันตัวตนด้วย QR</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
