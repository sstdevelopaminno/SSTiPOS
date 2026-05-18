"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { PosStaffMenu } from "@/components/pos-preview/pos-staff-menu";
import type { Language } from "@/lib/i18n";

type Props = {
  lang: Language;
  settingsLabel: string;
  languageLabel: string;
  thaiLabel: string;
  englishLabel: string;
};

export function PosShellSidebar({ lang, settingsLabel, languageLabel, thaiLabel, englishLabel }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`pos-shell-sidebar hidden rounded-xl border border-slate-700/60 bg-[radial-gradient(circle_at_70%_-20%,rgba(43,124,255,0.28),transparent_48%),linear-gradient(180deg,#162b45,#0f1d31)] p-3 text-white lg:flex lg:flex-col ${
        collapsed ? "lg:w-[72px]" : "lg:w-[196px] xl:w-[206px]"
      }`}
    >
      <div className={`${collapsed ? "flex justify-center" : ""}`}>
        <div
          className={`relative overflow-hidden rounded-md ${
            collapsed ? "h-8 w-8" : "h-14 w-full"
          }`}
        >
          <Image
            src="/brand/sst-ipos-logo-new.png"
            alt="SST iPOS"
            fill
            priority
            sizes={collapsed ? "32px" : "200px"}
            className={`${
              collapsed
                ? "object-cover object-center"
                : "object-cover object-center"
            }`}
          />
        </div>
      </div>

      <div className={`mt-3 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed ? <p className="text-[14px] font-semibold text-slate-200">{lang === "th" ? "เมนูพนักงาน" : "Staff Menu"}</p> : null}
        <button
          type="button"
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-white/15 bg-slate-900/40 p-0 text-slate-100 hover:bg-slate-900/65"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? (lang === "th" ? "แสดงชื่อเมนู" : "Expand menu labels") : (lang === "th" ? "ซ่อนชื่อเมนู" : "Collapse menu labels")}
          title={collapsed ? (lang === "th" ? "แสดง" : "Expand") : lang === "th" ? "ซ่อน" : "Collapse"}
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden>
            {collapsed ? <path d="M7 4l6 6-6 6" /> : <path d="M13 4l-6 6 6 6" />}
          </svg>
        </button>
      </div>

      <PosStaffMenu lang={lang} collapsed={collapsed} />

      <Link
        href="/preview/pos/settings"
        className={`mt-0.5 inline-flex min-h-9 w-full items-center px-2 text-sm font-semibold text-slate-100/90 transition hover:text-white ${
          collapsed ? "justify-center" : "justify-center"
        }`}
        title={collapsed ? settingsLabel : undefined}
      >
        {collapsed ? "⚙" : settingsLabel}
      </Link>

      <div className="mt-auto pt-3">
        {!collapsed ? (
          <div className="rounded-lg border border-white/15 bg-white/95 px-2 py-1 text-slate-900">
            <LanguageSwitcher
              currentLanguage={lang}
              label={languageLabel}
              thaiLabel={thaiLabel}
              englishLabel={englishLabel}
              compact
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
