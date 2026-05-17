import { ok } from "@/lib/http";

const contracts = {
  version: "2026-05-18",
  endpoints: [
    {
      method: "GET",
      path: "/api/backoffice/orders",
      description: "List orders with pagination/filter/search (tenant/branch scoped)"
    },
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
      method: "GET",
      path: "/api/backoffice/stock",
      description: "List ingredients or stock movements with pagination/filter/search"
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
      method: "GET",
      path: "/api/backoffice/shifts",
      description: "List shifts with pagination and status filtering"
    },
    {
      method: "POST",
      path: "/api/backoffice/shifts",
      description: "Open new shift for current branch"
    },
    {
      method: "POST",
      path: "/api/backoffice/shifts/close",
      description: "Close shift with rules for unpaid dine-in bills and cash mismatch"
    },
    {
      method: "GET",
      path: "/api/backoffice/audit-logs",
      description: "List audit logs with pagination/filter/search (manager/owner only)"
    },
    {
      method: "GET",
      path: "/api/backoffice/staff",
      description: "List branch staff with pagination/filter/search (manager/owner only)"
    },
    {
      method: "PATCH",
      path: "/api/backoffice/staff",
      description: "Update staff role or active status (manager/owner only)"
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

