import { PosPreviewSectionPage } from "@/components/pos-preview/pos-preview-section-page";
import { getCurrentLanguage } from "@/lib/i18n";
import { requirePosPagePermission } from "@/lib/pos-page-guard";

export default async function PosLanguageSettingsPage() {
  await requirePosPagePermission("settings:view");
  const lang = await getCurrentLanguage();

  return (
    <PosPreviewSectionPage
      lang={lang}
      titleKey="pos_settings_title"
      descKey="pos_settings_desc"
      actionHref="/preview/pos"
      actionKey="pos_settings_action"
    />
  );
}

