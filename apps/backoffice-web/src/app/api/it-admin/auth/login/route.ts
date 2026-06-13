import { appendAuditLog } from "@/lib/audit-log";
import { fail, ok } from "@/lib/http";
import { isItAdminPlatformRole } from "@/lib/it-admin-guard";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type LoginPayload = {
  email?: string;
  password?: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  platform_role: "it_admin" | "it_support" | "tenant_user";
  is_active: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as LoginPayload;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return fail("invalid_payload", "Email and password are required.", 422);
  }

  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut().catch(() => undefined);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return fail("invalid_credentials", "Invalid IT login credentials.", 401);
  }

  const service = getSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from("users_profiles")
    .select("id,email,full_name,platform_role,is_active")
    .eq("id", data.user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    await supabase.auth.signOut().catch(() => undefined);
    return fail("profile_lookup_failed", "Unable to verify IT account role.", 500);
  }

  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut().catch(() => undefined);
    return fail("inactive_profile", "This IT account is inactive or missing.", 403);
  }

  if (!isItAdminPlatformRole(profile.platform_role)) {
    await appendAuditLog({
      actorUserId: profile.id,
      actorRole: profile.platform_role,
      action: "it_admin_login_rejected",
      targetTable: "users_profiles",
      targetId: profile.id,
      metadata: {
        reason: "invalid_platform_role",
        email: profile.email
      }
    }).catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);
    return fail("invalid_role", "Only IT admin or IT support can access IT Backoffice.", 403);
  }

  await appendAuditLog({
    actorUserId: profile.id,
    actorRole: profile.platform_role,
    action: "it_admin_login_succeeded",
    targetTable: "users_profiles",
    targetId: profile.id,
    metadata: {
      email: profile.email
    }
  }).catch(() => undefined);

  return ok({
    redirect_to: "/it-admin",
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      platform_role: profile.platform_role
    }
  });
}
