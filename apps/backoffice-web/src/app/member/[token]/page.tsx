import { getSupabaseServiceClient } from "@/lib/supabase-admin";

type MemberPageProps = {
  params: Promise<{ token: string }>;
};

type MemberRow = {
  name: string | null;
  phone: string | null;
  points_balance: number | null;
  stamp_balance: number | null;
  updated_at: string | null;
};

export default async function MemberPortalPage({ params }: MemberPageProps) {
  const { token } = await params;
  const { data, error } = await getSupabaseServiceClient()
    .from("mobile_members")
    .select("name,phone,points_balance,stamp_balance,updated_at")
    .eq("member_token", token)
    .is("deleted_at", null)
    .maybeSingle<MemberRow>();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-[linear-gradient(130deg,#eff6ff_0%,#ffffff_55%,#fff7ed_100%)] p-6 text-center">
          <p className="text-sm font-black text-blue-700">SSTiPOS Member</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{data?.name ?? "สมาชิก"}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">{data?.phone ? maskPhone(data.phone) : "ตรวจสอบคะแนนและสิทธิ์สมาชิก"}</p>
        </div>
        {!error && data ? (
          <div className="grid gap-4 p-6">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="คะแนน" value={String(Number(data.points_balance ?? 0))} tone="blue" />
              <Metric label="แต้ม" value={String(Number(data.stamp_balance ?? 0))} tone="amber" />
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">สิทธิ์และส่วนลด</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">ระบบพร้อมเชื่อมสิทธิ์สินค้า/ส่วนลดในเฟสถัดไป</p>
            </div>
            <p className="text-center text-xs font-semibold text-slate-400">
              อัปเดตล่าสุด: {data.updated_at ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(data.updated_at)) : "-"}
            </p>
          </div>
        ) : (
          <div className="p-6">
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">ไม่พบข้อมูลสมาชิก หรือระบบสมาชิกยังไม่ได้เปิดใช้ลิงก์</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "blue" | "amber" }) {
  return (
    <div className={`rounded-xl p-4 text-center ${tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
      <p className="text-xs font-black">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function maskPhone(phone: string) {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 3)}xxx${phone.slice(-4)}`;
}
