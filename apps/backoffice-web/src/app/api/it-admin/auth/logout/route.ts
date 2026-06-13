import { ok } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut().catch(() => undefined);

  return ok({ redirect_to: "/it-admin/login?state=signed_out" });
}
