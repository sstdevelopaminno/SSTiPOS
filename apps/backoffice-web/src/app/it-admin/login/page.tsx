import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ItAdminLoginForm } from "@/components/it-admin/it-admin-login-form";
import { getAuthContext } from "@/lib/auth-context";
import { isItAdminPlatformRole } from "@/lib/it-admin-guard";

type LoginState = "idle" | "invalid_role" | "session_expired" | "signed_out";

export const metadata: Metadata = {
  title: "SSTiPOS Support"
};

export default async function ItAdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (auth && isItAdminPlatformRole(auth.platformRole)) {
    redirect("/it-admin");
  }

  const initialState: LoginState =
    auth && auth.platformRole === "tenant_user"
      ? "invalid_role"
      : state === "invalid_role" || state === "session_expired" || state === "signed_out"
        ? state
        : "idle";

  return (
    <main className="it-admin-login-page">
      <ItAdminLoginForm initialState={initialState} />
    </main>
  );
}
