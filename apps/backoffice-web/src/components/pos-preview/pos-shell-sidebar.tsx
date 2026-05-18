"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const isSettingsActive = pathname === "/preview/pos/settings";

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
        className={`group relative mt-0.5 inline-flex min-h-10 w-full items-center px-2 text-sm font-semibold leading-tight transition ${
          collapsed ? "justify-center" : "justify-start gap-2"
        } ${
          isSettingsActive
            ? "rounded-md bg-white/10 text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-blue-400"
            : "text-slate-100/90 hover:text-white"
        }`}
        title={collapsed ? settingsLabel : undefined}
      >
        <span className="inline-flex w-4 justify-center" aria-hidden>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.03.03a2 2 0 1 1-2.83 2.83l-.03-.03A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.04A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.82.33l-.03.03a2 2 0 1 1-2.83-2.83l.03-.03A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.96a2 2 0 1 1 0-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.33-1.82l-.03-.03a2 2 0 1 1 2.83-2.83l.03.03A1.7 1.7 0 0 0 9 4.6c.36 0 .7-.13 1-.38.27-.25.43-.6.4-.96V3a2 2 0 1 1 4 0v.04c-.03.37.12.72.4.96.3.25.64.38 1 .38a1.7 1.7 0 0 0 1.82-.33l.03-.03a2 2 0 1 1 2.83 2.83l-.03.03a1.7 1.7 0 0 0-.33 1.82c.1.38.35.73.72.95.29.18.62.27.95.25H21a2 2 0 1 1 0 4h-.04c-.37-.03-.72.12-.96.4-.24.3-.37.64-.36 1z" />
          </svg>
        </span>
        {!collapsed ? <span className="truncate text-[14px]">{settingsLabel}</span> : null}
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
