import { AppShell } from "@/components/layout/app-shell";
import type { ReactNode } from "react";
import { getCurrentLanguage, t } from "@/lib/i18n";
import { getAuthContext } from "@/lib/auth-context";
import { hasItAdminPermission, isItAdminPlatformRole, type ItAdminPermission } from "@/lib/it-admin-guard";
import { redirect } from "next/navigation";

const nav = [
  { href: "/it-admin", key: "dashboard", permission: "monitoring_read" },
  { href: "/it-admin/tenants", key: "tenants", permission: "tenant_manage" },
  { href: "/tenants", key: "tenants", permission: "tenant_manage" },
  { href: "/audit-logs", key: "audit_report", permission: "audit_read" },
  { href: "/it-admin/packages", key: "packages", permission: "package_read" },
  { href: "/it-admin/customer-display", key: "customer_display_devices", permission: "customer_display_manage" },
  { href: "/it-admin/platform-users", key: "platform_users", permission: "platform_user_manage" },
  { href: "/it-admin/monitoring", key: "monitoring", permission: "monitoring_read" },
  { href: "/it-admin/settings/language", key: "common_settings", permission: "settings_manage" }
] as const;

export default async function ItAdminLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (!auth) {
    redirect("/it-admin/login?state=session_expired");
  }
  if (!isItAdminPlatformRole(auth.platformRole)) {
    redirect("/it-admin/login?state=invalid_role");
  }

  const lang = await getCurrentLanguage();
  const allowedNav = nav.filter((item) =>
    hasItAdminPermission(auth.platformRole, item.permission as ItAdminPermission)
  );

  return (
    <AppShell
      title={t(lang, "it_admin_title")}
      nav={allowedNav.map((item) => ({ href: item.href, label: t(lang, item.key) }))}
      language={lang}
      languageLabel={t(lang, "language")}
      thaiLabel={t(lang, "thai")}
      englishLabel={t(lang, "english")}
    >
      {children}
    </AppShell>
  );
}

