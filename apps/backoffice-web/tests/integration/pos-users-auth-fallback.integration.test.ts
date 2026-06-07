import { beforeEach, describe, expect, it, vi } from "vitest";

class PosGuardError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "PosGuardError";
    this.code = code;
    this.status = status;
  }
}

const getAuthContext = vi.fn();
const getPosApiAuthContext = vi.fn();
const getSupabaseServiceClient = vi.fn();

vi.mock("@/lib/auth-context", () => ({ getAuthContext }));
vi.mock("@/lib/pos-api-auth", () => ({ getPosApiAuthContext }));
vi.mock("@/lib/pos-session-guard", () => ({ PosGuardError }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseServiceClient }));

type QueryResult<T> = {
  data: T;
  error: null;
};

type ChainableQuery<T> = {
  select: (columns?: string) => ChainableQuery<T>;
  eq: (column: string, value: unknown) => ChainableQuery<T>;
  in: (column: string, values: unknown[]) => ChainableQuery<T>;
  order: (column: string, options?: unknown) => ChainableQuery<T>;
  then: Promise<QueryResult<T>>["then"];
};

function createChainableQuery<T>(result: QueryResult<T>): ChainableQuery<T> {
  const query = {} as ChainableQuery<T>;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.order = vi.fn(() => query);
  const promise = Promise.resolve(result);
  query.then = promise.then.bind(promise);
  return query;
}

describe("POS users auth fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads POS users through branch auth context when POS session is missing", async () => {
    getPosApiAuthContext.mockRejectedValue(new PosGuardError("missing_pos_session", "POS session is required.", 401));
    getAuthContext.mockResolvedValue({
      userId: "owner-user",
      platformRole: "tenant_user",
      tenantId: "tenant-1",
      branchId: "branch-1",
      branchRole: "owner"
    });

    const branchQuery = createChainableQuery({
      data: [{ id: "branch-1", code: "BKK-01", name: "Branch 1", is_active: true }],
      error: null
    });
    const userQuery = createChainableQuery({
      data: [
        {
          id: "role-1",
          user_id: "staff-user",
          branch_id: "branch-1",
          role: "staff",
          is_default: false,
          users_profiles: {
            id: "staff-user",
            full_name: "Staff User",
            email: "staff@demo.local",
            is_active: true
          }
        }
      ],
      error: null
    });
    const deviceQuery = createChainableQuery({ data: [], error: null });
    const scopeQuery = createChainableQuery({ data: [], error: null });
    const profileSettingsQuery = createChainableQuery({ data: [], error: null });
    const from = vi.fn((tableName: string) => {
      if (tableName === "branches") return branchQuery;
      if (tableName === "user_branch_roles") return userQuery;
      if (tableName === "branch_devices") return deviceQuery;
      if (tableName === "pos_user_device_scopes") return scopeQuery;
      if (tableName === "pos_user_profiles") return profileSettingsQuery;
      return createChainableQuery({ data: [], error: null });
    });
    getSupabaseServiceClient.mockReturnValue({ from });

    const { GET } = await import("@/app/api/pos/users/route");
    const response = await GET(new Request("http://localhost/api/pos/users"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.metadata.role).toBe("owner");
    expect(getAuthContext).toHaveBeenCalledWith({ requireBranchScope: true });
  });
});
