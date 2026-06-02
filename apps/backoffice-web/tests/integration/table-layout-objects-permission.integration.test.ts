import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthContext = vi.fn();
const getSupabaseServiceClient = vi.fn();
const appendAuditLog = vi.fn(async () => ({ inserted: true }));

vi.mock("@/lib/auth-context", () => ({ getAuthContext }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseServiceClient }));
vi.mock("@/lib/audit-log", () => ({ appendAuditLog }));

describe("table layout object permission rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks staff role from creating floor objects", async () => {
    getAuthContext.mockResolvedValue({
      userId: "u-staff",
      platformRole: "tenant_user",
      tenantId: "t1",
      branchId: "b1",
      branchRole: "staff"
    });

    const { POST } = await import("@/app/api/backoffice/table-layout-objects/route");
    const response = await POST(
      new Request("http://localhost/api/backoffice/table-layout-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object_type: "counter" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden_role");
    expect(getSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("allows manager role to create floor objects", async () => {
    getAuthContext.mockResolvedValue({
      userId: "u-manager",
      platformRole: "tenant_user",
      tenantId: "t1",
      branchId: "b1",
      branchRole: "manager"
    });

    const single = vi.fn(async () => ({
      data: {
        id: "obj1",
        object_type: "counter",
        object_name: "Counter",
        color: "#475569"
      },
      error: null
    }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    getSupabaseServiceClient.mockReturnValue({ from });

    const { POST } = await import("@/app/api/backoffice/table-layout-objects/route");
    const response = await POST(
      new Request("http://localhost/api/backoffice/table-layout-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object_type: "counter", position_x: 24, position_y: 24 })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe("obj1");
    expect(insert).toHaveBeenCalledTimes(1);
    expect(appendAuditLog).toHaveBeenCalledTimes(1);
    expect(appendAuditLog.mock.calls[0]?.[0]?.action).toBe("floor_object_created");
  });
});
