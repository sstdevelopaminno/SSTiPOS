import { CustomerDisplayAdminConsole } from "@/components/it-admin/customer-display-admin-console";
import { getAuthContext } from "@/lib/auth-context";
import { hasItAdminPermission } from "@/lib/it-admin-guard";

export default async function ItAdminCustomerDisplayPage() {
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (!auth || !hasItAdminPermission(auth.platformRole, "customer_display_manage")) {
    return (
      <section className="surface">
        <h2>Forbidden</h2>
        <p>IT admin permission is required.</p>
      </section>
    );
  }

  return <CustomerDisplayAdminConsole />;
}
