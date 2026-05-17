import { ok } from "@/lib/http";

const contracts = {
  version: "2026-05-18",
  endpoints: [
    {
      method: "POST",
      path: "/api/backoffice/orders",
      description: "Create order (including manual delivery channels) with atomic stock deduction",
      headers: {
        "x-idempotency-key": "string? (recommended)"
      },
      request: {
        tenant_id: "uuid",
        branch_id: "uuid",
        shift_id: "uuid",
        channel: "grab | line_man | shopee | merchant_app | other",
        external_order_code: "string",
        customer_name: "string?",
        app_total_amount: "number",
        gp_amount: "number?",
        discount_amount: "number?",
        items: [{ product_id: "uuid", quantity: "number", notes: "string?" }]
      }
    },
    {
      method: "POST",
      path: "/api/backoffice/approvals/pin",
      description: "Escalation approval for cancel bill, stock adjustment, employee delete, shift override"
    },
    {
      method: "POST",
      path: "/api/backoffice/stock/adjust",
      description: "Adjust ingredient stock with required approval_id and rollback-safe transaction",
      headers: {
        "x-idempotency-key": "string? (recommended)"
      }
    },
    {
      method: "POST",
      path: "/api/backoffice/shifts/close",
      description: "Close shift with rules for unpaid dine-in bills and cash mismatch"
    },
    {
      method: "POST",
      path: "/api/it-admin/tenants",
      description: "Create and activate tenant from platform admin"
    }
  ]
};

export async function GET() {
  return ok(contracts);
}

