import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ItSupportShell } from "@/components/it-admin/it-support-shell";
import { getAuthContext } from "@/lib/auth-context";
import { getCurrentLanguage, t, type Language } from "@/lib/i18n";
import { hasItAdminPermission, isItAdminPlatformRole, type ItAdminPermission } from "@/lib/it-admin-guard";

const nav = [
  { href: "/it-admin", labels: { th: "แดชบอร์ดไอที", en: "IT Dashboard" }, permission: "monitoring_read" },
  { href: "/tenants", labels: { th: "การจัดการผู้เช่า", en: "Tenant Management" }, permission: "tenant_manage" },
  { href: "/tenants#branches", labels: { th: "การจัดการสาขา", en: "Branch Management" }, permission: "branch_manage" },
  {
    href: "/it-admin/packages",
    labels: { th: "สัญญาแพ็กเกจ/สมาชิก", en: "Contracts / Subscriptions" },
    permission: "package_read"
  },
  { href: "/tenants#users", labels: { th: "ผู้ใช้/บทบาท", en: "Users / Roles" }, permission: "user_role_manage" },
  { href: "/tenants#sessions", labels: { th: "เซสชันใช้งาน", en: "Active Sessions" }, permission: "session_manage" },
  { href: "/tenants#shifts", labels: { th: "กะการทำงาน", en: "Shifts" }, permission: "shift_manage" },
  { href: "/audit-logs", labels: { th: "Audit review", en: "Audit Review" }, permission: "audit_read" },
  {
    href: "/it-admin/monitoring",
    labels: { th: "ตรวจสอบ/ความพร้อมใช้งาน", en: "Monitoring / Readiness" },
    permission: "monitoring_read"
  },
  {
    href: "/tenants#features",
    labels: { th: "Feature flags/สาขา", en: "Feature Flags / Branch Overrides" },
    permission: "feature_manage"
  },
  {
    href: "/tenants#devices",
    labels: { th: "อุปกรณ์/ลงทะเบียน", en: "Devices / Registration" },
    permission: "device_manage"
  },
  {
    href: "/it-admin/customer-display",
    labels: { th: "อุปกรณ์จอลูกค้า", en: "Customer Display Devices" },
    permission: "customer_display_manage"
  },
  { href: "/it-admin/platform-users", labels: { th: "Platform users", en: "Platform Users" }, permission: "platform_user_manage" },
  { href: "/it-admin/settings/language", labels: { th: "Settings", en: "Settings" }, permission: "settings_manage" }
] as const;

function navLabel(item: (typeof nav)[number], lang: Language) {
  return item.labels[lang] ?? item.labels.en;
}

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
  const roleLabel = auth.platformRole === "it_admin" ? "IT Admin" : "IT Support";
  const accountLabel = auth.userId ? `${auth.userId.slice(0, 8)}...` : "Signed in";
  const envLabel = process.env.VERCEL_ENV ? `Vercel ${process.env.VERCEL_ENV}` : `Local ${process.env.APP_SURFACE ?? "it_admin"}`;

  return (
    <ItSupportShell
      nav={allowedNav.map((item) => ({
        href: item.href,
        label: navLabel(item, lang),
        permission: item.permission
      }))}
      roleLabel={roleLabel}
      accountLabel={accountLabel}
      envLabel={envLabel}
      language={lang}
      languageLabel={t(lang, "language")}
      thaiLabel={t(lang, "thai")}
      englishLabel={t(lang, "english")}
    >
      {children}
    </ItSupportShell>
  );
}
