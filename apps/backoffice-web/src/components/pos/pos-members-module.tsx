"use client";

import { useEffect, useMemo, useState } from "react";
import type { Language } from "@/lib/i18n";
import { fetchWithTimeout } from "@/lib/client-fetch";

type Member = {
  id: string;
  name: string;
  phone: string;
  points: number;
  stamps: number;
  updated_at: string | null;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function PosMembersModule({ lang }: { lang: Language }) {
  const th = lang === "th";
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [points, setPoints] = useState("0");
  const [stamps, setStamps] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () => ({
      title: th ? "สมาชิก" : "Members",
      subtitle: th ? "ใช้ข้อมูลชุดเดียวกับ SSTiPOSMobile: mobile_members" : "Shared with SSTiPOSMobile: mobile_members",
      search: th ? "ค้นหาชื่อหรือเบอร์โทร" : "Search name or phone",
      addTitle: th ? "เพิ่ม/อัปเดตสมาชิก" : "Add / Update Member",
      name: th ? "ชื่อสมาชิก" : "Member name",
      phone: th ? "เบอร์โทร" : "Phone",
      points: th ? "คะแนน" : "Points",
      stamps: th ? "แต้ม" : "Stamps",
      save: th ? "บันทึกสมาชิก" : "Save member",
      empty: th ? "ยังไม่พบสมาชิก" : "No members found",
      loadFailed: th ? "โหลดสมาชิกไม่สำเร็จ" : "Failed to load members",
      saved: th ? "บันทึกสมาชิกเรียบร้อยแล้ว" : "Member saved"
    }),
    [th]
  );

  async function load(nextQuery = query) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTimeout(`/api/pos/members?q=${encodeURIComponent(nextQuery)}`, { cache: "no-store" }, 10000);
      const body = await response.json();
      if (!response.ok || body.error) throw new Error(body.error?.message ?? copy.loadFailed);
      setMembers((body.data?.members ?? []) as Member[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveMember() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetchWithTimeout(
        "/api/pos/members",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            phone: digitsOnly(phone),
            points: Number(points || 0),
            stamps: Number(stamps || 0)
          })
        },
        10000
      );
      const body = await response.json();
      if (!response.ok || body.error) throw new Error(body.error?.message ?? "Failed");
      setMessage(copy.saved);
      setName("");
      setPhone("");
      setPoints("0");
      setStamps("0");
      await load(query);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pos-section-card w-full self-start overflow-hidden rounded-2xl border border-slate-300 bg-white">
      <div className="border-b border-slate-200 bg-[linear-gradient(130deg,#f8fbff_0%,#f2f7ff_52%,#fff7ed_100%)] px-4 py-4 lg:px-6">
        <h2 className="text-2xl font-extrabold text-slate-900">{copy.title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">{copy.subtitle}</p>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
        <section className="min-w-0">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load(query);
              }}
              placeholder={copy.search}
              className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-blue-400"
            />
            <button type="button" onClick={() => void load(query)} className="h-11 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white">
              {th ? "ค้นหา" : "Search"}
            </button>
          </div>
          {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
          {message ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
          <div className="mt-4 grid gap-2">
            {loading ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-500">Loading...</p> : null}
            {!loading && members.length === 0 ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-500">{copy.empty}</p> : null}
            {members.map((member) => (
              <article key={member.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <strong className="block truncate text-base text-slate-900">{member.name}</strong>
                  <span className="text-sm font-semibold text-slate-500">{member.phone}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-extrabold">
                  <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">{member.points} {copy.points}</span>
                  <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">{member.stamps} {copy.stamps}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-lg font-extrabold text-slate-900">{copy.addTitle}</h3>
          <div className="mt-3 grid gap-3">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.name} className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />
            <input value={phone} onChange={(event) => setPhone(digitsOnly(event.target.value))} placeholder={copy.phone} inputMode="tel" className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />
            <div className="grid grid-cols-2 gap-2">
              <input value={points} onChange={(event) => setPoints(event.target.value)} placeholder={copy.points} inputMode="numeric" className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />
              <input value={stamps} onChange={(event) => setStamps(event.target.value)} placeholder={copy.stamps} inputMode="numeric" className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />
            </div>
            <button type="button" onClick={() => void saveMember()} disabled={saving} className="h-11 rounded-lg bg-orange-600 px-4 text-sm font-extrabold text-white disabled:opacity-60">
              {saving ? (th ? "กำลังบันทึก..." : "Saving...") : copy.save}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
