import { getPosApiAuthContext } from "@/lib/pos-api-auth";
import { fail, ok } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

type MemberRow = {
  id: string;
  name: string | null;
  phone: string | null;
  points_balance: number | null;
  stamp_balance: number | null;
  updated_at?: string | null;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeMember(row: MemberRow) {
  return {
    id: row.id,
    name: row.name ?? "-",
    phone: row.phone ?? "",
    points: Number(row.points_balance ?? 0),
    stamps: Number(row.stamp_balance ?? 0),
    updated_at: row.updated_at ?? null
  };
}

function isMissingMemberTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("mobile_members") && (message.includes("schema cache") || message.includes("does not exist") || message.includes("Could not find"));
}

export async function GET(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "sales:enter" });
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const supabase = getSupabaseServiceClient();
    let query = supabase
      .from("mobile_members")
      .select("id,name,phone,points_balance,stamp_balance,updated_at")
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (q) {
      const safeName = q.replace(/[%(),]/g, "");
      const safePhone = digitsOnly(q);
      query = query.or(`name.ilike.%${safeName}%,phone.ilike.%${safePhone}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ok({ members: ((data ?? []) as MemberRow[]).map(normalizeMember) });
  } catch (error) {
    if (isMissingMemberTable(error)) return fail("members_schema_missing", "Mobile member tables are not available in Supabase.", 501);
    return fail("members_load_failed", error instanceof Error ? error.message : "Failed to load members.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "sales:enter" });
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      phone?: string;
      points?: number;
      stamps?: number;
    };
    const name = String(body.name ?? "").trim();
    const phone = digitsOnly(String(body.phone ?? ""));
    const points = Math.max(0, Math.floor(Number(body.points ?? 0)));
    const stamps = Math.max(0, Math.floor(Number(body.stamps ?? 0)));
    if (!name || !/^\d{9,10}$/.test(phone)) {
      return fail("invalid_member_input", "Member name and a 9-10 digit phone number are required.", 422);
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await getSupabaseServiceClient()
      .from("mobile_members")
      .upsert(
        {
          tenant_id: auth.tenantId!,
          branch_id: auth.branchId!,
          name,
          phone,
          points_balance: points,
          stamp_balance: stamps,
          status: "active",
          updated_at: nowIso
        },
        { onConflict: "tenant_id,branch_id,phone" }
      )
      .select("id,name,phone,points_balance,stamp_balance,updated_at")
      .single<MemberRow>();

    if (error) throw new Error(error.message);
    return ok({ member: normalizeMember(data) });
  } catch (error) {
    if (isMissingMemberTable(error)) return fail("members_schema_missing", "Mobile member tables are not available in Supabase.", 501);
    return fail("member_save_failed", error instanceof Error ? error.message : "Failed to save member.", 503);
  }
}
