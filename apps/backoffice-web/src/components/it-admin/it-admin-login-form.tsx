"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type LoginState = "idle" | "loading" | "error" | "invalid_role" | "session_expired" | "success";

type LoginResponse = {
  data?: {
    redirect_to?: string;
  } | null;
  error?: {
    code?: string;
    message?: string;
  } | null;
};

const stateCopy: Record<LoginState, { title: string; detail: string }> = {
  idle: {
    title: "เข้าสู่ระบบ IT Backoffice / IT Backoffice Login",
    detail: "ใช้บัญชี platform identity สำหรับทีม IT เท่านั้น"
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
    title: "ไม่มีสิทธิ์เข้า IT Backoffice / Invalid IT role",
    detail: "บัญชี tenant_user ไม่สามารถเข้า IT Backoffice ได้"
  },
  session_expired: {
    title: "เซสชันหมดอายุ / Session expired",
    detail: "กรุณาเข้าสู่ระบบ IT Backoffice ใหม่"
  },
  success: {
    title: "เข้าสู่ระบบสำเร็จ / Login successful",
    detail: "กำลังพาไปหน้า IT Backoffice"
  }
};

export function ItAdminLoginForm({ initialState = "idle" }: { initialState?: LoginState }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>(initialState);
  const [message, setMessage] = useState<string | null>(null);

  const copy = useMemo(() => stateCopy[state], [state]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/it-admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const body = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok || body.error) {
        const code = body.error?.code;
        setState(code === "invalid_role" ? "invalid_role" : "error");
        setMessage(body.error?.message ?? "Unable to sign in.");
        return;
      }

      setState("success");
      router.replace(body.data?.redirect_to ?? "/it-admin");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

  return (
    <form className="it-admin-login-card" onSubmit={onSubmit}>
      <div className="it-admin-login-card__head">
        <p className="it-admin-login-card__eyebrow">SST iPOS</p>
        <h1>{copy.title}</h1>
        <p>{copy.detail}</p>
      </div>

      <label className="it-admin-login-field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={state === "loading" || state === "success"}
          required
        />
      </label>

      <label className="it-admin-login-field">
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={state === "loading" || state === "success"}
          required
        />
      </label>

      {message ? <div className={`it-admin-login-alert it-admin-login-alert--${state}`}>{message}</div> : null}

      <button className="it-admin-login-button" type="submit" disabled={state === "loading" || state === "success"}>
        {state === "loading" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ / Sign in"}
      </button>
    </form>
  );
}
