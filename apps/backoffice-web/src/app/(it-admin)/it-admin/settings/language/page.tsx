import { LanguageSwitcher } from "@/components/language/language-switcher";
import { getAuthContext } from "@/lib/auth-context";
import { hasItAdminPermission } from "@/lib/it-admin-guard";
import { getCurrentLanguage, t } from "@/lib/i18n";

export default async function ItAdminLanguageSettingsPage() {
  const auth = await getAuthContext({ requireBranchScope: false }).catch(() => null);
  if (!auth || !hasItAdminPermission(auth.platformRole, "settings_manage")) {
    return (
      <section className="surface">
        <h2>Forbidden</h2>
        <p>IT admin permission is required.</p>
      </section>
    );
  }

  const lang = await getCurrentLanguage();

  return (
    <section className="surface">
      <h2>{t(lang, "language_settings_title")}</h2>
      <p>{t(lang, "language_settings_desc")}</p>
      <LanguageSwitcher
        currentLanguage={lang}
        label={t(lang, "language")}
        thaiLabel={t(lang, "thai")}
        englishLabel={t(lang, "english")}
      />
    </section>
  );
}

