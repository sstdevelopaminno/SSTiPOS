import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { isItAdminPlatformRole } from "@/lib/it-admin-guard";

export default async function ItAdminLoginPage() {
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (auth && isItAdminPlatformRole(auth.platformRole)) {
    redirect("/it-admin");
  }

  return (
    <main className="surface mx-auto mt-12 max-w-md">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">SST iPOS</p>
      <h1>IT Backoffice Login</h1>
      <p className="text-sm text-slate-600">เข้าสู่ระบบสำหรับทีม IT เท่านั้น / IT staff access only.</p>
      <p className="text-sm text-slate-600">
        ใช้บัญชี platform identity ที่มีสิทธิ์ it_admin หรือ it_support เท่านั้น
      </p>
    </main>
  );
}
