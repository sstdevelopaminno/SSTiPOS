import { getAuthContext } from "@/lib/auth-context";
import { hasItAdminPermission } from "@/lib/it-admin-guard";

export default async function PlatformUsersPage() {
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (!auth || !hasItAdminPermission(auth.platformRole, "platform_user_manage")) {
    return (
      <section className="surface">
        <h2>Forbidden</h2>
        <p>IT admin permission is required.</p>
      </section>
    );
  }

  return (
    <section className="surface">
      <h2>Platform Users</h2>
      <p>จัดการ IT Admin users และสิทธิ์เข้าถึง portal</p>
    </section>
  );
}
