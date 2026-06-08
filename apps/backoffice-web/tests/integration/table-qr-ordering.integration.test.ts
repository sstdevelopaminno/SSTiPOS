import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(workspaceRoot, "supabase/migrations/202606070002_table_qr_ordering.sql"),
  "utf8"
);
const publicRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/table-order/[token]/route.ts"),
  "utf8"
);
const qrService = readFileSync(
  resolve(process.cwd(), "src/lib/table-qr-ordering.ts"),
  "utf8"
);

describe("table QR ordering isolation", () => {
  it("binds QR sessions and submissions to tenant, branch, table, and table session", () => {
    expect(migration).toContain("tenant_id uuid not null");
    expect(migration).toContain("branch_id uuid not null");
    expect(migration).toContain("table_id uuid not null");
    expect(migration).toContain("table_session_id uuid not null");
    expect(migration).toContain("and tenant_id = v_qr.tenant_id");
    expect(migration).toContain("and branch_id = v_qr.branch_id");
    expect(migration).toContain("and table_id = v_qr.table_id");
  });

  it("revokes links on bill close and prevents duplicate customer submits", () => {
    expect(migration).toContain("trg_table_bill_session_revoke_qr");
    expect(migration).toContain("new.status in ('closed', 'cancelled')");
    expect(migration).toContain("unique (qr_session_id, request_id)");
    expect(migration).toContain("for update");
  });

  it("does not trust public prices or scope values", () => {
    expect(publicRoute).not.toContain("unit_price");
    expect(publicRoute).not.toContain("tenant_id:");
    expect(publicRoute).not.toContain("branch_id:");
    expect(qrService).toContain('createHmac("sha256"');
    expect(migration).toContain("from products p");
    expect(migration).toContain("p.tenant_id = v_qr.tenant_id");
    expect(migration).toContain("p.branch_id = v_qr.branch_id");
  });
});
