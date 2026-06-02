import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase-admin";

export type BranchRole = "owner" | "manager" | "staff" | "accountant";

type EmployeeRow = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role: BranchRole;
};

export type EmployeeIdentity = {
  userId: string;
  fullName: string;
  role: BranchRole;
  employeeCode: string;
  permissions: string[];
};

export type DevicePublicStatus = "ready" | "in_use" | "offline" | "disabled";

export type DeviceCandidate = {
  id: string;
  tenant_id: string;
  branch_id: string;
  device_code: string;
  device_name: string;
  status: "active" | "inactive" | "maintenance";
  last_seen_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type DeviceSessionOccupancy = {
  session_id: string;
  device_id: string | null;
  device_code: string | null;
  user_id: string;
  user_name: string | null;
};

export function deriveEmployeeCode(userId: string) {
  const normalized = String(userId).replace(/-/g, "").toUpperCase();
  return `EMP-${normalized.slice(-6)}`;
}

export function normalizeEmployeeCode(value: string) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeEmpCandidate(value: string) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizeEmpDigits(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeEmployeeName(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildEmployeeCodeCandidates(input: string) {
  const normalized = normalizeEmpCandidate(input);
  const candidates = new Set<string>();
  if (!normalized) return candidates;

  candidates.add(normalized);

  const digits = normalizeEmpDigits(normalized);
  if (digits) {
    const last6 = digits.slice(-6);
    const padded6 = last6.padStart(6, "0");
    candidates.add(last6);
    candidates.add(padded6);
    candidates.add(`EMP-${last6}`);
    candidates.add(`EMP-${padded6}`);
  }

  if (normalized.startsWith("EMP-")) {
    const tail = normalized.slice(4);
    if (tail) candidates.add(tail);
    const tailDigits = normalizeEmpDigits(tail);
    if (tailDigits) {
      const last6 = tailDigits.slice(-6);
      const padded6 = last6.padStart(6, "0");
      candidates.add(last6);
      candidates.add(padded6);
      candidates.add(`EMP-${last6}`);
      candidates.add(`EMP-${padded6}`);
    }
  }

  return candidates;
}

export function roleToPermissions(role: BranchRole): string[] {
  if (role === "owner") {
    return [
      "pos.sales.access",
      "pos.device.override_in_use",
      "pos.shift.open",
      "pos.sales.refund",
      "pos.sales.discount",
      "pos.sales.void",
      "pos.reports.view"
    ];
  }
  if (role === "manager") {
    return ["pos.sales.access", "pos.device.override_in_use", "pos.shift.open", "pos.sales.refund", "pos.sales.discount", "pos.sales.void", "pos.reports.view"];
  }
  if (role === "accountant") {
    return ["pos.sales.access", "pos.reports.view"];
  }
  return ["pos.sales.access", "pos.shift.open"];
}

export function hasPermission(permissions: string[], permissionKey: string) {
  return permissions.includes(permissionKey);
}

export async function resolveEmployeeByCode(input: {
  tenantId: string;
  branchId: string;
  employeeCode: string;
}): Promise<EmployeeIdentity | null> {
  const supabase = getSupabaseServiceClient();
  const normalizedCode = normalizeEmpCandidate(input.employeeCode);
  if (!normalizedCode) return null;
  const codeCandidates = buildEmployeeCodeCandidates(normalizedCode);

  const { data, error } = await supabase
    .from("user_branch_roles")
    .select("user_id,role,users_profiles!inner(id,email,full_name,is_active)")
    .eq("tenant_id", input.tenantId)
    .eq("branch_id", input.branchId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    user_id: string;
    role: BranchRole;
    users_profiles: { id: string; email: string; full_name: string; is_active: boolean } | Array<{ id: string; email: string; full_name: string; is_active: boolean }>;
  }>;

  const employeeRows: EmployeeRow[] = rows
    .map((row) => {
      const profile = Array.isArray(row.users_profiles) ? row.users_profiles[0] : row.users_profiles;
      if (!profile) return null;
      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        is_active: profile.is_active,
        role: row.role
      } satisfies EmployeeRow;
    })
    .filter((row): row is EmployeeRow => Boolean(row && row.is_active));

  const matched = employeeRows.find((row) => {
    const derived = deriveEmployeeCode(row.id);
    const derivedDigits = normalizeEmpDigits(derived).slice(-6);
    const email = normalizeEmpCandidate(row.email);
    const emailLocalPart = email.includes("@") ? email.split("@")[0] : "";
    const userId = normalizeEmpCandidate(row.id);

    if (codeCandidates.has(derived)) return true;
    if (derivedDigits && codeCandidates.has(derivedDigits)) return true;
    if (userId && codeCandidates.has(userId)) return true;
    if (email && codeCandidates.has(email)) return true;
    if (emailLocalPart && codeCandidates.has(emailLocalPart)) return true;
    return false;
  });

  if (!matched) return null;
  const permissions = roleToPermissions(matched.role);
  return {
    userId: matched.id,
    fullName: matched.full_name,
    role: matched.role,
    employeeCode: deriveEmployeeCode(matched.id),
    permissions
  };
}

export async function resolveEmployeeByUserId(input: {
  tenantId: string;
  branchId: string;
  userId: string;
}): Promise<EmployeeIdentity | null> {
  const normalizedUserId = String(input.userId ?? "").trim();
  if (!normalizedUserId) return null;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_branch_roles")
    .select("user_id,role,users_profiles!inner(id,email,full_name,is_active)")
    .eq("tenant_id", input.tenantId)
    .eq("branch_id", input.branchId)
    .eq("user_id", normalizedUserId)
    .maybeSingle<{
      user_id: string;
      role: BranchRole;
      users_profiles: { id: string; email: string; full_name: string; is_active: boolean } | Array<{ id: string; email: string; full_name: string; is_active: boolean }>;
    }>();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  const profile = Array.isArray(data.users_profiles) ? data.users_profiles[0] : data.users_profiles;
  if (!profile || profile.is_active === false) return null;

  return {
    userId: profile.id,
    fullName: profile.full_name,
    role: data.role,
    employeeCode: deriveEmployeeCode(profile.id),
    permissions: roleToPermissions(data.role)
  };
}

export async function resolveEmployeeByName(input: {
  tenantId: string;
  branchId: string;
  employeeName: string;
}): Promise<{ employee: EmployeeIdentity | null; ambiguous: boolean }> {
  const normalizedName = normalizeEmployeeName(input.employeeName);
  if (!normalizedName) return { employee: null, ambiguous: false };

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_branch_roles")
    .select("user_id,role,users_profiles!inner(id,email,full_name,is_active)")
    .eq("tenant_id", input.tenantId)
    .eq("branch_id", input.branchId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    user_id: string;
    role: BranchRole;
    users_profiles: { id: string; email: string; full_name: string; is_active: boolean } | Array<{ id: string; email: string; full_name: string; is_active: boolean }>;
  }>;

  const employeeRows: EmployeeRow[] = rows
    .map((row) => {
      const profile = Array.isArray(row.users_profiles) ? row.users_profiles[0] : row.users_profiles;
      if (!profile) return null;
      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        is_active: profile.is_active,
        role: row.role
      } satisfies EmployeeRow;
    })
    .filter((row): row is EmployeeRow => Boolean(row && row.is_active));

  const matches = employeeRows.filter((row) => normalizeEmployeeName(row.full_name) === normalizedName);
  if (matches.length === 0) return { employee: null, ambiguous: false };
  if (matches.length > 1) return { employee: null, ambiguous: true };

  const matched = matches[0];
  return {
    ambiguous: false,
    employee: {
      userId: matched.id,
      fullName: matched.full_name,
      role: matched.role,
      employeeCode: deriveEmployeeCode(matched.id),
      permissions: roleToPermissions(matched.role)
    }
  };
}

export function mapDeviceStatus(device: DeviceCandidate, activeSession: DeviceSessionOccupancy | null): DevicePublicStatus {
  if (device.status === "inactive") return "disabled";
  if (device.status === "maintenance") return "offline";
  if (activeSession) return "in_use";
  return "ready";
}
