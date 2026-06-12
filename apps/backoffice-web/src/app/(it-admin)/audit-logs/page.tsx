import { PlatformAuditLogsConsole } from "@/components/it-admin/platform-audit-logs-console";
import { getAuthContext } from "@/lib/auth-context";
import { hasItAdminPermission, isItAdminPlatformRole } from "@/lib/it-admin-guard";

export default async function AuditLogsPage() {
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (!auth || !isItAdminPlatformRole(auth.platformRole) || !hasItAdminPermission(auth.platformRole, "audit_read")) {
    return (
      <section className="surface">
        <h2>Forbidden</h2>
        <p>Platform admin permission is required.</p>
      </section>
    );
  }

  return <PlatformAuditLogsConsole />;
}
