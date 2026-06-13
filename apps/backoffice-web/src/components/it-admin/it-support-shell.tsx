"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import type { Language } from "@/lib/i18n";

type NavItem = {
  href: string;
  label: string;
  permission: string;
};

type ItSupportShellProps = {
  children: ReactNode;
  nav: NavItem[];
  roleLabel: string;
  accountLabel: string;
  envLabel: string;
  language: Language;
  languageLabel: string;
  thaiLabel: string;
  englishLabel: string;
};

const logoSrc = "/brand/sst-innovation-logo.png";

function getPageTitle(pathname: string, nav: NavItem[]) {
  const active = nav
    .filter((item) => {
      const path = item.href.split("#")[0] || item.href;
      return path === "/it-admin" ? pathname === path : pathname.startsWith(path);
    })
    .sort((a, b) => b.href.length - a.href.length)[0];

  return active?.label ?? "Support Console";
}

function navIcon(label: string) {
  return label
    .split(/[ /]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ItSupportShell({
  children,
  nav,
  roleLabel,
  accountLabel,
  envLabel,
  language,
  languageLabel,
  thaiLabel,
  englishLabel
}: ItSupportShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const pageTitle = useMemo(() => getPageTitle(pathname, nav), [pathname, nav]);

  async function logout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await fetch("/api/it-admin/auth/logout", { method: "POST" });
    } finally {
      router.replace("/it-admin/login?state=signed_out");
      router.refresh();
    }
  }

  const sidebar = (
    <aside className="it-support-sidebar" aria-label="SSTiPOS Support navigation">
      <div className="it-support-sidebar__brand">
        <div className="it-support-sidebar__logo">
          <Image src={logoSrc} alt="SST Innovation" width={190} height={56} priority />
        </div>
        <div>
          <p className="it-support-sidebar__eyebrow">SSTiPOS</p>
          <h1>SSTiPOS Support</h1>
        </div>
        <span className="it-support-role-badge">{roleLabel}</span>
      </div>

      <nav className="it-support-sidebar__nav">
        {nav.map((item) => {
          const path = item.href.split("#")[0] || item.href;
          const active = path === "/it-admin" ? pathname === path : pathname.startsWith(path);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              className={active ? "it-support-nav-item is-active" : "it-support-nav-item"}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
            >
              <span className="it-support-nav-item__icon" aria-hidden="true">
                {navIcon(item.label)}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="it-support-sidebar__footer">
        <span>{envLabel}</span>
        <strong>Server-side role guarded</strong>
      </div>
    </aside>
  );

  return (
    <div className="it-support-app-shell">
      <button
        type="button"
        className="it-support-drawer-backdrop"
        aria-label="Close menu"
        data-open={drawerOpen ? "true" : "false"}
        onClick={() => setDrawerOpen(false)}
      />

      <div className="it-support-desktop-sidebar">{sidebar}</div>
      <div className="it-support-mobile-sidebar" data-open={drawerOpen ? "true" : "false"}>
        {sidebar}
      </div>

      <main className="it-support-main">
        <header className="it-support-topbar">
          <div className="it-support-topbar__title">
            <button
              type="button"
              className="it-support-menu-button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <p>SSTiPOS Support Console</p>
              <h2>{pageTitle}</h2>
            </div>
          </div>

          <div className="it-support-topbar__actions">
            <LanguageSwitcher
              currentLanguage={language}
              label={languageLabel}
              thaiLabel={thaiLabel}
              englishLabel={englishLabel}
            />
            <div className="it-support-account-card">
              <span>{accountLabel}</span>
              <strong>{roleLabel}</strong>
            </div>
            <button type="button" className="it-support-logout" onClick={logout} disabled={logoutBusy}>
              {logoutBusy ? "Signing out..." : "Logout"}
            </button>
          </div>
        </header>

        <div className="it-support-content">{children}</div>
      </main>
    </div>
  );
}
