import { fail, ok } from "@/lib/http";
import { getPosApiAuthContext } from "@/lib/pos-api-auth";
import {
  deletePaymentAccount,
  loadPosSettingsSnapshot,
  savePaymentAccount,
  type PaymentAccountInput
} from "@/lib/services/pos-settings-service";

function statusFromError(error: unknown) {
  const message = error instanceof Error ? error.message : "Settings request failed.";
  if (message.includes("Only owner")) return { code: "forbidden_role", message, status: 403 };
  if (message.includes("required")) return { code: "invalid_payload", message, status: 422 };
  if (message.includes("not found")) return { code: "payment_account_not_found", message, status: 404 };
  if (message.includes("migration") || message.includes("table is missing")) return { code: "payment_accounts_schema_missing", message, status: 500 };
  return { code: "settings_payment_account_failed", message, status: 500 };
}

export async function GET() {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "settings:view" });
    const snapshot = await loadPosSettingsSnapshot(auth);
    return ok({
      payment_accounts: snapshot.payment_accounts,
      branches: snapshot.branches,
      metadata: snapshot.metadata
    });
  } catch (error) {
    const resolved = statusFromError(error);
    return fail(resolved.code, resolved.message, resolved.status);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "settings:view" });
    const body = (await request.json()) as PaymentAccountInput;
    const account = await savePaymentAccount(auth, body);
    return ok({ account }, 201);
  } catch (error) {
    const resolved = statusFromError(error);
    return fail(resolved.code, resolved.message, resolved.status);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "settings:view" });
    const body = (await request.json()) as PaymentAccountInput;
    const account = await savePaymentAccount(auth, body);
    return ok({ account });
  } catch (error) {
    const resolved = statusFromError(error);
    return fail(resolved.code, resolved.message, resolved.status);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "settings:view" });
    const { searchParams } = new URL(request.url);
    const result = await deletePaymentAccount(auth, searchParams.get("account_id") ?? "");
    return ok(result);
  } catch (error) {
    const resolved = statusFromError(error);
    return fail(resolved.code, resolved.message, resolved.status);
  }
}
