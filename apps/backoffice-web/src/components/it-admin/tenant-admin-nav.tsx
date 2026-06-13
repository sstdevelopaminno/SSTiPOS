import Link from "next/link";
import type { CSSProperties } from "react";
import type { PlatformRole } from "@pos/shared-types";

const sectionLinks = [
  { href: "branches", label: "Branches", adminOnly: false },
  { href: "users", label: "Users & Roles", adminOnly: false },
  { href: "devices", label: "Devices", adminOnly: true },
  { href: "login-policies", label: "Login Policies", adminOnly: true },
  { href: "sessions", label: "Sessions", adminOnly: false },
  { href: "shifts", label: "Shifts", adminOnly: false },
  { href: "features", label: "Contract", adminOnly: false }
] as const;

export function TenantAdminNav({ tenantId, platformRole }: { tenantId: string; platformRole: PlatformRole }) {
  const links = sectionLinks.filter((item) => platformRole === "it_admin" || !item.adminOnly);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Link href="/tenants" style={pillStyle}>
        All tenants
      </Link>
      {links.map((item) => (
        <Link key={item.href} href={`/tenants/${tenantId}/${item.href}`} style={pillStyle}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}

const pillStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "8px 12px",
  background: "#fff",
  minHeight: 40,
  display: "inline-flex",
  alignItems: "center"
};
