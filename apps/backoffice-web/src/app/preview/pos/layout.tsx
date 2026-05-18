import type { ReactNode } from "react";
import { PosShellSidebar } from "@/components/pos-preview/pos-shell-sidebar";
import { getCurrentLanguage, t } from "@/lib/i18n";

export default async function PosPreviewLayout({ children }: { children: ReactNode }) {
  const lang = await getCurrentLanguage();

  return (
    <main className="pos-shell min-h-screen bg-[radial-gradient(circle_at_20%_-20%,#ffffff_0%,#f2f5fa_44%)] p-2">
      <div className="grid min-h-[calc(100vh-1rem)] grid-cols-1 gap-2 lg:grid-cols-[auto_minmax(0,1fr)]">
        <PosShellSidebar
          lang={lang}
          settingsLabel={t(lang, "common_settings")}
          languageLabel={t(lang, "language")}
          thaiLabel={t(lang, "thai")}
          englishLabel={t(lang, "english")}
        />

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
