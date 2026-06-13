import { TenantSectionConsole } from "@/components/it-admin/tenant-section-console";
import { getAuthContext } from "@/lib/auth-context";
import { hasItAdminPermission, isItAdminPlatformRole } from "@/lib/it-admin-guard";

export default async function TenantFeaturesPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (!auth || !isItAdminPlatformRole(auth.platformRole) || !hasItAdminPermission(auth.platformRole, "feature_manage")) {
    return (
      <section className="surface">
        <h2>Forbidden</h2>
        <p>Platform admin permission is required.</p>
      </section>
    );
  }

  return <TenantSectionConsole tenantId={tenantId} section="features" platformRole={auth.platformRole} />;
}
