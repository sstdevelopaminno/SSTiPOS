import { describe, expect, it, vi } from "vitest";
import { submitOrderWithEffects } from "@/components/pos/services/pos-sales-service-module";

describe("POS sales client service", () => {
  it("returns a usable created order for the checkout review flow", async () => {
    const fetchJsonWithTimeout = vi.fn(async () => ({
      response: new Response(JSON.stringify({}), { status: 201 }),
      body: {
        data: {
          id: "order-001",
          order_no: "TKO-001",
          status: "queued",
          order_type: "takeaway",
          channel: "walk_home",
          total_amount: 125,
          tax_total: 7,
          tax_lines: [{ id: "vat", label: "VAT", rate_pct: 7, mode: "add_to_bill", amount: 7 }],
          created_at: "2026-06-12T10:00:00.000Z"
        },
        error: null
      }
    }));
    const setActiveOrder = vi.fn();
    const pushSubmitMessage = vi.fn();

    const order = await submitOrderWithEffects({
      payload: {
        idempotencyKey: "checkout-001",
        payload: {
          shift_id: "shift-001",
          order_type: "takeaway",
          channel: "walk_home",
          app_total_amount: 118,
          discount_amount: 0,
          tax_total: 7,
          grand_total: 125,
          tax_lines: [{ id: "vat", label: "VAT", rate_pct: 7, mode: "add_to_bill", amount: 7 }],
          items: [{ product_id: "product-001", quantity: 1, unit_price: 118 }]
        }
      },
      applyUiResult: true,
      fetchJsonWithTimeout,
      text: { orderUpdated: "Updated", orderCreated: "Created" },
      setIsOnline: vi.fn(),
      dequeuePendingSubmit: vi.fn(),
      setActiveOrder,
      setCart: vi.fn(),
      setCartDrawerOpen: vi.fn(),
      refreshTables: vi.fn(),
      pushSubmitMessage
    });

    expect(order).toEqual(
      expect.objectContaining({
        id: "order-001",
        order_no: "TKO-001",
        status: "queued",
        total_amount: 125,
        tax_total: 7
      })
    );
    expect(setActiveOrder).toHaveBeenCalledWith(expect.objectContaining({ id: "order-001" }));
    expect(pushSubmitMessage).toHaveBeenCalledWith("Created: TKO-001");
  });
});
