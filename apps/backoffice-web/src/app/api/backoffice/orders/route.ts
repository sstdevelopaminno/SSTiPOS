import type { CreateManualDeliveryOrderInput } from "@pos/shared-types";
import { getAuthContext } from "@/lib/auth-context";
import { appendAuditLog } from "@/lib/audit-log";
import { executeCreateManualDeliveryOrderTransaction } from "@/lib/services/stock-transaction-service";
import { ok, fail } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as CreateManualDeliveryOrderInput;
    const auth = await getAuthContext({ requireBranchScope: true });

    if (!payload.external_order_code?.trim()) {
      return fail("invalid_external_code", "External order code is required.", 422);
    }

    if (!["grab", "line_man", "shopee", "merchant_app", "other"].includes(payload.channel)) {
      return fail("invalid_channel", "Manual delivery channel is invalid.", 422);
    }

    const idempotencyKey = req.headers.get("x-idempotency-key")?.trim() || undefined;

    const result = await executeCreateManualDeliveryOrderTransaction({
      auth,
      input: payload,
      idempotencyKey,
      appendAuditLog
    });

    if (!result.ok) {
      return fail(result.code, result.message, result.status);
    }

    return ok(result.data, result.data.duplicate_request ? 200 : 201);
  } catch (error) {
    return fail("unauthorized", error instanceof Error ? error.message : "Authentication failed.", 401);
  }
}

