import { PackageBillingConsole } from "@/components/it-admin/package-billing-console";
import { getAuthContext } from "@/lib/auth-context";
import { hasItAdminPermission } from "@/lib/it-admin-guard";

export default async function PackagesPage() {
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (!auth || !hasItAdminPermission(auth.platformRole, "package_read")) {
    return (
      <section className="surface">
        <h2>Forbidden</h2>
        <p>IT admin or IT support permission is required.</p>
      </section>
    );
  }

  return <PackageBillingConsole />;
}
