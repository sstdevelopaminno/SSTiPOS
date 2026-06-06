import { fail, ok } from "@/lib/http";
import { getPosApiAuthContext } from "@/lib/pos-api-auth";
import { loadTaxSettings, saveTaxSettings, type TaxSettingsInput } from "@/lib/services/pos-settings-service";

function statusFromError(error: unknown) {
  const message = error instanceof Error ? error.message : "Tax settings request failed.";
  if (message.includes("Only owner")) return { code: "forbidden_role", message, status: 403 };
  if (message.includes("required")) return { code: "invalid_payload", message, status: 422 };
  return { code: "settings_tax_failed", message, status: 500 };
}

export async function GET() {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "settings:view" });
    const tax_settings = await loadTaxSettings(auth);
    return ok({ tax_settings });
  } catch (error) {
    const resolved = statusFromError(error);
    return fail(resolved.code, resolved.message, resolved.status);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "settings:view" });
    const body = (await request.json()) as TaxSettingsInput;
    const tax_settings = await saveTaxSettings(auth, body);
    return ok({ tax_settings });
  } catch (error) {
    const resolved = statusFromError(error);
    return fail(resolved.code, resolved.message, resolved.status);
  }
}
