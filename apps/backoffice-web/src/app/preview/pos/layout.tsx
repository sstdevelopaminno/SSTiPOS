import type { ReactNode } from "react";
import { PosShiftCycleGuard } from "@/components/pos/pos-shift-cycle-guard";
import { PosRoutePerformanceTracker } from "@/components/pos-preview/pos-route-performance-tracker";
import { PosShellSidebar } from "@/components/pos-preview/pos-shell-sidebar";
import { getCurrentLanguage, t } from "@/lib/i18n";

export default async function PosPreviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  const lang = await getCurrentLanguage();

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <PosRoutePerformanceTracker />
      <PosShiftCycleGuard lang={lang} />

      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <PosShellSidebar
          lang={lang}
          settingsLabel={t(lang, "common_settings")}
          languageLabel={t(lang, "language")}
          thaiLabel={t(lang, "thai")}
          englishLabel={t(lang, "english")}
        />

        <section className="flex min-h-0 min-w-0 flex-1 overflow-hidden py-4 pl-4 pr-2 lg:pl-5 lg:pr-3">
          {children}
        </section>
      </div>
    </main>
  );
}
