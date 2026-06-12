import { TenantIndexConsole } from "@/components/it-admin/tenant-index-console";
import { getAuthContext } from "@/lib/auth-context";
import { hasItAdminPermission, isItAdminPlatformRole } from "@/lib/it-admin-guard";

export default async function TenantsRootPage() {
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (!auth || !isItAdminPlatformRole(auth.platformRole) || !hasItAdminPermission(auth.platformRole, "tenant_manage")) {
    return (
      <section className="surface">
        <h2>Forbidden</h2>
        <p>Platform admin permission is required.</p>
      </section>
    );
  }

  return <TenantIndexConsole />;
}
