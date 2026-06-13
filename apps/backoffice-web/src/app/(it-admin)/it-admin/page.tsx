import Link from "next/link";
import { getAuthContext } from "@/lib/auth-context";
import { getCurrentLanguage } from "@/lib/i18n";
import { hasItAdminPermission, type ItAdminPermission } from "@/lib/it-admin-guard";

export default async function ItAdminHomePage() {
  const lang = await getCurrentLanguage();
  const auth = await getAuthContext({ requireBranchScope: false });
  const roleLabel = auth.platformRole === "it_admin" ? "IT Admin" : "IT Support";

  const kpis = [
    {
      label: lang === "th" ? "ผู้เช่า" : "Tenants",
      value: "Ready",
      detail: lang === "th" ? "จัดการ tenant และ readiness" : "Tenant and readiness management"
    },
    {
      label: lang === "th" ? "สาขาที่ใช้งาน" : "Active branches",
      value: "Scope",
      detail: lang === "th" ? "ตรวจสถานะสาขาและ feature" : "Branch and feature status"
    },
    {
      label: lang === "th" ? "เซสชันใช้งาน" : "Active sessions",
      value: "Live",
      detail: lang === "th" ? "ติดตาม POS sessions" : "Track POS sessions"
    },
    {
      label: "Audit review",
      value: "Review",
      detail: lang === "th" ? "ตรวจสอบ activity สำคัญ" : "Review important activity"
    }
  ];

  const actions = [
    {
      href: "/tenants",
      title: "Tenant support",
      body: lang === "th" ? "เปิด tenant, branch, user role, session และ shift view" : "Open tenant, branch, role, session, and shift views",
      permission: "tenant_manage"
    },
    {
      href: "/it-admin/packages",
      title: "Contracts and packages",
      body: lang === "th" ? "ตรวจแพ็กเกจและ quote สำหรับ subscription" : "Review package catalog and subscription quote",
      permission: "package_read"
    },
    {
      href: "/audit-logs",
      title: "Audit review",
      body: lang === "th" ? "ค้นหา audit logs แบบ read-only" : "Search read-only audit logs",
      permission: "audit_read"
    },
    {
      href: "/it-admin/monitoring",
      title: "Monitoring readiness",
      body: lang === "th" ? "ดู health, queues และ readiness ของระบบ" : "View health, queues, and readiness",
      permission: "monitoring_read"
    },
    {
      href: "/it-admin/platform-users",
      title: "Platform users",
      body: lang === "th" ? "จัดการผู้ใช้ platform สำหรับ IT Admin" : "Manage platform users for IT Admin",
      permission: "platform_user_manage"
    }
  ] satisfies Array<{
    href: string;
    title: string;
    body: string;
    permission: ItAdminPermission;
  }>;

  const allowedActions = actions.filter((item) => hasItAdminPermission(auth.platformRole, item.permission));

  return (
    <div className="it-support-dashboard">
      <section className="it-support-hero-card">
        <div>
          <p className="it-support-kicker">{roleLabel}</p>
          <h2>SSTiPOS Support Console</h2>
          <p>
            {lang === "th"
              ? "ศูนย์ปฏิบัติการสำหรับตรวจ readiness, support tenant, และดูแล platform อย่างปลอดภัย"
              : "Operations hub for readiness checks, tenant support, and secure platform oversight."}
          </p>
        </div>
        <div className="it-support-hero-card__status">
          <span>{lang === "th" ? "สถานะระบบ" : "System status"}</span>
          <strong>{lang === "th" ? "พร้อมตรวจสอบ" : "Ready to review"}</strong>
        </div>
      </section>

      <section className="it-support-kpi-grid" aria-label="Support KPIs">
        {kpis.map((item) => (
          <article className="it-support-kpi-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="it-support-quick-grid" aria-label="Quick actions">
        {allowedActions.map((item) => (
          <Link className="it-support-action-card" href={item.href} key={item.href}>
            <span>{item.title}</span>
            <p>{item.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
