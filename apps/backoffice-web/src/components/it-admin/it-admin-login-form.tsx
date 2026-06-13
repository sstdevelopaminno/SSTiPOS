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

const supportLogoSrc = "/brand/sstipos-support-logo.png";
const loginTimeoutMs = 20000;

const stateCopy: Record<LoginState, { title: string; detail: string }> = {
  idle: {
    title: "Sign in",
    detail: "Use your platform account to access SSTiPOS Support."
  },
  loading: {
    title: "Signing in",
    detail: "Checking your account and support role."
  },
  error: {
    title: "Login failed",
    detail: "Check your email, password, or account status."
  },
  invalid_role: {
    title: "Access restricted",
    detail: "This account cannot access SSTiPOS Support."
  },
  session_expired: {
    title: "Session expired",
    detail: "Sign in again to continue."
  },
  signed_out: {
    title: "Signed out",
    detail: "You can sign in again anytime."
  },
  success: {
    title: "Login successful",
    detail: "Opening IT Backoffice."
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

  function resetLoginState() {
    if (state !== "idle") {
      setState("idle");
      setMessage(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setState("error");
      setMessage("Email and password are required.");
      return;
    }

    setState("loading");
    setMessage(stateCopy.loading.detail);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), loginTimeoutMs);

    try {
      const response = await fetch("/api/it-admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
        signal: controller.signal
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
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "Login timed out. Please try again." : stateCopy.error.detail);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  return (
    <section className="it-support-login-shell" aria-label="SSTiPOS Support login">
      <div className="it-support-login-card">
        <aside className="it-support-login-brand" aria-label="SSTiPOS Support">
          <div className="it-support-login-logo-row">
            <span className="it-support-login-logo">
              <Image src={supportLogoSrc} alt="" width={56} height={56} priority />
            </span>
          </div>

          <div className="it-support-login-brand-copy">
            <h1>SSTiPOS Support</h1>
            <p>Secure IT operations console.</p>
          </div>

          <div className="it-support-login-badges" aria-label="Deployment model">
            <span>Admin domain</span>
            <span>Role protected</span>
          </div>
        </aside>

        <div className="it-support-login-panel">
          <div className="it-support-login-panel__head">
            <p className="it-support-login-kicker">SSTiPOS Support</p>
            <h2>{copy.title}</h2>
            {state === "idle" ? <p>{copy.detail}</p> : null}
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
                  onChange={(event) => {
                    resetLoginState();
                    setEmail(event.target.value);
                  }}
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
                  onChange={(event) => {
                    resetLoginState();
                    setPassword(event.target.value);
                  }}
                  disabled={isBusy}
                  placeholder="********"
                  required
                />
              </label>

              <div className="it-support-login-actions">
                <button
                  type="button"
                  className="it-support-login-link"
                  onClick={() => {
                    setState("idle");
                    setMessage("Password reset is not enabled yet. Contact an IT admin.");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button className="it-support-login-button" type="submit" disabled={isBusy}>
                {state === "loading" ? "Signing in..." : "Sign in"}
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
              <p>Use Email / Password for now.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
