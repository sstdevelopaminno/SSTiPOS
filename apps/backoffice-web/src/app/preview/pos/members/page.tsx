import { PosMembersModule } from "@/components/pos/pos-members-module";
import { getCurrentLanguage } from "@/lib/i18n";
import { requirePosPagePermission } from "@/lib/pos-page-guard";

export default async function PosMembersPage() {
  await requirePosPagePermission("sales:enter");
  const lang = await getCurrentLanguage();
  return <PosMembersModule lang={lang} />;
}
